from collections import deque

from models import BudgetViolation, PipelineHealth, StageMetric
from processing.budgets import HEALTH_QUEUE_LAG_THRESHOLDS_MS, STAGE_BUDGETS_MS




class MetricsObserver:
    def __init__(self, window=128):
        self.window = max(4, int(window))
        self._timings = {}
        self._queue_lag = deque(maxlen=self.window)

    def update(self, stage_timings_ms, queue_lag_ms=None):
        for name, ms in (stage_timings_ms or {}).items():
            buf = self._timings.get(name)
            if buf is None:
                buf = deque(maxlen=self.window)
                self._timings[name] = buf
            buf.append(float(ms))

        if queue_lag_ms is not None:
            self._queue_lag.append(float(queue_lag_ms))

    def snapshot(self):
        out = {}
        for name, buf in self._timings.items():
            if not buf:
                continue
            values = list(buf)
            avg_ms = sum(values) / len(values)
            budget_ms = float(STAGE_BUDGETS_MS.get(name, 0.0))
            out[name] = StageMetric(
                name=name,
                avg_ms=avg_ms,
                max_ms=max(values),
                min_ms=min(values),
                samples=len(values),
                budget_ms=budget_ms,
                is_breached=bool(budget_ms > 0.0 and avg_ms > budget_ms),
            )
        return out

    def queue_lag_avg(self):
        if not self._queue_lag:
            return None
        values = list(self._queue_lag)
        return sum(values) / len(values)

    def health(self, metrics_snapshot=None):
        metrics_snapshot = metrics_snapshot or {}
        violations = [
            BudgetViolation(stage=name, avg_ms=metric.avg_ms, budget_ms=metric.budget_ms)
            for name, metric in metrics_snapshot.items()
            if metric.is_breached
        ]

        lag = self.queue_lag_avg()
        real_time_lag = float(HEALTH_QUEUE_LAG_THRESHOLDS_MS.get("real_time", 50.0))
        degraded_lag = float(HEALTH_QUEUE_LAG_THRESHOLDS_MS.get("degraded", 250.0))

        if lag is None:
            if violations:
                return PipelineHealth(
                    state="DEGRADED",
                    reason=f"budget breach ({', '.join(sorted(v.stage for v in violations))})",
                    violations=violations,
                )
            return PipelineHealth(state="UNKNOWN", reason="no queue lag samples", violations=[])
        if lag < real_time_lag:
            if violations:
                return PipelineHealth(
                    state="DEGRADED",
                    reason=f"budget breach ({', '.join(sorted(v.stage for v in violations))})",
                    violations=violations,
                )
            return PipelineHealth(state="REAL_TIME", reason=f"queue lag {lag:.2f}ms", violations=[])
        if lag < degraded_lag:
            if violations:
                return PipelineHealth(
                    state="OVERLOADED",
                    reason=f"queue lag {lag:.2f}ms + breach ({', '.join(sorted(v.stage for v in violations))})",
                    violations=violations,
                )
            return PipelineHealth(state="DEGRADED", reason=f"queue lag {lag:.2f}ms", violations=[])
        if violations:
            return PipelineHealth(
                state="OVERLOADED",
                reason=f"queue lag {lag:.2f}ms + breach ({', '.join(sorted(v.stage for v in violations))})",
                violations=violations,
            )
        return PipelineHealth(state="OVERLOADED", reason=f"queue lag {lag:.2f}ms", violations=[])

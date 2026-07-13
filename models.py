from dataclasses import dataclass, field


@dataclass(frozen=True)
class PacketEvent:
    timestamp: float
    port: str
    event_type: str
    message: str
    source: str = "serial"


@dataclass(frozen=True)
class StageMetric:
    name: str
    avg_ms: float = 0.0
    max_ms: float = 0.0
    min_ms: float = 0.0
    samples: int = 0
    budget_ms: float = 0.0
    is_breached: bool = False


@dataclass(frozen=True)
class BudgetViolation:
    stage: str
    avg_ms: float
    budget_ms: float


@dataclass(frozen=True)
class PipelineHealth:
    state: str
    reason: str
    violations: list[BudgetViolation] = field(default_factory=list)


@dataclass(frozen=True)
class SceneFrame:
    timestamp: float
    points_by_port: dict[str, tuple[float, float, float]]
    trails_by_port: dict[str, tuple[tuple[float, float, float], ...]]
    motion_score: float = 0.0
    confidence: float = 0.0
    stage_timings_ms: dict[str, float] = field(default_factory=dict)
    status_by_port: dict[str, bool] = field(default_factory=dict)
    metrics: dict[str, StageMetric] = field(default_factory=dict)
    queue_lag_ms: float | None = None
    health: PipelineHealth | None = None
    source: str = "pipeline"

import time
from collections import deque

from models import SceneFrame
from processing.metrics import MetricsObserver
from processing.stages import CalibrationStage, DetectorStage, FilterStage, ParserStage


class ProcessingPipeline:
    def __init__(self, ports, axis_limits, max_trail_points=120, signal_window_seconds=2.5):
        self.ports = list(ports)
        self.parser = ParserStage()
        self.calibration = CalibrationStage(axis_limits)
        self.filter = FilterStage(window_size=3)
        self.detector = DetectorStage(signal_window_seconds=signal_window_seconds)

        self.status_by_port = {port: False for port in self.ports}
        self.last_packet_by_port = {port: "(none)" for port in self.ports}
        self.last_point_by_port = {port: None for port in self.ports}
        self.trails_by_port = {port: deque(maxlen=max_trail_points) for port in self.ports}

        self.packet_counts = {port: 0 for port in self.ports}
        self.xyz_counts = {port: 0 for port in self.ports}
        self.signal_counts = {port: 0 for port in self.ports}

        self.last_stage_timings_ms = {
            "parser": 0.0,
            "calibration": 0.0,
            "filter": 0.0,
            "detector": 0.0,
            "total": 0.0,
        }
        self.last_queue_lag_ms = None
        self.metrics = MetricsObserver(window=128)

    def ensure_port(self, port):
        if port in self.status_by_port:
            return
        self.ports.append(port)
        self.status_by_port[port] = False
        self.last_packet_by_port[port] = "(none)"
        self.last_point_by_port[port] = None
        self.trails_by_port[port] = deque(maxlen=self.trails_by_port[self.ports[0]].maxlen if len(self.ports) > 1 else 120)
        self.packet_counts[port] = 0
        self.xyz_counts[port] = 0
        self.signal_counts[port] = 0

    def process_event(self, event):
        self.ensure_port(event.port)

        t_total_start = time.perf_counter()

        t0 = time.perf_counter()
        parsed = self.parser.run(event)
        t1 = time.perf_counter()

        calibrated = self.calibration.run(parsed)
        t2 = time.perf_counter()

        filtered = self.filter.run(calibrated)
        t3 = time.perf_counter()

        detected = self.detector.run(filtered)
        t4 = time.perf_counter()

        self.last_stage_timings_ms = {
            "parser": (t1 - t0) * 1000.0,
            "calibration": (t2 - t1) * 1000.0,
            "filter": (t3 - t2) * 1000.0,
            "detector": (t4 - t3) * 1000.0,
            "total": (time.perf_counter() - t_total_start) * 1000.0,
        }

        if getattr(event, "source", "serial") == "serial" and isinstance(getattr(event, "timestamp", None), (int, float)):
            self.last_queue_lag_ms = max(0.0, (time.time() - float(event.timestamp)) * 1000.0)

        self.last_packet_by_port[event.port] = event.message

        if event.event_type == "status":
            self.status_by_port[event.port] = event.message == "connected"
            return

        if event.event_type == "error":
            self.status_by_port[event.port] = False
            self.last_packet_by_port[event.port] = f"error: {event.message}"
            return

        if event.event_type == "data":
            self.packet_counts[event.port] += 1

            if detected.get("point") is not None:
                self.xyz_counts[event.port] += 1
                self.last_point_by_port[event.port] = detected["point"]
                self.trails_by_port[event.port].append(detected["point"])
            if detected.get("is_signal"):
                self.signal_counts[event.port] += 1

    def get_recent_signal_count(self, port):
        times = self.detector.signal_times.get(port)
        return len(times) if times is not None else 0

    def build_scene_frame(self, timestamp, source_label="pipeline"):
        points = {port: point for port, point in self.last_point_by_port.items() if point is not None}
        trails = {port: tuple(history) for port, history in self.trails_by_port.items()}

        connected = sum(1 for connected_state in self.status_by_port.values() if connected_state)
        confidence = connected / max(1, len(self.status_by_port))
        motion_score = float(sum(self.get_recent_signal_count(port) for port in self.status_by_port))

        self.metrics.update(self.last_stage_timings_ms, queue_lag_ms=self.last_queue_lag_ms)
        metrics_snapshot = self.metrics.snapshot()
        queue_lag_avg = self.metrics.queue_lag_avg()
        health = self.metrics.health(metrics_snapshot)

        return SceneFrame(
            timestamp=timestamp,
            points_by_port=points,
            trails_by_port=trails,
            motion_score=motion_score,
            confidence=confidence,
            stage_timings_ms=dict(self.last_stage_timings_ms),
            status_by_port=dict(self.status_by_port),
            metrics=metrics_snapshot,
            queue_lag_ms=queue_lag_avg,
            health=health,
            source=source_label,
        )

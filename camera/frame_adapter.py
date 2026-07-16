import time


class CameraConfirmationBridge:
    def __init__(self, stream_node, publish_callback=None, min_interval_seconds=0.05):
        self.stream_node = stream_node
        self.publish_callback = publish_callback
        self.min_interval_seconds = float(min_interval_seconds)
        self._last_publish = 0.0

    def tick(self):
        now = time.monotonic()
        if (now - self._last_publish) < self.min_interval_seconds:
            return None

        latest = self.stream_node.latest()
        if latest is None:
            return None

        self._last_publish = now
        payload = {
            "camera_ts_ms": latest["ts_ms"],
            "frame_shape": tuple(latest["frame"].shape),
            "health": self.stream_node.health_snapshot(),
        }

        if self.publish_callback is not None:
            self.publish_callback(payload)

        return payload

    def health_snapshot(self):
        return self.stream_node.health_snapshot()

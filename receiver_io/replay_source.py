import json
import queue
import threading
import time

from models import PacketEvent


class ReplaySource:
    def __init__(self, recording_path, output_queue=None, speed="realtime", source_name="replay"):
        self.recording_path = recording_path
        self.output_queue = output_queue or queue.Queue()
        self.speed = speed
        self.source_name = source_name
        self.stop_event = threading.Event()
        self.thread = None
        self.ports = []

    def _speed_factor(self):
        if self.speed == "max":
            return None
        if self.speed == "realtime":
            return 1.0
        return float(self.speed)

    def _publish(self):
        factor = self._speed_factor()
        last_ts = None

        try:
            with open(self.recording_path, "r", encoding="utf-8") as handle:
                for raw in handle:
                    if self.stop_event.is_set():
                        break

                    line = raw.strip()
                    if not line:
                        continue

                    try:
                        event = json.loads(line)
                    except json.JSONDecodeError as exc:
                        now = time.time()
                        self.output_queue.put(
                            PacketEvent(now, "(replay)", "error", f"Malformed JSONL line: {exc}", source=self.source_name)
                        )
                        continue

                    timestamp = float(event.get("timestamp", time.time()))
                    port = event.get("port", "(unknown)")
                    event_type = event.get("event_type", "data")
                    message = event.get("message", "")

                    if factor is not None and last_ts is not None:
                        delta = max(0.0, timestamp - last_ts)
                        sleep_for = delta / factor
                        if sleep_for > 0.0:
                            self.stop_event.wait(timeout=sleep_for)
                    last_ts = timestamp

                    if port not in self.ports:
                        self.ports.append(port)

                    replay_event = PacketEvent(
                        timestamp=timestamp,
                        port=port,
                        event_type=event_type,
                        message=message,
                        source=self.source_name,
                    )
                    self.output_queue.put(replay_event)
        except FileNotFoundError:
            self.output_queue.put(
                PacketEvent(time.time(), "(replay)", "error", f"Replay file not found: {self.recording_path}", source=self.source_name)
            )

    def start(self):
        self.stop_event.clear()
        self.thread = threading.Thread(target=self._publish, daemon=True)
        self.thread.start()

    def stop(self):
        self.stop_event.set()
        if self.thread is not None and self.thread.is_alive():
            self.thread.join(timeout=1.0)

    def get_queue(self):
        return self.output_queue

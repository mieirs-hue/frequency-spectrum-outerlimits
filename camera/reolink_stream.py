import json
import os
import threading
import time
from collections import deque
from urllib.parse import quote

try:
    import cv2
except ImportError:  # pragma: no cover
    cv2 = None


class CameraConfigError(Exception):
    pass


class ReolinkStreamNode:
    def __init__(self, config_path=None):
        self.config_path = config_path or os.path.join(os.path.dirname(__file__), "camera_config.json")
        self.config = self._load_config(self.config_path)
        self._buffer = deque(maxlen=max(1, int(self.config.get("buffer_maxlen", 64))))
        self._lock = threading.Lock()
        self._stop_event = threading.Event()
        self._thread = None
        self._capture = None
        self._last_error = ""
        self._frames_total = 0
        self._frames_dropped = 0
        self._connected = False
        self._frame_timestamps_ms = deque(maxlen=180)

    @staticmethod
    def _load_config(path):
        if not os.path.exists(path):
            raise CameraConfigError(f"Camera config not found: {path}")

        with open(path, "r", encoding="utf-8") as handle:
            cfg = json.load(handle)

        if "camera" in cfg and isinstance(cfg["camera"], dict):
            camera = cfg["camera"]
            creds = camera.get("credentials", {})
            streams = camera.get("streams", {})
            cfg = {
                "enabled": camera.get("enabled", False),
                "name": camera.get("name", "reolink_front"),
                "ip": camera.get("ip_address", ""),
                "mac": camera.get("mac_address", ""),
                "username": creds.get("username", "admin"),
                "password": creds.get("password", ""),
                "password_env": creds.get("password_env", ""),
                "rtsp_port": camera.get("rtsp_port", 554),
                "rtsp_path": streams.get("main_path", "//h264Preview_01_main"),
                "rtsp_url": streams.get("main", ""),
                "latency_ms": camera.get("latency_ms", 200),
                "buffer_maxlen": camera.get("buffer_maxlen", 64),
                "reconnect_seconds": camera.get("reconnect_seconds", 1.0),
                "onvif": camera.get("onvif", {"enabled": True, "port": 8000}),
                "subnet_mask": camera.get("subnet_mask", ""),
                "gateway": camera.get("gateway", ""),
                "static_ip": camera.get("static_ip", True),
                "ntp_sync": camera.get("ntp_sync", True),
                "time_offset_ms": camera.get("time_offset_ms", 0),
            }

        if not cfg.get("enabled", False):
            raise CameraConfigError("Camera config exists but camera is disabled (enabled=false)")

        if not cfg.get("rtsp_url"):
            user = cfg.get("username", "")
            password = cfg.get("password", "")
            if not password and cfg.get("password_env"):
                password = os.environ.get(cfg.get("password_env"), "")
            ip = cfg.get("ip", "")
            path_part = cfg.get("rtsp_path", "//h264Preview_01_main")
            if not (user and password and ip):
                raise CameraConfigError("Camera config must define rtsp_url or username/password/ip")
            rtsp_port = int(cfg.get("rtsp_port", 554))
            cfg["rtsp_url"] = (
                f"rtsp://{quote(str(user), safe='')}:{quote(str(password), safe='')}@{ip}:{rtsp_port}{path_part}"
            )

        return cfg

    def _gstreamer_pipeline(self):
        rtsp_url = self.config["rtsp_url"]
        latency = int(self.config.get("latency_ms", 200))
        return (
            f"rtspsrc location={rtsp_url} latency={latency} ! rtph264depay ! h264parse ! "
            "nvv4l2decoder ! nvvidconv ! video/x-raw,format=BGRx ! videoconvert ! appsink"
        )

    def _open_capture(self):
        if cv2 is None:
            raise CameraConfigError("OpenCV (cv2) is not installed")

        gst = self._gstreamer_pipeline()
        cap = cv2.VideoCapture(gst, cv2.CAP_GSTREAMER)
        if cap.isOpened():
            return cap

        cap.release()
        cap = cv2.VideoCapture(self.config["rtsp_url"])
        return cap

    def _run(self):
        reconnect_seconds = float(self.config.get("reconnect_seconds", 1.0))

        while not self._stop_event.is_set():
            if self._capture is None or not self._capture.isOpened():
                try:
                    self._capture = self._open_capture()
                    self._connected = self._capture.isOpened()
                    if not self._connected:
                        self._last_error = "camera connection failed"
                        time.sleep(reconnect_seconds)
                        continue
                    self._last_error = ""
                except Exception as exc:  # pragma: no cover
                    self._last_error = str(exc)
                    self._connected = False
                    time.sleep(reconnect_seconds)
                    continue

            ret, frame = self._capture.read()
            now_ms = int(time.monotonic() * 1000)
            if not ret or frame is None:
                self._connected = False
                self._frames_dropped += 1
                if self._capture is not None:
                    self._capture.release()
                self._capture = None
                time.sleep(reconnect_seconds)
                continue

            with self._lock:
                self._buffer.append({"frame": frame, "ts_ms": now_ms})
                self._frame_timestamps_ms.append(now_ms)
            self._frames_total += 1
            self._connected = True
            time.sleep(0.001)

    def start(self):
        if self._thread and self._thread.is_alive():
            return

        self._stop_event.clear()
        self._thread = threading.Thread(target=self._run, daemon=True, name="reolink-stream-node")
        self._thread.start()

    def stop(self):
        self._stop_event.set()
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=2.0)
        self._thread = None

        if self._capture is not None:
            self._capture.release()
            self._capture = None

    def latest(self):
        with self._lock:
            if not self._buffer:
                return None
            return self._buffer[-1]

    def health_snapshot(self):
        with self._lock:
            latest = self._buffer[-1] if self._buffer else None
            ts_values = list(self._frame_timestamps_ms)

        now_ms = int(time.monotonic() * 1000)
        fps = 0.0
        if len(ts_values) >= 2:
            duration_ms = max(1, ts_values[-1] - ts_values[0])
            fps = ((len(ts_values) - 1) * 1000.0) / float(duration_ms)

        total_samples = self._frames_total + self._frames_dropped
        dropped_rate_pct = (100.0 * self._frames_dropped / total_samples) if total_samples > 0 else 0.0
        latency_ms = (now_ms - latest["ts_ms"]) if latest is not None else None

        return {
            "connected": self._connected,
            "frames_total": self._frames_total,
            "frames_dropped": self._frames_dropped,
            "dropped_rate_pct": round(dropped_rate_pct, 3),
            "fps": round(fps, 3),
            "latency_ms": latency_ms,
            "last_error": self._last_error,
            "latest_ts_ms": latest["ts_ms"] if latest else None,
            "name": self.config.get("name", "reolink"),
            "ip": self.config.get("ip", ""),
        }

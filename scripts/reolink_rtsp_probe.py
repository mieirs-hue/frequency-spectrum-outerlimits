import argparse
import json
import os
import time
from urllib.parse import quote

try:
    import cv2
except ImportError as exc:
    raise SystemExit(f"OpenCV is required: {exc}")


def build_rtsp_url(cfg):
    if "camera" in cfg and isinstance(cfg["camera"], dict):
        camera = cfg["camera"]
        creds = camera.get("credentials", {})
        streams = camera.get("streams", {})
        cfg = {
            "rtsp_url": streams.get("main", ""),
            "username": creds.get("username", "admin"),
            "password": creds.get("password", ""),
            "password_env": creds.get("password_env", ""),
            "ip": camera.get("ip_address", ""),
            "rtsp_port": camera.get("rtsp_port", 554),
            "rtsp_path": streams.get("main_path", "//h264Preview_01_main"),
        }

    if cfg.get("rtsp_url"):
        return cfg["rtsp_url"]

    user = cfg.get("username", "")
    password = cfg.get("password", "")
    if not password and cfg.get("password_env"):
        password = os.environ.get(cfg.get("password_env"), "")
    ip = cfg.get("ip", "")
    path_part = cfg.get("rtsp_path", "//h264Preview_01_main")
    rtsp_port = int(cfg.get("rtsp_port", 554))
    if not (user and password and ip):
        raise ValueError("camera_config must provide rtsp_url or username/password/ip")

    return f"rtsp://{quote(str(user), safe='')}:{quote(str(password), safe='')}@{ip}:{rtsp_port}{path_part}"


def open_capture(rtsp_url, latency_ms):
    gst = (
        f"rtspsrc location={rtsp_url} latency={latency_ms} ! rtph264depay ! h264parse ! "
        "nvv4l2decoder ! nvvidconv ! video/x-raw,format=BGRx ! videoconvert ! appsink"
    )
    cap = cv2.VideoCapture(gst, cv2.CAP_GSTREAMER)
    if cap.isOpened():
        return cap

    cap.release()
    return cv2.VideoCapture(rtsp_url)


def main():
    parser = argparse.ArgumentParser(description="Quick Reolink RTSP probe and sample recorder")
    parser.add_argument("--config", default="camera/camera_config.json")
    parser.add_argument("--seconds", type=int, default=30)
    parser.add_argument("--output", default="recordings/reolink_probe.mp4")
    parser.add_argument("--latency", type=int, default=200)
    args = parser.parse_args()

    with open(args.config, "r", encoding="utf-8") as handle:
        cfg = json.load(handle)

    rtsp_url = build_rtsp_url(cfg)
    cap = open_capture(rtsp_url, args.latency)
    if not cap.isOpened():
        raise SystemExit("Unable to open RTSP stream")

    os.makedirs(os.path.dirname(args.output), exist_ok=True)

    first_ok = False
    writer = None
    started = time.monotonic()
    frames = 0

    while (time.monotonic() - started) < args.seconds:
        ok, frame = cap.read()
        if not ok or frame is None:
            continue

        if not first_ok:
            first_ok = True
            h, w = frame.shape[:2]
            writer = cv2.VideoWriter(
                args.output,
                cv2.VideoWriter_fourcc(*"mp4v"),
                20.0,
                (w, h),
            )
            print(f"Connected. Recording {args.seconds}s to {args.output} ({w}x{h})")

        writer.write(frame)
        frames += 1

    cap.release()
    if writer is not None:
        writer.release()

    if not first_ok:
        raise SystemExit("No frames received from RTSP stream")

    print(f"Completed: wrote {frames} frames")


if __name__ == "__main__":
    main()

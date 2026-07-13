import argparse
import csv
import json
import os
import queue
import re
import threading
import time
from collections import deque

import cv2
import numpy as np
import serial

CSI_LINE_RE = re.compile(
    r"^CSI,(?P<node>[^,]+),motion=(?P<motion>[-+]?\d*\.?\d+),energy=(?P<energy>[-+]?\d*\.?\d+),rssi=(?P<rssi>-?\d+),len=(?P<len>\d+)"
)


def parse_args():
    parser = argparse.ArgumentParser(description="Jetson RF motion pipeline for dual ESP32 CSI streams")
    parser.add_argument("--ports", nargs="+", default=["/dev/ttyACM0", "/dev/ttyACM1"])
    parser.add_argument("--baud", type=int, default=115200)
    parser.add_argument("--baseline-samples", type=int, default=220)
    parser.add_argument("--threshold-sigma", type=float, default=5.0)
    parser.add_argument("--sensitivity", type=float, default=1200.0)
    parser.add_argument("--event-cooldown", type=float, default=1.0)
    parser.add_argument("--min-combined-trigger", type=float, default=0.25)
    parser.add_argument("--require-both-nodes", action="store_true")
    parser.add_argument("--hold-start", action="store_true")
    parser.add_argument("--hold-auto-release-seconds", type=float, default=0.0)
    parser.add_argument("--hold-auto-release-max-delta", type=float, default=0.08)
    parser.add_argument("--motion-log-interval", type=float, default=0.5)
    parser.add_argument("--node-a", default="NODE_A")
    parser.add_argument("--node-b", default="NODE_B")
    parser.add_argument("--save-dir", default="rf_events")
    return parser.parse_args()


def serial_reader(port, baud, out_q, stop_event):
    ser = None
    try:
        ser = serial.Serial(port, baud, timeout=1)
        while not stop_event.is_set():
            raw = ser.readline()
            if not raw:
                continue
            line = raw.decode("utf-8", errors="ignore").strip()
            if line:
                out_q.put((time.time(), port, line))
    except Exception as exc:
        out_q.put((time.time(), port, f"__ERROR__:{exc}"))
    finally:
        if ser is not None:
            try:
                ser.close()
            except Exception:
                pass


def clamp(v, lo, hi):
    return max(lo, min(hi, v))


def build_heatmap(state, node_a, node_b, sensitivity):
    grid_h = 180
    grid_w = 300
    heat = np.zeros((grid_h, grid_w), dtype=np.float32)

    delta_a = state.get(node_a, {}).get("delta", 0.0)
    delta_b = state.get(node_b, {}).get("delta", 0.0)

    amp_a = clamp(delta_a * sensitivity, 0.0, 1.2)
    amp_b = clamp(delta_b * sensitivity, 0.0, 1.2)

    yy, xx = np.mgrid[0:grid_h, 0:grid_w].astype(np.float32)

    # Left and right lobes approximate where each node dominates room sensitivity.
    ga = np.exp(-(((xx - 62.0) ** 2) / (2 * 46.0**2) + ((yy - 92.0) ** 2) / (2 * 55.0**2)))
    gb = np.exp(-(((xx - 238.0) ** 2) / (2 * 46.0**2) + ((yy - 92.0) ** 2) / (2 * 55.0**2)))

    heat += amp_a * ga
    heat += amp_b * gb
    heat = np.clip(heat, 0.0, 1.0)
    heat_u8 = (heat * 255.0).astype(np.uint8)
    return cv2.applyColorMap(heat_u8, cv2.COLORMAP_TURBO)


def draw_dashboard(
    img,
    state,
    combined_motion,
    sensitivity,
    node_a,
    node_b,
    save_enabled,
    require_both_nodes,
    hold_elapsed,
    hold_target,
):
    h, w = img.shape[:2]
    img[:] = (10, 12, 18)

    cv2.putText(
        img,
        "RF Motion Pipeline (CSI)",
        (18, 34),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.9,
        (230, 245, 255),
        2,
    )

    cv2.line(img, (40, 420), (w - 20, 420), (40, 210, 80), 2)
    cv2.putText(img, "Per-node baseline", (42, 414), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (120, 220, 140), 1)

    # Spatial fusion heatmap panel.
    heat = build_heatmap(state, node_a, node_b, sensitivity)
    img[76:256, 390:690] = heat
    cv2.rectangle(img, (390, 76), (690, 256), (140, 140, 140), 1)
    cv2.putText(img, "Fusion heatmap", (392, 70), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (220, 220, 220), 1)
    cv2.putText(img, "A side", (402, 252), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (230, 230, 230), 1)
    cv2.putText(img, "B side", (645, 252), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (230, 230, 230), 1)

    nodes = sorted(state.keys())
    x_positions = [70, 170, 270, 530]
    colors = [(30, 210, 255), (30, 160, 255), (200, 80, 240), (90, 250, 90)]

    for idx, node in enumerate(nodes[:3]):
        motion = state[node]["motion"]
        base = state[node]["baseline"]
        sigma = max(1e-9, state[node]["sigma"])
        threshold = state[node]["threshold"]
        delta = state[node]["delta"]
        scaled = clamp(delta * sensitivity, 0.0, 1.0)

        bar_h = int(scaled * 300)
        x = x_positions[idx]
        cv2.rectangle(img, (x, 420 - bar_h), (x + 60, 420), colors[idx], -1)

        cv2.putText(
            img,
            node,
            (x - 2, 448),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.45,
            (220, 220, 220),
            1,
        )
        cv2.putText(
            img,
            f"m={motion:.4f}",
            (x - 4, 468),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.42,
            (180, 220, 250),
            1,
        )
        cv2.putText(
            img,
            f"b={base:.4f}",
            (x - 4, 486),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.38,
            (180, 210, 180),
            1,
        )
        cv2.putText(
            img,
            f"T={threshold:.4f}",
            (x - 4, 502),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.38,
            (210, 205, 130),
            1,
        )
        cv2.putText(
            img,
            f"s={sigma:.4f}",
            (x - 4, 518),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.38,
            (160, 180, 220),
            1,
        )

    combined_scaled = clamp((combined_motion * sensitivity), 0.0, 1.0)
    combo_h = int(combined_scaled * 300)
    x = x_positions[3]
    cv2.rectangle(img, (x, 420 - combo_h), (x + 70, 420), colors[3], -1)

    cv2.putText(img, "COMBINED", (x - 8, 448), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (220, 220, 220), 1)
    cv2.putText(
        img,
        f"delta={combined_motion:.5f}",
        (x - 18, 468),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.42,
        (180, 250, 180),
        1,
    )
    cv2.putText(
        img,
        f"Sensitivity=x{sensitivity:.0f}",
        (20, 70),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.55,
        (220, 220, 220),
        1,
    )
    mode_text = "MODE: BOTH-NODE" if require_both_nodes else "MODE: ANY-NODE"
    cv2.putText(img, mode_text, (20, 92), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (220, 220, 220), 1)
    save_text = "SAVE: ENABLED" if save_enabled else "SAVE: HOLD"
    save_color = (80, 230, 120) if save_enabled else (0, 175, 255)
    cv2.putText(img, save_text, (20, 114), cv2.FONT_HERSHEY_SIMPLEX, 0.55, save_color, 1)
    if hold_target > 0.0 and not save_enabled:
        remain = max(0.0, hold_target - hold_elapsed)
        cv2.putText(
            img,
            f"AUTO-RELEASE in {remain:4.1f}s",
            (20, 158),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.45,
            (255, 210, 120),
            1,
        )
    cv2.putText(img, "keys: q=quit n=normalize h=toggle-hold", (20, 136), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (200, 200, 200), 1)


def open_event_log(save_dir):
    expected_header = [
        "timestamp",
        "event_png",
        "event_json",
        "trigger",
        "combined_delta",
        "node_peak",
        "save_enabled",
        "node_a_delta",
        "node_b_delta",
        "node_a_motion",
        "node_b_motion",
        "node_a_threshold",
        "node_b_threshold",
        "node_a_rssi",
        "node_b_rssi",
    ]

    csv_path = os.path.join(save_dir, "event_log.csv")
    if os.path.exists(csv_path):
        try:
            with open(csv_path, "r", encoding="utf-8") as fh:
                first = fh.readline().strip().split(",")
            if first != expected_header:
                csv_path = os.path.join(save_dir, "event_log_v2.csv")
        except Exception:
            csv_path = os.path.join(save_dir, "event_log_v2.csv")

    is_new = not os.path.exists(csv_path)
    handle = open(csv_path, "a", newline="", encoding="utf-8")
    writer = csv.writer(handle)
    if is_new:
        writer.writerow(expected_header)
    return handle, writer


def open_motion_log(save_dir):
    csv_path = os.path.join(save_dir, "motion_log.csv")
    is_new = not os.path.exists(csv_path)
    handle = open(csv_path, "a", newline="", encoding="utf-8")
    writer = csv.writer(handle)
    if is_new:
        writer.writerow(
            [
                "timestamp",
                "combined_delta",
                "node_a_motion",
                "node_b_motion",
                "node_a_delta",
                "node_b_delta",
                "node_a_threshold",
                "node_b_threshold",
                "node_a_rssi",
                "node_b_rssi",
            ]
        )
    return handle, writer


def write_event_metadata(save_dir, stamp, trigger, combined_delta, state, node_a, node_b, writer, save_enabled):
    st_a = state.get(node_a, {})
    st_b = state.get(node_b, {})

    delta_a = float(st_a.get("delta", 0.0))
    delta_b = float(st_b.get("delta", 0.0))

    peak_node = "UNKNOWN"
    if delta_a > delta_b:
        peak_node = node_a
    elif delta_b > delta_a:
        peak_node = node_b

    event_png = f"event_{stamp}_{combined_delta:.5f}.png"
    event_json = f"event_{stamp}_{combined_delta:.5f}.json"

    payload = {
        "timestamp": stamp,
        "event_png": event_png,
        "save_enabled": save_enabled,
        "image_saved": bool(save_enabled),
        "trigger": trigger,
        "combined_delta": combined_delta,
        "node_peak": peak_node,
        "nodes": {
            node_a: {
                "motion": float(st_a.get("motion", 0.0)),
                "delta": delta_a,
                "baseline": float(st_a.get("baseline", 0.0)),
                "threshold": float(st_a.get("threshold", 0.0)),
                "sigma": float(st_a.get("sigma", 0.0)),
                "rssi": int(st_a.get("rssi", -127)),
                "energy": float(st_a.get("energy", 0.0)),
            },
            node_b: {
                "motion": float(st_b.get("motion", 0.0)),
                "delta": delta_b,
                "baseline": float(st_b.get("baseline", 0.0)),
                "threshold": float(st_b.get("threshold", 0.0)),
                "sigma": float(st_b.get("sigma", 0.0)),
                "rssi": int(st_b.get("rssi", -127)),
                "energy": float(st_b.get("energy", 0.0)),
            },
        },
    }

    json_path = os.path.join(save_dir, event_json)
    with open(json_path, "w", encoding="utf-8") as jf:
        json.dump(payload, jf, indent=2, sort_keys=True)

    writer.writerow(
        [
            stamp,
            event_png,
            event_json,
            trigger,
            f"{combined_delta:.6f}",
            peak_node,
            save_enabled,
            f"{delta_a:.6f}",
            f"{delta_b:.6f}",
            f"{float(st_a.get('motion', 0.0)):.6f}",
            f"{float(st_b.get('motion', 0.0)):.6f}",
            f"{float(st_a.get('threshold', 0.0)):.6f}",
            f"{float(st_b.get('threshold', 0.0)):.6f}",
            int(st_a.get("rssi", -127)),
            int(st_b.get("rssi", -127)),
        ]
    )


def log_motion_sample(stamp, combined_delta, state, node_a, node_b, writer):
    st_a = state.get(node_a, {})
    st_b = state.get(node_b, {})
    writer.writerow(
        [
            stamp,
            f"{combined_delta:.6f}",
            f"{float(st_a.get('motion', 0.0)):.6f}",
            f"{float(st_b.get('motion', 0.0)):.6f}",
            f"{float(st_a.get('delta', 0.0)):.6f}",
            f"{float(st_b.get('delta', 0.0)):.6f}",
            f"{float(st_a.get('threshold', 0.0)):.6f}",
            f"{float(st_b.get('threshold', 0.0)):.6f}",
            int(st_a.get("rssi", -127)),
            int(st_b.get("rssi", -127)),
        ]
    )


def main():
    args = parse_args()
    os.makedirs(args.save_dir, exist_ok=True)
    event_log_handle, event_writer = open_event_log(args.save_dir)
    motion_log_handle, motion_writer = open_motion_log(args.save_dir)

    stop_event = threading.Event()
    line_q = queue.Queue()

    for port in args.ports:
        th = threading.Thread(
            target=serial_reader,
            args=(port, args.baud, line_q, stop_event),
            daemon=True,
        )
        th.start()

    cv2.namedWindow("RF Motion", cv2.WINDOW_NORMAL)

    # Track state by node ID from packets, not by port names.
    state = {}
    # Node-level baseline windows support asymmetric room noise.
    baseline_buf = {}
    save_enabled = not args.hold_start
    last_trigger = 0.0
    last_motion_log = 0.0
    hold_low_motion_start = time.time() if not save_enabled else None

    print("Calibrating baseline... keep room still.")

    try:
        while True:
            # Drain queue quickly to keep visualization responsive.
            for _ in range(64):
                try:
                    _, port, line = line_q.get_nowait()
                except queue.Empty:
                    break

                if line.startswith("__ERROR__:"):
                    print(f"Serial reader error on {port}: {line}")
                    continue

                match = CSI_LINE_RE.match(line)
                if match:
                    node = match.group("node")
                    motion = float(match.group("motion"))
                    energy = float(match.group("energy"))
                    rssi = int(match.group("rssi"))

                    if node not in state:
                        state[node] = {
                            "motion": 0.0,
                            "baseline": 0.0,
                            "sigma": 0.0,
                            "threshold": float("inf"),
                            "delta": 0.0,
                            "energy": 0.0,
                            "rssi": -127,
                            "seen": 0,
                            "ready": False,
                        }
                        baseline_buf[node] = deque(maxlen=args.baseline_samples)

                    state[node]["motion"] = motion
                    state[node]["energy"] = energy
                    state[node]["rssi"] = rssi
                    state[node]["seen"] += 1

                    baseline_buf[node].append(motion)

            for node, st in state.items():
                buf = baseline_buf[node]
                if not st["ready"] and len(buf) >= args.baseline_samples:
                    arr = np.array(buf, dtype=np.float32)
                    mu = float(np.mean(arr))
                    sigma = float(np.std(arr))
                    st["baseline"] = mu
                    st["sigma"] = sigma
                    st["threshold"] = mu + args.threshold_sigma * sigma
                    st["ready"] = True
                    print(
                        f"{node} baseline locked. mean={mu:.6f} sigma={sigma:.6f} "
                        f"threshold={st['threshold']:.6f}"
                    )

                if st["ready"]:
                    # Slow baseline drift and sigma tracking per node.
                    st["baseline"] = (0.995 * st["baseline"]) + (0.005 * st["motion"])
                    deviation = abs(st["motion"] - st["baseline"])
                    st["sigma"] = (0.995 * st["sigma"]) + (0.005 * deviation)
                    st["threshold"] = st["baseline"] + args.threshold_sigma * max(st["sigma"], 1e-6)
                    st["delta"] = max(0.0, st["motion"] - st["baseline"])
                else:
                    st["delta"] = 0.0

            # Compute combined motion delta across all active nodes.
            deltas = []
            for node, st in state.items():
                if st["ready"]:
                    deltas.append(st["delta"])
            combined_delta = float(np.mean(deltas)) if deltas else 0.0

            now = time.time()
            if not save_enabled and args.hold_auto_release_seconds > 0.0:
                if combined_delta <= args.hold_auto_release_max_delta:
                    if hold_low_motion_start is None:
                        hold_low_motion_start = now
                    elif now - hold_low_motion_start >= args.hold_auto_release_seconds:
                        save_enabled = True
                        hold_low_motion_start = None
                        print("Hold mode auto-released after sustained low motion.")
                else:
                    hold_low_motion_start = None

            hold_elapsed = 0.0
            if not save_enabled and hold_low_motion_start is not None:
                hold_elapsed = now - hold_low_motion_start

            if now - last_motion_log >= max(0.05, args.motion_log_interval):
                stamp = time.strftime("%Y%m%d_%H%M%S")
                log_motion_sample(stamp, combined_delta, state, args.node_a, args.node_b, motion_writer)
                motion_log_handle.flush()
                last_motion_log = now

            img = np.zeros((520, 720, 3), dtype=np.uint8)
            draw_dashboard(
                img,
                state,
                combined_delta,
                args.sensitivity,
                args.node_a,
                args.node_b,
                save_enabled,
                args.require_both_nodes,
                hold_elapsed,
                args.hold_auto_release_seconds,
            )

            ready_nodes = [node for node, st in state.items() if st["ready"]]
            node_a_ready = args.node_a in ready_nodes
            node_b_ready = args.node_b in ready_nodes
            node_a_fire = node_a_ready and (state[args.node_a]["delta"] > state[args.node_a]["threshold"])
            node_b_fire = node_b_ready and (state[args.node_b]["delta"] > state[args.node_b]["threshold"])
            per_node_trigger = any(state[node]["delta"] > state[node]["threshold"] for node in ready_nodes)

            if args.require_both_nodes:
                trigger = node_a_fire and node_b_fire
            else:
                trigger = bool(ready_nodes) and (per_node_trigger or combined_delta > args.min_combined_trigger)

            if trigger:
                cv2.putText(
                    img,
                    "PLATEAU BREAK",
                    (220, 250),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    1.2,
                    (0, 60, 255),
                    3,
                )

                # Rate limit image saving to avoid disk flooding.
                if time.time() - last_trigger > args.event_cooldown:
                    stamp = time.strftime("%Y%m%d_%H%M%S")
                    png_name = f"event_{stamp}_{combined_delta:.5f}.png"
                    path = os.path.join(args.save_dir, png_name)
                    if save_enabled:
                        cv2.imwrite(path, img)
                    write_event_metadata(
                        args.save_dir,
                        stamp,
                        trigger,
                        combined_delta,
                        state,
                        args.node_a,
                        args.node_b,
                        event_writer,
                        save_enabled,
                    )
                    event_log_handle.flush()
                    if save_enabled:
                        print(f"Saved {path}")
                    else:
                        print(f"Hold mode: event logged without image ({png_name})")
                    last_trigger = time.time()

            cv2.imshow("RF Motion", img)
            key = cv2.waitKey(1) & 0xFF
            if key == ord("q"):
                break
            if key == ord("n") and state:
                for node in state:
                    if state[node]["ready"]:
                        state[node]["baseline"] = state[node]["motion"]
                        state[node]["sigma"] = max(1e-6, state[node]["sigma"])
                        state[node]["threshold"] = state[node]["baseline"] + args.threshold_sigma * state[node]["sigma"]
                print("Manual normalize applied (key 'n').")
            if key == ord("h"):
                save_enabled = not save_enabled
                if save_enabled:
                    hold_low_motion_start = None
                    print("Hold mode disabled. Image saving resumed.")
                else:
                    hold_low_motion_start = time.time()
                    print("Hold mode enabled. Motion/events logged, images suppressed.")

    finally:
        stop_event.set()
        event_log_handle.close()
        motion_log_handle.close()
        cv2.destroyAllWindows()


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
import argparse
import json
import math
import statistics
from collections import defaultdict


def parse_args():
    parser = argparse.ArgumentParser(description="Analyze DensePose JSONL recording metrics.")
    parser.add_argument("recording", help="Path to JSONL recording file")
    parser.add_argument(
        "--baseline-seconds",
        type=float,
        default=60.0,
        help="Seconds from start treated as baseline window",
    )
    parser.add_argument(
        "--motion-threshold-sigma",
        type=float,
        default=3.0,
        help="Threshold multiplier over baseline std for motion onset",
    )
    parser.add_argument(
        "--report",
        default=None,
        help="Optional JSON report output path",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Emit JSON summary to stdout",
    )
    return parser.parse_args()


def mean(values):
    return statistics.fmean(values) if values else 0.0


def stddev(values):
    return statistics.pstdev(values) if len(values) >= 2 else 0.0


def parse_pose(message):
    text = (message or "").strip()
    if not text.startswith("POSE,"):
        return None
    parts = [p.strip() for p in text.split(",")]
    if len(parts) < 5:
        return None
    try:
        x = float(parts[1])
        y = float(parts[2])
        z = float(parts[3])
        n = float(parts[4])
    except ValueError:
        return None
    return {"x": x, "y": y, "z": z, "n": n}


def parse_csi_kv(message):
    text = (message or "").strip()
    if not text.startswith("CSI,"):
        return None
    parts = [p.strip() for p in text.split(",")]
    if len(parts) < 3:
        return None

    out = {"node": parts[1]}
    for chunk in parts[2:]:
        if "=" not in chunk:
            continue
        k, v = chunk.split("=", 1)
        k = k.strip()
        v = v.strip()
        try:
            out[k] = float(v)
        except ValueError:
            out[k] = v
    return out


def summarize_packet_timing(ts_values):
    if len(ts_values) < 2:
        return {
            "count": len(ts_values),
            "rate_hz": 0.0,
            "interval_mean_ms": 0.0,
            "interval_std_ms": 0.0,
            "max_gap_ms": 0.0,
            "jitter_cv": 0.0,
            "gaps_over_2x_mean": 0,
            "timestamp_regressions": 0,
        }

    intervals = []
    regressions = 0
    for i in range(1, len(ts_values)):
        dt = ts_values[i] - ts_values[i - 1]
        if dt < 0:
            regressions += 1
            continue
        intervals.append(dt)

    if not intervals:
        return {
            "count": len(ts_values),
            "rate_hz": 0.0,
            "interval_mean_ms": 0.0,
            "interval_std_ms": 0.0,
            "max_gap_ms": 0.0,
            "jitter_cv": 0.0,
            "gaps_over_2x_mean": 0,
            "timestamp_regressions": regressions,
        }

    m = mean(intervals)
    s = stddev(intervals)
    max_gap = max(intervals)
    gap_outliers = sum(1 for dt in intervals if dt > (2.0 * m)) if m > 0 else 0

    return {
        "count": len(ts_values),
        "rate_hz": (1.0 / m) if m > 0 else 0.0,
        "interval_mean_ms": m * 1000.0,
        "interval_std_ms": s * 1000.0,
        "max_gap_ms": max_gap * 1000.0,
        "jitter_cv": (s / m) if m > 0 else 0.0,
        "gaps_over_2x_mean": gap_outliers,
        "timestamp_regressions": regressions,
    }


def baseline_and_motion(values, ts_values, start_ts, baseline_seconds):
    if not values or not ts_values:
        return {
            "baseline_mean": 0.0,
            "baseline_std": 0.0,
            "motion_mean": 0.0,
            "motion_std": 0.0,
            "snr_db": 0.0,
            "onset_ts": None,
        }

    baseline_cutoff = start_ts + baseline_seconds
    baseline_values = [v for t, v in zip(ts_values, values) if t <= baseline_cutoff]
    motion_values = [v for t, v in zip(ts_values, values) if t > baseline_cutoff]

    if not baseline_values:
        baseline_values = values[: max(1, min(120, len(values) // 2))]
    if not motion_values:
        motion_values = values[len(baseline_values):]

    b_mean = mean(baseline_values)
    b_std = stddev(baseline_values)
    m_mean = mean(motion_values)
    m_std = stddev(motion_values)

    signal_power = max(1e-9, abs(m_mean - b_mean))
    noise_power = max(1e-9, b_std)
    snr_db = 20.0 * math.log10(signal_power / noise_power)

    return {
        "baseline_mean": b_mean,
        "baseline_std": b_std,
        "motion_mean": m_mean,
        "motion_std": m_std,
        "snr_db": snr_db,
    }


def first_crossing(ts_values, values, threshold, hold=3):
    if not values:
        return None
    streak = 0
    for t, v in zip(ts_values, values):
        if v >= threshold:
            streak += 1
            if streak >= hold:
                return t
        else:
            streak = 0
    return None


def analyze(recording_path, baseline_seconds, threshold_sigma):
    events_total = 0
    malformed = 0

    first_ts = None
    last_ts = None

    port_event_ts = defaultdict(list)
    port_data_ts = defaultdict(list)

    port_pose_ts = defaultdict(list)
    port_pose_x = defaultdict(list)
    port_pose_y = defaultdict(list)
    port_pose_z = defaultdict(list)
    port_pose_n = defaultdict(list)

    port_csi_ts = defaultdict(list)
    port_csi_motion = defaultdict(list)

    with open(recording_path, "r", encoding="utf-8") as handle:
        for raw in handle:
            line = raw.strip()
            if not line:
                continue
            events_total += 1

            try:
                event = json.loads(line)
            except json.JSONDecodeError:
                malformed += 1
                continue

            ts = event.get("timestamp")
            port = event.get("port", "(unknown)")
            event_type = event.get("event_type", "(unknown)")
            message = event.get("message", "")

            if not isinstance(ts, (int, float)):
                continue
            ts = float(ts)

            if first_ts is None:
                first_ts = ts
            last_ts = ts

            port_event_ts[port].append(ts)
            if event_type == "data":
                port_data_ts[port].append(ts)

            pose = parse_pose(message)
            if pose is not None:
                port_pose_ts[port].append(ts)
                port_pose_x[port].append(pose["x"])
                port_pose_y[port].append(pose["y"])
                port_pose_z[port].append(pose["z"])
                port_pose_n[port].append(pose["n"])

            csi = parse_csi_kv(message)
            if csi is not None and isinstance(csi.get("motion"), (int, float)):
                port_csi_ts[port].append(ts)
                port_csi_motion[port].append(float(csi["motion"]))

    duration = (last_ts - first_ts) if first_ts is not None and last_ts is not None else 0.0

    ports = sorted(set(list(port_event_ts.keys()) + list(port_pose_ts.keys()) + list(port_csi_ts.keys())))
    per_port = {}

    for port in ports:
        pose_stats = {
            "mean_x": mean(port_pose_x[port]),
            "mean_y": mean(port_pose_y[port]),
            "mean_z": mean(port_pose_z[port]),
            "var_x": stddev(port_pose_x[port]) ** 2,
            "var_y": stddev(port_pose_y[port]) ** 2,
            "var_z": stddev(port_pose_z[port]) ** 2,
            "samples": len(port_pose_x[port]),
        }

        packet_stats = summarize_packet_timing(port_data_ts[port])
        fps_stats = summarize_packet_timing(port_pose_ts[port])

        bm = baseline_and_motion(
            port_csi_motion[port],
            port_csi_ts[port],
            first_ts or 0.0,
            baseline_seconds,
        )

        latency_ms = None
        if port_csi_motion[port] and port_pose_n[port]:
            csi_threshold = bm["baseline_mean"] + (threshold_sigma * bm["baseline_std"])
            pose_n_baseline = baseline_and_motion(
                port_pose_n[port],
                port_pose_ts[port],
                first_ts or 0.0,
                baseline_seconds,
            )
            pose_threshold = pose_n_baseline["baseline_mean"] + (2.0 * pose_n_baseline["baseline_std"])

            csi_onset = first_crossing(port_csi_ts[port], port_csi_motion[port], csi_threshold)
            pose_onset = first_crossing(port_pose_ts[port], port_pose_n[port], pose_threshold)

            if csi_onset is not None and pose_onset is not None:
                latency_ms = max(0.0, (pose_onset - csi_onset) * 1000.0)

        per_port[port] = {
            "packet": packet_stats,
            "pose": pose_stats,
            "fps": {
                "pose_update_hz": fps_stats["rate_hz"],
                "pose_interval_mean_ms": fps_stats["interval_mean_ms"],
                "pose_interval_std_ms": fps_stats["interval_std_ms"],
            },
            "noise_and_motion": {
                "noise_floor_std": bm["baseline_std"],
                "baseline_motion_mean": bm["baseline_mean"],
                "motion_window_mean": bm["motion_mean"],
                "snr_db": bm["snr_db"],
                "motion_latency_ms": latency_ms,
            },
        }

    return {
        "recording": recording_path,
        "events_total": events_total,
        "malformed_lines": malformed,
        "duration_seconds": duration,
        "ports": per_port,
    }


def print_human(summary):
    print(f"Recording: {summary['recording']}")
    print(f"Duration (s): {summary['duration_seconds']:.3f}")
    print(f"Total events: {summary['events_total']}")
    print(f"Malformed lines: {summary['malformed_lines']}")

    for port, data in summary["ports"].items():
        print("-")
        print(f"Port: {port}")

        packet = data["packet"]
        print(
            "Packet stability: "
            f"rate={packet['rate_hz']:.2f}Hz "
            f"mean_dt={packet['interval_mean_ms']:.2f}ms "
            f"std_dt={packet['interval_std_ms']:.2f}ms "
            f"max_gap={packet['max_gap_ms']:.2f}ms "
            f"jitter_cv={packet['jitter_cv']:.3f} "
            f"outlier_gaps={packet['gaps_over_2x_mean']} "
            f"regressions={packet['timestamp_regressions']}"
        )

        pose = data["pose"]
        print(
            "Mean pose / variance: "
            f"mean=({pose['mean_x']:.3f},{pose['mean_y']:.3f},{pose['mean_z']:.3f}) "
            f"var=({pose['var_x']:.6f},{pose['var_y']:.6f},{pose['var_z']:.6f}) "
            f"samples={pose['samples']}"
        )

        fps = data["fps"]
        print(
            "Update frequency: "
            f"pose_hz={fps['pose_update_hz']:.2f} "
            f"mean_frame_ms={fps['pose_interval_mean_ms']:.2f} "
            f"std_frame_ms={fps['pose_interval_std_ms']:.2f}"
        )

        nm = data["noise_and_motion"]
        latency = "--" if nm["motion_latency_ms"] is None else f"{nm['motion_latency_ms']:.2f}"
        print(
            "Noise/SNR/latency: "
            f"noise_std={nm['noise_floor_std']:.6f} "
            f"baseline_motion={nm['baseline_motion_mean']:.6f} "
            f"motion_mean={nm['motion_window_mean']:.6f} "
            f"snr_db={nm['snr_db']:.2f} "
            f"latency_ms={latency}"
        )


def main():
    args = parse_args()
    summary = analyze(args.recording, args.baseline_seconds, args.motion_threshold_sigma)

    if args.report:
        with open(args.report, "w", encoding="utf-8") as handle:
            json.dump(summary, handle, indent=2, sort_keys=True)

    if args.json:
        print(json.dumps(summary, indent=2, sort_keys=True))
    else:
        print_human(summary)


if __name__ == "__main__":
    main()

import argparse
import json
from collections import Counter


VALIDATOR_VERSION = "1.0"
KNOWN_EVENT_TYPES = {"status", "data", "error"}


def parse_args():
    parser = argparse.ArgumentParser(description="Validate PacketEvent JSONL recordings")
    parser.add_argument("recording", help="Path to JSONL recording file")
    parser.add_argument(
        "--min-duration",
        type=float,
        default=10.0,
        help="Minimum required capture duration in seconds",
    )
    parser.add_argument(
        "--expected-ports",
        nargs="*",
        default=["/dev/ttyACM0", "/dev/ttyACM1"],
        help="Ports that must appear and emit at least one data event",
    )
    parser.add_argument(
        "--strict-ports",
        action="store_true",
        help="Fail if any expected port is missing",
    )
    parser.add_argument(
        "--check-monotonic",
        action="store_true",
        help="Fail on timestamp regressions",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Print machine-readable JSON summary",
    )
    parser.add_argument(
        "--report",
        default=None,
        help="Optional path to write JSON report",
    )
    return parser.parse_args()


def main():
    args = parse_args()

    total_lines = 0
    total = 0
    malformed = 0
    first_ts = None
    last_ts = None
    regressions = 0
    warnings = []
    per_port = {}
    per_type = Counter()
    per_port_data = Counter()

    with open(args.recording, "r", encoding="utf-8") as handle:
        for line_number, raw in enumerate(handle, start=1):
            total_lines += 1
            line = raw.strip()
            if not line:
                continue
            total += 1

            try:
                event = json.loads(line)
            except json.JSONDecodeError:
                malformed += 1
                continue

            timestamp = event.get("timestamp")
            port = event.get("port", "(unknown)")
            event_type = event.get("event_type", "(unknown)")

            if event_type not in KNOWN_EVENT_TYPES:
                warnings.append(f"line {line_number}: unknown event type '{event_type}'")

            if isinstance(timestamp, (int, float)):
                if first_ts is None:
                    first_ts = float(timestamp)
                elif float(timestamp) < float(last_ts):
                    regressions += 1
                last_ts = float(timestamp)

            if port not in per_port:
                per_port[port] = {"total": 0, "types": {}}
            per_port[port]["total"] += 1
            per_port[port]["types"][event_type] = per_port[port]["types"].get(event_type, 0) + 1

            per_type[event_type] += 1
            if event_type == "data":
                per_port_data[port] += 1

    duration = 0.0
    if first_ts is not None and last_ts is not None:
        duration = max(0.0, last_ts - first_ts)

    event_rate = (total / duration) if duration > 0.0 else 0.0
    missing_ports = [port for port in args.expected_ports if per_port_data.get(port, 0) <= 0]

    failed_reasons = []
    if malformed > 0:
        failed_reasons.append("malformed-json")
    if args.check_monotonic and regressions > 0:
        failed_reasons.append("timestamp-regression")
    if duration < args.min_duration:
        failed_reasons.append("duration-too-short")
    if args.strict_ports and missing_ports:
        failed_reasons.append("missing-expected-ports")
    if event_rate <= 0.0:
        failed_reasons.append("zero-event-rate")

    summary = {
        "validator_version": VALIDATOR_VERSION,
        "recording": args.recording,
        "passed": len(failed_reasons) == 0,
        "failed_reasons": failed_reasons,
        "metrics": {
            "total_lines": total_lines,
            "total_events": total,
            "malformed_lines": malformed,
            "timestamp_regressions": regressions,
            "duration_seconds": round(duration, 6),
            "event_rate_hz": round(event_rate, 3),
            "timestamp_start": first_ts,
            "timestamp_end": last_ts,
        },
        "expected_ports": args.expected_ports,
        "missing_expected_ports": missing_ports,
        "event_types": dict(sorted(per_type.items())),
        "per_port": {
            port: {
                "total": info["total"],
                "data": per_port_data.get(port, 0),
                "types": dict(sorted(info["types"].items())),
            }
            for port, info in sorted(per_port.items())
        },
        "warnings": warnings,
    }

    if args.report:
        with open(args.report, "w", encoding="utf-8") as handle:
            json.dump(summary, handle, indent=2, sort_keys=True)

    if args.json:
        print(json.dumps(summary, indent=2, sort_keys=True))
    else:
        print(f"Validator: {VALIDATOR_VERSION}")
        print(f"Recording: {args.recording}")
        print(f"Passed: {summary['passed']}")
        print(f"Total events: {total} (lines: {total_lines})")
        print(f"Malformed lines: {malformed}")
        print(f"Timestamp regressions: {regressions}")
        print(f"Duration (s): {duration:.3f}")
        print(f"Event rate (Hz): {event_rate:.3f}")

        if first_ts is not None and last_ts is not None:
            print(f"Timestamp range: {first_ts:.6f} -> {last_ts:.6f}")

        if missing_ports:
            print(f"Missing expected data ports: {', '.join(missing_ports)}")

        print("Event types:")
        for event_type in sorted(per_type):
            print(f"  {event_type}: {per_type[event_type]}")

        print("Per-port counts:")
        for port in sorted(per_port):
            info = per_port[port]
            print(f"  {port}: total={info['total']} data={per_port_data.get(port, 0)}")
            for event_type in sorted(info["types"]):
                print(f"    {event_type}: {info['types'][event_type]}")

        if warnings:
            print("Warnings:")
            for warning in warnings[:10]:
                print(f"  {warning}")
            if len(warnings) > 10:
                print(f"  ... {len(warnings) - 10} more warnings")

        if failed_reasons:
            print(f"FAILED: {', '.join(failed_reasons)}")
        else:
            print("PASSED")

    raise SystemExit(0 if summary["passed"] else 1)


if __name__ == "__main__":
    main()

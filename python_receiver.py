import argparse
import json
import queue
import time

from processing.pipeline import ProcessingPipeline
from receiver_io.jsonl_recorder import JsonlRecorder
from receiver_io.replay_source import ReplaySource
from receiver_io.serial_source import SerialSource
from visualization.vtk_visualizer import VtkVisualizer

BAUD = 115200
DEFAULT_PORTS = ["/dev/ttyACM0", "/dev/ttyACM1"]
RECONNECT_DELAY_SECONDS = 1.0
MAX_TRAIL_POINTS = 120
REFRESH_SECONDS = 0.05
SIGNAL_WINDOW_SECONDS = 2.5
SIGNAL_PULSE_SPEED_HZ = 0.75
CALIBRATION = {
    "axis_limits": {
        "x": (-1.0, 1.0),
        "y": (-1.0, 1.0),
        "z": (0.0, 2.0),
    },
    "device_positions": {
        "/dev/ttyACM0": (-0.7, -0.1, 0.9),
        "/dev/ttyACM1": (0.7, 0.1, 0.9),
    },
}

AXIS_LIMITS = CALIBRATION["axis_limits"]
DEVICE_POSITIONS = CALIBRATION["device_positions"]


def parse_axis_limit(value):
    axis, raw_limits = value.split("=", 1)
    axis = axis.strip().lower()
    if axis not in {"x", "y", "z"}:
        raise argparse.ArgumentTypeError(f"Invalid axis '{axis}'. Use x, y, or z.")

    parts = [part.strip() for part in raw_limits.split(",")]
    if len(parts) != 2:
        raise argparse.ArgumentTypeError("Axis limits must be AXIS=MIN,MAX")

    try:
        lower = float(parts[0])
        upper = float(parts[1])
    except ValueError as exc:
        raise argparse.ArgumentTypeError("Axis limits must be numeric") from exc

    if lower >= upper:
        raise argparse.ArgumentTypeError("Axis limits must satisfy MIN < MAX")

    return axis, (lower, upper)


def parse_device_position(value):
    port, raw_coords = value.split("=", 1)
    port = port.strip()
    parts = [part.strip() for part in raw_coords.split(",")]
    if len(parts) != 3:
        raise argparse.ArgumentTypeError("Device positions must be PORT=X,Y,Z")

    try:
        coords = (float(parts[0]), float(parts[1]), float(parts[2]))
    except ValueError as exc:
        raise argparse.ArgumentTypeError("Device positions must be numeric") from exc

    return port, coords


def resolve_ports(requested_ports):
    return SerialSource.resolve_requested_ports(requested_ports, DEFAULT_PORTS, detect_limit=2)


class DensePose3DVisualizer:
    def __init__(
        self,
        ports,
        data_source,
        pipeline,
        device_positions=None,
        axis_limits=None,
        recorder=None,
        always_on_top=False,
    ):
        import matplotlib
        import matplotlib.pyplot as plt

        try:
            matplotlib.use("TkAgg")
        except Exception:
            # Fall back to the default backend if Tk is not available.
            pass

        self.ports = ports
        self.device_positions = dict(DEVICE_POSITIONS)
        if device_positions:
            self.device_positions.update(device_positions)
        self.axis_limits = dict(AXIS_LIMITS)
        if axis_limits:
            self.axis_limits.update(axis_limits)
        self.output_queue = queue.Queue()
        self.data_source = data_source
        self.pipeline = pipeline
        self.plt = plt
        self.recorder = recorder
        self.always_on_top = always_on_top

        self.port_colors = {}
        for idx, port in enumerate(ports):
            self.port_colors[port] = "#00c2ff" if idx == 0 else "#ff8a00"

        self.plt.ion()
        self.figure = self.plt.figure(figsize=(11, 7))
        self.ax = self.figure.add_subplot(111, projection="3d")

        if self.always_on_top:
            try:
                manager = self.plt.get_current_fig_manager()
                if hasattr(manager, "window") and hasattr(manager.window, "attributes"):
                    manager.window.attributes("-topmost", True)
            except Exception:
                pass

    def start(self):
        self.output_queue = self.data_source.get_queue()
        self.data_source.start()

        try:
            while self.plt.fignum_exists(self.figure.number):
                self.process_events()
                scene_frame = self.pipeline.build_scene_frame(time.time(), source_label="live")
                self.draw_frame(scene_frame)
                self.plt.pause(REFRESH_SECONDS)
        except KeyboardInterrupt:
            print("Stopping visualizer...")
        finally:
            self.stop()

    def stop(self):
        self.data_source.stop()
        self.plt.close(self.figure)

    def process_events(self):
        while True:
            try:
                event = self.output_queue.get_nowait()
            except queue.Empty:
                break

            if event.event_type == "data" and self.recorder is not None:
                self.recorder.write(event)
            self.pipeline.process_event(event)

    def get_recent_signal_count(self, port):
        return self.pipeline.get_recent_signal_count(port)

    def get_port_position(self, port, idx):
        if port in self.device_positions:
            return self.device_positions[port]
        # Fallback placement if extra ports are added later.
        span = 1.4
        x = -0.7 + (idx * span / max(1, len(self.ports) - 1))
        return (x, 0.0, 0.9)

    def draw_frame(self, scene_frame):
        self.ax.clear()
        self.ax.set_title("DensePose 3D Serial Visual")
        self.ax.set_xlabel("X")
        self.ax.set_ylabel("Y")
        self.ax.set_zlabel("Z")
        self.ax.set_xlim(*self.axis_limits["x"])
        self.ax.set_ylim(*self.axis_limits["y"])
        self.ax.set_zlim(*self.axis_limits["z"])
        self.ax.view_init(elev=22, azim=35)

        now = time.time()
        status_lines = []

        device_xyz = {}
        for idx, port in enumerate(self.ports):
            device_xyz[port] = self.get_port_position(port, idx)

        # Draw static device nodes and activity halos from SIGNAL heartbeats.
        for idx, port in enumerate(self.ports):
            color = self.port_colors.get(port, "#cccccc")
            x, y, z = device_xyz[port]

            pulse_count = self.get_recent_signal_count(port)
            pulse_strength = min(1.0, pulse_count / 12.0)

            base_size = 140 + (260 * pulse_strength)
            halo_size = 320 + (640 * pulse_strength)

            self.ax.scatter(x, y, z, color=color, s=base_size, marker="o", alpha=0.95)
            self.ax.scatter(x, y, z, color=color, s=halo_size, marker="o", alpha=0.13)

            state = "CONNECTED" if self.pipeline.status_by_port.get(port, False) else "DISCONNECTED"
            status_lines.append(
                f"{port}: {state} | signal pulses {pulse_count} | last {self.pipeline.last_packet_by_port.get(port, '(none)')}"
            )

            points = list(self.pipeline.trails_by_port.get(port, ()))
            if points:
                xs = [p[0] for p in points]
                ys = [p[1] for p in points]
                zs = [p[2] for p in points]
                self.ax.plot(xs, ys, zs, color=color, alpha=0.55, linewidth=1.3)
                self.ax.scatter(xs[-1], ys[-1], zs[-1], color=color, s=70, marker="^")

        if len(self.ports) >= 2:
            left = self.ports[0]
            right = self.ports[1]
            lx, ly, lz = device_xyz[left]
            rx, ry, rz = device_xyz[right]

            # Baseline link between the two Nano boards.
            self.ax.plot([lx, rx], [ly, ry], [lz, rz], color="#9ca3af", linewidth=1.2, alpha=0.7)

            left_activity = self.get_recent_signal_count(left)
            right_activity = self.get_recent_signal_count(right)
            total_activity = left_activity + right_activity

            if total_activity > 0:
                phase = (now * SIGNAL_PULSE_SPEED_HZ) % 1.0
                # Bias direction slightly toward the more active board.
                bias = 0.5
                if total_activity:
                    bias = left_activity / total_activity
                t = max(0.0, min(1.0, 0.15 + 0.7 * phase + 0.15 * (1.0 - bias)))

                px = (1.0 - t) * lx + t * rx
                py = (1.0 - t) * ly + t * ry
                pz = (1.0 - t) * lz + t * rz + 0.15 * abs(0.5 - t)

                energy = min(1.0, total_activity / 20.0)
                particle_size = 70 + (180 * energy)
                self.ax.scatter(px, py, pz, color="#22d3ee", s=particle_size, marker="o", alpha=0.95)
                self.ax.plot([lx, px], [ly, py], [lz, pz], color="#22d3ee", linewidth=1.0, alpha=0.35)
                self.ax.plot([px, rx], [py, ry], [pz, rz], color="#fb7185", linewidth=1.0, alpha=0.35)

        self.ax.text2D(
            0.02,
            0.98,
            "\n".join(status_lines),
            transform=self.ax.transAxes,
            va="top",
            fontsize=9,
        )

        self.ax.text2D(
            0.02,
            0.02,
            (
                "Motion mode: SIGNAL pulse rendering between boards when XYZ is absent | "
                f"parser {(scene_frame.metrics.get('parser').avg_ms if scene_frame.metrics.get('parser') else 0.0):.3f}ms"
                f"{'[!]' if (scene_frame.metrics.get('parser') and scene_frame.metrics.get('parser').is_breached) else ''} "
                f"cal {(scene_frame.metrics.get('calibration').avg_ms if scene_frame.metrics.get('calibration') else 0.0):.3f}ms"
                f"{'[!]' if (scene_frame.metrics.get('calibration') and scene_frame.metrics.get('calibration').is_breached) else ''} "
                f"filter {(scene_frame.metrics.get('filter').avg_ms if scene_frame.metrics.get('filter') else 0.0):.3f}ms"
                f"{'[!]' if (scene_frame.metrics.get('filter') and scene_frame.metrics.get('filter').is_breached) else ''} "
                f"det {(scene_frame.metrics.get('detector').avg_ms if scene_frame.metrics.get('detector') else 0.0):.3f}ms"
                f"{'[!]' if (scene_frame.metrics.get('detector') and scene_frame.metrics.get('detector').is_breached) else ''} "
                f"lag {scene_frame.queue_lag_ms if scene_frame.queue_lag_ms is not None else 0.0:.2f}ms "
                f"health {scene_frame.health.state if scene_frame.health is not None else 'UNKNOWN'}"
            ),
            transform=self.ax.transAxes,
            va="bottom",
            fontsize=9,
            color="#0f172a",
        )


def run_headless(
    ports,
    data_source,
    pipeline,
    duration=None,
    recorder=None,
    soak=False,
    soak_output=None,
    soak_interval=5.0,
):
    output_queue = data_source.get_queue()

    data_source.start()

    print(f"Headless receiver started on ports: {', '.join(ports)}")
    print("Press Ctrl+C to stop.")

    started = time.time()
    last_report = 0.0
    last_soak_write = 0.0
    soak_handle = None
    if soak and soak_output:
        soak_handle = open(soak_output, "a", encoding="utf-8")

    def write_soak_snapshot(frame):
        if soak_handle is None:
            return
        snapshot = {
            "timestamp": frame.timestamp,
            "health": frame.health.state if frame.health is not None else "UNKNOWN",
            "health_reason": frame.health.reason if frame.health is not None else "",
            "violations": [
                {"stage": v.stage, "avg_ms": v.avg_ms, "budget_ms": v.budget_ms}
                for v in (frame.health.violations if frame.health is not None else [])
            ],
            "queue_lag_ms": frame.queue_lag_ms,
            "metrics": {
                name: {
                    "avg_ms": metric.avg_ms,
                    "max_ms": metric.max_ms,
                    "min_ms": metric.min_ms,
                    "samples": metric.samples,
                    "budget_ms": metric.budget_ms,
                    "is_breached": metric.is_breached,
                }
                for name, metric in frame.metrics.items()
            },
        }
        soak_handle.write(json.dumps(snapshot, separators=(",", ":")) + "\n")
        soak_handle.flush()

    try:
        while True:
            if duration is not None and (time.time() - started) >= duration:
                break

            try:
                event = output_queue.get(timeout=0.2)
            except queue.Empty:
                event = None

            if event is not None and recorder is not None and event.event_type == "data":
                recorder.write(event)

            if event is not None:
                pipeline.process_event(event)

            now = time.time()
            if (now - last_report) >= 1.0:
                last_report = now
                frame = pipeline.build_scene_frame(now, source_label="headless")
                health_state = frame.health.state if frame.health is not None else "UNKNOWN"
                print(f"PIPELINE HEALTH: {health_state}")
                print("---")
                for port in ports:
                    state = "CONNECTED" if pipeline.status_by_port.get(port, False) else "DISCONNECTED"
                    parser_metric = frame.metrics.get("parser")
                    calibration_metric = frame.metrics.get("calibration")
                    filter_metric = frame.metrics.get("filter")
                    detector_metric = frame.metrics.get("detector")
                    total_metric = frame.metrics.get("total")
                    breached = [
                        name
                        for name, metric in frame.metrics.items()
                        if getattr(metric, "is_breached", False)
                    ]
                    breach_suffix = f" [BREACH: {', '.join(sorted(breached))}]" if breached else ""

                    parser_status = "BREACH" if parser_metric and parser_metric.is_breached else "OK"
                    calibration_status = "BREACH" if calibration_metric and calibration_metric.is_breached else "OK"
                    filter_status = "BREACH" if filter_metric and filter_metric.is_breached else "OK"
                    detector_status = "BREACH" if detector_metric and detector_metric.is_breached else "OK"
                    queue_status = "OK"
                    if frame.health is not None and frame.health.state in {"DEGRADED", "OVERLOADED"}:
                        queue_status = "WARN"

                    print(f"parser       {parser_status}")
                    print(f"calibration  {calibration_status}")
                    print(f"filter       {filter_status}")
                    print(f"detector     {detector_status}")
                    print(f"queue lag    {queue_status}")

                    print(
                        f"{port} | {state} | packets={pipeline.packet_counts.get(port, 0)} "
                        f"xyz={pipeline.xyz_counts.get(port, 0)} signal={pipeline.signal_counts.get(port, 0)} "
                        f"| stage_avg_ms p={(parser_metric.avg_ms if parser_metric else 0.0):.3f} "
                        f"c={(calibration_metric.avg_ms if calibration_metric else 0.0):.3f} "
                        f"f={(filter_metric.avg_ms if filter_metric else 0.0):.3f} "
                        f"d={(detector_metric.avg_ms if detector_metric else 0.0):.3f} "
                        f"t={(total_metric.avg_ms if total_metric else 0.0):.3f} "
                        f"| lag_avg_ms={(frame.queue_lag_ms if frame.queue_lag_ms is not None else 0.0):.2f} "
                        f"health={(frame.health.state if frame.health is not None else 'UNKNOWN')} "
                        f"| last={pipeline.last_packet_by_port.get(port, '(none)')}{breach_suffix}"
                    )

            if soak and soak_handle is not None and (now - last_soak_write) >= max(0.5, float(soak_interval)):
                last_soak_write = now
                frame = pipeline.build_scene_frame(now, source_label="soak")
                write_soak_snapshot(frame)
    except KeyboardInterrupt:
        pass
    finally:
        data_source.stop()
        if recorder is not None:
            recorder.close()
        if soak_handle is not None:
            soak_handle.close()

    print("=== Headless summary ===")
    for port in ports:
        state = "CONNECTED" if pipeline.status_by_port.get(port, False) else "DISCONNECTED"
        print(
            f"{port} | {state} | packets={pipeline.packet_counts.get(port, 0)} "
            f"xyz={pipeline.xyz_counts.get(port, 0)} signal={pipeline.signal_counts.get(port, 0)}"
        )


def run_vtk(
    ports,
    data_source,
    pipeline,
    device_positions,
    axis_limits,
    duration=None,
    recorder=None,
    compare_source=None,
    compare_pipeline=None,
    always_on_top=False,
):
    output_queue = data_source.get_queue()
    compare_queue = compare_source.get_queue() if compare_source is not None else None

    visualizer = VtkVisualizer(
        device_positions=device_positions,
        axis_limits=axis_limits,
        comparison_mode=compare_source is not None,
        always_on_top=always_on_top,
    )

    data_source.start()
    if compare_source is not None:
        compare_source.start()

    started = time.time()

    def poll_callback(_obj, _event):
        processed = 0
        while processed < 1000:
            try:
                event = output_queue.get_nowait()
            except queue.Empty:
                break

            processed += 1

            if recorder is not None and event.event_type == "data":
                recorder.write(event)

            pipeline.process_event(event)

        if compare_queue is not None and compare_pipeline is not None:
            compare_processed = 0
            while compare_processed < 1000:
                try:
                    compare_event = compare_queue.get_nowait()
                except queue.Empty:
                    break
                compare_processed += 1
                compare_pipeline.process_event(compare_event)

        scene = pipeline.build_scene_frame(time.time(), source_label="live" if compare_source else "primary")
        compare_scene = None
        if compare_pipeline is not None:
            compare_scene = compare_pipeline.build_scene_frame(time.time(), source_label="baseline")
        visualizer.update(scene, compare_scene)

        if duration is not None and (time.time() - started) >= duration:
            visualizer.interactor.TerminateApp()

    try:
        visualizer.run(poll_callback, interval_ms=33)
    finally:
        data_source.stop()
        if compare_source is not None:
            compare_source.stop()
        if recorder is not None:
            recorder.close()


def parse_args():
    parser = argparse.ArgumentParser(description="DensePose serial receiver")
    parser.add_argument("--headless", action="store_true", help="Run without Matplotlib UI")
    parser.add_argument(
        "--ports",
        nargs="+",
        default=None,
        help="Serial ports to open (default: auto-detect /dev/ttyACM*)",
    )
    parser.add_argument(
        "--device-position",
        action="append",
        default=None,
        metavar="PORT=X,Y,Z",
        help="Override a device position for calibration",
    )
    parser.add_argument(
        "--axis-limit",
        action="append",
        default=None,
        metavar="AXIS=MIN,MAX",
        help="Override an axis range for calibration",
    )
    parser.add_argument(
        "--duration",
        type=float,
        default=None,
        help="Optional run duration in seconds (headless mode)",
    )
    parser.add_argument(
        "--log-file",
        default=None,
        help="Write data packets to a JSONL log file",
    )
    parser.add_argument(
        "--replay",
        default=None,
        help="Read events from a JSONL recording instead of live serial ports",
    )
    parser.add_argument(
        "--replay-speed",
        default="realtime",
        help="Replay speed: realtime, max, or numeric multiplier such as 4.0",
    )
    parser.add_argument(
        "--compare-replay",
        default=None,
        help="Optional baseline replay file for side-by-side comparison in VTK mode",
    )
    parser.add_argument(
        "--compare-replay-speed",
        default="realtime",
        help="Replay speed for --compare-replay input",
    )
    parser.add_argument(
        "--visualizer",
        choices=["matplotlib", "vtk"],
        default="matplotlib",
        help="Visualizer backend (default: matplotlib)",
    )
    parser.add_argument(
        "--always-on-top",
        action="store_true",
        help="Try to keep visualizer window above other workspace windows",
    )
    parser.add_argument(
        "--soak",
        action="store_true",
        help="Enable long-run health snapshot logging in headless mode",
    )
    parser.add_argument(
        "--soak-output",
        default="/tmp/security_densepose_soak_health.jsonl",
        help="JSONL path for --soak health snapshots",
    )
    parser.add_argument(
        "--soak-interval",
        type=float,
        default=5.0,
        help="Seconds between soak health snapshots",
    )
    return parser.parse_args()


def build_calibration(args):
    device_positions = {}
    for item in args.device_position or []:
        port, coords = parse_device_position(item)
        device_positions[port] = coords

    axis_limits = {}
    for item in args.axis_limit or []:
        axis, limits = parse_axis_limit(item)
        axis_limits[axis] = limits

    return device_positions, axis_limits


if __name__ == "__main__":
    args = parse_args()
    if args.replay:
        data_source = ReplaySource(args.replay, speed=args.replay_speed, source_name="replay")
        if args.ports:
            ports = args.ports
        else:
            # Keep visual layout deterministic in replay mode.
            ports = DEFAULT_PORTS
    else:
        ports = resolve_ports(args.ports)
        data_source = SerialSource(
            ports,
            BAUD,
            output_queue=queue.Queue(),
            reconnect_delay_seconds=RECONNECT_DELAY_SECONDS,
            source_name="serial",
        )

    compare_source = None
    if args.compare_replay:
        compare_source = ReplaySource(
            args.compare_replay,
            speed=args.compare_replay_speed,
            source_name="replay-baseline",
        )

    device_position_overrides, axis_limit_overrides = build_calibration(args)
    device_positions = dict(DEVICE_POSITIONS)
    device_positions.update(device_position_overrides)
    axis_limits = dict(AXIS_LIMITS)
    axis_limits.update(axis_limit_overrides)

    pipeline = ProcessingPipeline(
        ports=ports,
        axis_limits=axis_limits,
        max_trail_points=MAX_TRAIL_POINTS,
        signal_window_seconds=SIGNAL_WINDOW_SECONDS,
    )
    compare_pipeline = None
    if compare_source is not None:
        compare_pipeline = ProcessingPipeline(
            ports=ports,
            axis_limits=axis_limits,
            max_trail_points=MAX_TRAIL_POINTS,
            signal_window_seconds=SIGNAL_WINDOW_SECONDS,
        )

    recorder = JsonlRecorder(args.log_file) if args.log_file else None

    try:
        if args.headless:
            run_headless(
                ports,
                data_source,
                pipeline,
                duration=args.duration,
                recorder=recorder,
                soak=args.soak,
                soak_output=args.soak_output,
                soak_interval=args.soak_interval,
            )
        elif args.visualizer == "vtk":
            print("Starting VTK visualizer. Close the window or press Ctrl+C to stop.")
            run_vtk(
                ports,
                data_source=data_source,
                pipeline=pipeline,
                device_positions=device_positions,
                axis_limits=axis_limits,
                duration=args.duration,
                recorder=recorder,
                compare_source=compare_source,
                compare_pipeline=compare_pipeline,
                always_on_top=args.always_on_top,
            )
        else:
            print("Starting DensePose 3D visualizer. Close the plot window or press Ctrl+C to stop.")
            visualizer = DensePose3DVisualizer(
                ports,
                data_source=data_source,
                pipeline=pipeline,
                device_positions=device_positions,
                axis_limits=axis_limits,
                recorder=recorder,
                always_on_top=args.always_on_top,
            )
            visualizer.start()
    finally:
        if recorder is not None:
            recorder.close()

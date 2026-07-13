# security_densepose

This workspace contains two PlatformIO Arduino projects for Arduino Nano ESP32 boards and a Python serial receiver script.

## Contents

- `esp_32/`
- `ESP32/`
- `python_receiver.py`

## PlatformIO Board Configuration

Each PlatformIO project is configured for:

- `board = arduino_nano_esp32`
- `framework = arduino`
- `monitor_speed = 115200`
- `-DARDUINO_USB_CDC_ON_BOOT=1`

## Flashing

1. Connect one Arduino Nano ESP32 board by USB.
2. Open either `esp_32` or `ESP32` in PlatformIO.
3. Run Upload.
4. Open the serial monitor at `115200` baud.
5. Confirm the device prints:

   - `ESP32-S3 Ready`
   - `SIGNAL`

## Dual-Node CSI Motion Pipeline

The main runtime is `motion_pipeline.py`.

Features:

- Per-node adaptive baselines and thresholds (`NODE_A`, `NODE_B`)
- Live fused 2D heatmap (left/right room-side estimate)
- Plateau-break event detection with cooldown
- Event images plus structured metadata (`.json`) and CSV index log

Run:

```bash
python3 motion_pipeline.py --ports /dev/ttyACM0 /dev/ttyACM1
```

Optional flags:

- `--baseline-samples 220`
- `--threshold-sigma 5.0`
- `--sensitivity 1200`
- `--event-cooldown 1.0`
- `--min-combined-trigger 0.25`
- `--require-both-nodes` (event fires only when both `NODE_A` and `NODE_B` exceed their own thresholds)
- `--hold-start` (start in hold mode: log motion/events but suppress image writes)
- `--motion-log-interval 0.5`
- `--node-a NODE_A --node-b NODE_B`

Keyboard controls while running:

- `q` quit
- `n` normalize to current baseline
- `h` toggle hold mode on/off

Recommended quiet-room hardening profile:

```bash
python3 motion_pipeline.py \
   --ports /dev/ttyACM0 /dev/ttyACM1 \
   --baseline-samples 600 \
   --threshold-sigma 7.5 \
   --min-combined-trigger 0.80 \
   --require-both-nodes \
   --hold-start
```

Outputs in `rf_events/`:

- `event_YYYYmmdd_HHMMSS_<delta>.png`
- `event_YYYYmmdd_HHMMSS_<delta>.json`
- `event_log.csv`
- `motion_log.csv`

Legacy script:

- `python_receiver.py` still exists for simpler serial viewing, but it is not the primary dual-node runtime.

### Receiver Logging And Validation

You can record packet events from the receiver as JSONL:

```bash
python3 python_receiver.py --headless --log-file /tmp/security_densepose_capture.jsonl
```

Validate a recording before using it for replay or algorithm testing:

```bash
python3 validate_recording.py /tmp/security_densepose_capture.jsonl
```

The validator reports total events, malformed lines, timestamp range, and per-port event counts.

Use strict gate checks (monotonic timestamps, required ports, minimum duration):

```bash
python3 validate_recording.py /tmp/security_densepose_capture.jsonl \
   --check-monotonic \
   --strict-ports \
   --min-duration 10 \
   --report /tmp/security_densepose_capture.validation.json
```

### Replay Mode

Replay a recording through the same receiver pipeline:

```bash
python3 python_receiver.py --headless --replay /tmp/security_densepose_capture.jsonl --replay-speed realtime
```

Replay speed options:

- `realtime` respects captured timing
- `max` replays as fast as possible
- numeric multiplier such as `4.0`

### Visualizer Backends

`python_receiver.py` now supports two live renderer backends:

- `matplotlib` (default)
- `vtk` (parallel renderer path)

Run with Matplotlib (default):

```bash
python3 python_receiver.py --log-file /tmp/security_densepose_live.jsonl
```

Run with VTK:

```bash
python3 python_receiver.py --visualizer vtk --log-file /tmp/security_densepose_live.jsonl
```

Run VTK in side-by-side comparison mode (primary vs baseline replay):

```bash
python3 python_receiver.py \
   --visualizer vtk \
   --replay /tmp/security_densepose_capture.jsonl \
   --compare-replay /tmp/security_densepose_baseline.jsonl \
   --replay-speed max \
   --compare-replay-speed max
```

VTK dependency install:

```bash
python3 -m pip install vtk
```

### Architecture Freeze

Architecture, contracts, and milestone freeze details are tracked in:

- `ARCHITECTURE.md`

### Processing Stage Chain

Both Matplotlib and VTK backends now consume the same staged processing output:

`parser -> calibration -> filter -> detector -> SceneFrame`

Stage timing metrics are included in `SceneFrame` and shown in:

- Headless logs (`stage_ms ...`)
- VTK overlay text

Rolling instrumentation now reports:

- Per-stage rolling averages (`parser`, `calibration`, `filter`, `detector`, `total`)
- Queue-lag average (live serial mode)
- Health state: `REAL_TIME`, `DEGRADED`, `OVERLOADED`, or `UNKNOWN`

Stage budget breach detection is enabled in `processing/metrics.py`:

- `parser`: 1.0 ms
- `calibration`: 0.5 ms
- `filter`: 2.0 ms
- `detector`: 10.0 ms
- `total`: 20.0 ms

When a stage average exceeds budget:

- Headless logs append `[BREACH: ...]`
- Matplotlib footer adds `[!]` next to breached stages
- VTK overlay shows `[!] stage avg > budget`

## What To Copy Or Upload

Include:

- `esp_32/`
- `ESP32/`
- `python_receiver.py`
- `README.md`

Exclude generated folders such as:

- `.pio/`
- `.vscode/`
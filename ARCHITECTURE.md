# DensePose Receiver Architecture (M2 Freeze)

This document freezes the receiver architecture after live acquisition, recording, replay, and validation reached stable operation.

## System Flow

```text
ESP32-S3 Left/Right
      |
      +--> SerialSource ------------------------------+
      |                                               |
      +--> ReplaySource (optional)                    |
                                                      v
                                                PacketEvent Queue
                                                      |
                                              ProcessingPipeline
                                                      |
                     parser -> calibration -> filter -> detector
                                                      |
                                                      v
                                                   SceneFrame
                                                      |
                           +--------------------------+--------------------------+
                           |                                                     |
                      Matplotlib Visualizer                               VTK Visualizer
```

## Core Contracts

### PacketEvent
Location: models.py

Fields:
- timestamp: float
- port: string
- event_type: string (status, data, error)
- message: string
- source: string (serial, replay)

### SceneFrame
Location: models.py

Fields:
- timestamp: float
- points_by_port: map[port] -> (x, y, z)
- trails_by_port: map[port] -> tuple[(x, y, z), ...]
- motion_score: float
- confidence: float
- stage_timings_ms: map[stage] -> ms
- status_by_port: map[port] -> connected bool
- source: string

## Composition Root

python_receiver.py remains the composition root:
- Parse CLI arguments
- Choose data source (SerialSource or ReplaySource)
- Optionally attach JsonlRecorder
- Select visualizer backend (Matplotlib or VTK)
- Run headless/live loop

## Recording Workflow

1. Capture
2. Validate
3. Archive
4. Replay
5. Develop processing
6. Regression validate

## Validation Gate

validate_recording.py supports:
- malformed JSON detection
- timestamp monotonic checks (--check-monotonic)
- expected port/data checks (--strict-ports, --expected-ports)
- minimum duration checks (--min-duration)
- machine-readable summary (--json, --report)

## Milestones

M1
- Recording pipeline
- Validation gate
- Replay compatibility baseline

M2
- Modular I/O extraction
- Architecture freeze docs
- Parallel VTK renderer path

M3 (planned)
- Processing chain extraction (parser -> calibration -> filter -> detector)

M4 (planned)
- Stage-level timing metrics and dashboards

## Notes

- The VTK backend is parallel and optional; Matplotlib remains the default to preserve a known-good path.
- Source modules live in receiver_io/ to avoid collisions with Python's built-in io module.
- VTK supports optional side-by-side comparison mode using `--compare-replay`.
- MetricsObserver is post-processing instrumentation: it does not alter parser/calibration/filter/detector outputs.
- Rolling stage timing metrics and queue-lag health are surfaced in headless logs and VTK overlays.
- Queue lag is sampled for live serial sources; replay runs report health as UNKNOWN when no live lag samples exist.

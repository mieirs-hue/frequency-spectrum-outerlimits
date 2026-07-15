# Office Blueprint Tracker

Date opened: 2026-07-15
Workspace: security_densepose
Prepared from latest commit: b9f7262023711ca27cdcd61d786ded89b3db3e5b

## Goal
Characterize localization performance after mounting both ESP32 boards vertically and parallel to the wall.

## Current Transport Path (Verified)
- Sensor to host: USB serial from both ESP32 boards (default /dev/ttyACM0 and /dev/ttyACM1)
- Host to browser visual: local SSE stream from python_serial_bridge.py at http://127.0.0.1:8786/events
- Browser fallback path: direct Web Serial (Chromium-based browsers)

## Preflight Cleanup + Readiness
- [ ] Confirm no stale local edits: git status
- [ ] Confirm latest commit matches expected baseline
- [ ] Confirm both board ports are visible: /dev/ttyACM*
- [ ] Confirm no serial-port lock from other tools (browser serial tab, monitor, IDE monitor)
- [ ] Confirm visual server is reachable on http://127.0.0.1:8765
- [ ] Confirm bridge health: http://127.0.0.1:8786/health

## Physical + Geometry Verification
- [ ] Board A and Board B mounted vertically
- [ ] Both boards parallel to wall plane
- [ ] Anchor coordinates in software match mounted positions
- [ ] Wall/window orientation in visual matches room layout

## Characterization Sequence
### 1) Connectivity and stream integrity
- [ ] Both boards online continuously for 5 minutes
- [ ] No repeated disconnect/reconnect events
- [ ] Stable packet cadence from both ports

Observations:
- 

### 2) Empty-room baseline (noise profile)
- [ ] Capture baseline with no moving target
- [ ] Record baseline means for A and B
- [ ] Record baseline drift over 3 minutes

Metrics to log:
- baseline_A:
- baseline_B:
- baseline_drift_A:
- baseline_drift_B:

### 3) Stationary target at known ground-truth points
Use at least 6 points (corners + centerline).

| Point ID | Ground Truth (x,y,z) | Reported (x,y,z) | Error (ft) | Notes |
|---|---|---|---|---|
| P1 |  |  |  |  |
| P2 |  |  |  |  |
| P3 |  |  |  |  |
| P4 |  |  |  |  |
| P5 |  |  |  |  |
| P6 |  |  |  |  |

### 4) Motion characterization
- [ ] Slow walk path test
- [ ] Medium speed pass test
- [ ] Edge-of-room pass test

Metrics to log:
- jitter_stationary_ft_rms:
- motion_latency_ms:
- path_smoothness_notes:
- edge_tracking_dropouts:

### 5) Stability judgment
- [ ] Tracking remains stable under slow movement
- [ ] No excessive jitter at stationary points
- [ ] Latency acceptable for live monitoring
- [ ] Edge performance acceptable for room coverage

## Issue Classification (if instability appears)
- Calibration issue: baseline or anchor mismatch
- Filtering issue: insufficient smoothing or hysteresis
- Placement issue: antenna occlusion/multipath zone
- Synchronization issue: timing skew between board streams
- Algorithm issue: trilateration/position fusion instability

## Session Log
- Start time:
- End time:
- Operator:
- Firmware versions:
- Runtime command(s):

## Sign-off
- [ ] Characterization complete
- [ ] Follow-up actions captured
- [ ] Next revision focus selected

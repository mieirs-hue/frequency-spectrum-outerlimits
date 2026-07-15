# footprint_visual_model

State-space footprint visual prototype for FSSC.

## What It Does
- Separates reference/baseline from live target state.
- Uses two-board trilateration on a 2D room plane.
- Smooths target coordinates with EMA (StatefulVector).
- Keeps path history (last N points) as a footprint trail.
- Uses ghost fade instead of abrupt disappearance when confidence drops.
- Supports simulation mode and optional bridge mode.

## Run
From repo root:

```bash
python3 -m http.server 8765 --bind 127.0.0.1
```

Open:
- http://127.0.0.1:8765/footprint_visual_model/

## Notes
- Bridge mode expects SSE from `http://127.0.0.1:8786/events` and parses `CSI,NODE_*` motion lines.
- In bridge mode, raw board motion is converted to pseudo-distance for visualization.
- Room plane is normalized to `10ft x 10ft`.

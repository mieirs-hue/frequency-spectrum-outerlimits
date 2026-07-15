# footprint_visual_model

Lightweight visual model for fixed vertical ESP32 Board A/B placement.

## What It Does
- Removes layered/overlapping monitor surfaces and 3D renderer load.
- Draws a single focus map of a 12ft x 12ft room.
- Keeps Board A and Board B in fixed north-wall positions.
- Fuses two board distance estimates into one target point with capped trail history.
- Supports live bridge mode and simulation mode.

## Run
From repo root:

```bash
python3 -m http.server 8765 --bind 127.0.0.1
```

Open:
- http://127.0.0.1:8765/densepose_web_visual.html
- http://127.0.0.1:8765/footprint_visual_model/

## Notes
- Live mode consumes SSE packets from `http://127.0.0.1:8786/events`.
- Rendering is intentionally simple to reduce memory pressure on Jetson.
- Trail and packet state are hard-capped to prevent unbounded browser memory growth.

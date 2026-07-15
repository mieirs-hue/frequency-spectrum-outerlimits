# Operations SOP

## CSI Payload Format In Firmware

Current board firmware emits:
- POSE lines: `POSE,x,y,z,n`
- CSI key/value lines: `CSI,NODE_*,motion=...,energy=...,rssi=...,len=...`
- heartbeat lines: `SIGNAL`

This means the active format is CSI-prefixed key/value plus pose tuples.

## Live (headless capture)
```bash
python3 python_receiver.py --headless --duration 3600 --log-file /tmp/security_densepose_business_baseline_1h.jsonl
```

## Replay (deterministic validation)
```bash
python3 python_receiver.py --headless --replay /tmp/security_densepose_business_baseline_1h.jsonl --replay-speed max --duration 120
```

## Soak (long-run stability)
```bash
python3 python_receiver.py --headless --soak --soak-output /tmp/m3_soak_8h.jsonl --soak-interval 5 --duration 28800
```

## Characterization Workflow (Baseline Before Algorithm Changes)

### 1) Baseline capture (no motion, 60-120s)
```bash
./scripts/run_csi_characterization.sh baseline 120
```

### 2) Repeatable motion capture
```bash
./scripts/run_csi_characterization.sh motion 120
```

### 3) Long-run soak stability (30-60 min)
```bash
./scripts/run_csi_characterization.sh soak 3600
```

Each run writes:
- raw JSONL packets
- validation report (port checks, monotonic timestamps)
- analysis report (mean/variance, packet stability, drift/gaps, noise floor, SNR, estimated motion latency, update rate)

Manual analyzer usage:
```bash
python3 scripts/analyze_csi_recording.py /path/to/capture.jsonl --report /tmp/capture.analysis.json
```

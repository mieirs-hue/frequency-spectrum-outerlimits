# Operations SOP

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

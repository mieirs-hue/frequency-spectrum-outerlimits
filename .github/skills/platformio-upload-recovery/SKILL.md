---
name: platformio-upload-recovery
description: "Recover failed PlatformIO uploads on Windows for Arduino Nano ESP32. Use when upload fails at DFU handoff, COM port appears busy/unavailable, verbose upload output is missing, or pio upload overrides are unsupported. Produces a clean pass/fail result with the next blocking cause."
argument-hint: "Project path and COM port, for example: esp_32 COM7"
user-invocable: true
---

# PlatformIO Upload Recovery (Windows)

## What This Skill Produces

A deterministic upload diagnosis and recovery flow for PlatformIO projects, ending in one of two outcomes:
- Upload success confirmed.
- Single remaining blocker identified with exact next action.

## When to Use

Use this skill when working with Arduino Nano ESP32 and PlatformIO on Windows and you see any of these patterns:
- DFU handoff/upload-mode detection failures.
- COM port busy or intermittently unavailable.
- `pio run` appears to return empty or incomplete output.
- Command-line `--project-option` override is rejected for upload protocol changes.

## Inputs

- PlatformIO project path. In this repo, default to one of:
  - `c:\Users\Authorized User\OneDrive\Desktop\security_densepose\esp_32`
  - `c:\Users\Authorized User\OneDrive\Desktop\security_densepose\ESP32`
- Upload port, for example `COM7`

## Procedure

1. Run direct upload with explicit project path (no shell directory change).

```powershell
$pio = Join-Path $env:USERPROFILE ".platformio\penv\Scripts\pio.exe"
& $pio run -d "<PROJECT_PATH>" -t upload --upload-port <COM_PORT>
```

2. Branch on result.

- Build fails before upload:
  - Stop upload troubleshooting.
  - Fix compile/config issues first, then retry step 1.

- Upload fails at DFU handoff or mode detection:
  - Default fallback: force serial uploader by setting `upload_protocol = esptool` in project `platformio.ini` under the active environment.
  - Retry step 1.

- Attempt to set protocol via CLI override fails (unsupported for this run mode):
  - Persist fallback in `platformio.ini` instead of using `--project-option`.
  - Retry step 1.

- Output is empty/ambiguous:
  - Sanity check CLI.
  - Run verbose upload to force complete logs.

```powershell
& $pio --version
& $pio run -v -d "<PROJECT_PATH>" -t upload --upload-port <COM_PORT>
```

- Upload fails with port busy/unavailable:
  - Enumerate live ports.

```powershell
& $pio device list
```

  - If target port is present but busy:
    - Close VS Code Serial Monitor / PlatformIO Monitor / Arduino Serial Monitor.
    - Stop local serial consumers (for example Python receiver scripts).
    - Replug USB cable and press reset once (double-press if needed).
    - Retry step 1 immediately.

  - If target port is missing:
    - Replug cable, confirm board detection in Device Manager, then retry `pio device list` and step 1.

3. Repeat until one terminal outcome is reached.

## Quality Checks

Declare success only when all checks pass:
- Build completes successfully.
- Upload command returns explicit success (for example, writing/verify completed with no serial open errors).
- No active COM-port lock errors remain.

Declare blocked only when one concrete blocker remains, such as:
- Port lock by another process.
- Cable/driver/device enumeration issue.
- Board not entering expected upload/reset state.

## Output Format

Report status in this order:
1. Current upload result (pass/fail).
2. What is already confirmed working (build, protocol selection, port detection).
3. Exact next action to unblock.

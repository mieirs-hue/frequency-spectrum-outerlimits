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

## Python Receiver

Update the `PORT` value in `python_receiver.py` for the target machine, then run the script to read serial output from the board.

## What To Copy Or Upload

Include:

- `esp_32/`
- `ESP32/`
- `python_receiver.py`
- `README.md`

Exclude generated folders such as:

- `.pio/`
- `.vscode/`
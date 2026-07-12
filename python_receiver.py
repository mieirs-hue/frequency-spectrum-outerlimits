import serial

PORT = "/dev/ttyACM0"
BAUD = 115200

try:
    ser = serial.Serial(PORT, BAUD, timeout=1)
    print(f"Listening on {PORT}...")

    while True:
        if ser.in_waiting:
            line = ser.readline().decode("utf-8", errors="replace").strip()
            print(f"Received: {line}")

except KeyboardInterrupt:
    print("\nStopping...")

finally:
    try:
        ser.close()
    except Exception:
        pass

import threading
import time

import serial

from models import PacketEvent


class SerialReader(threading.Thread):
    def __init__(self, port, baud, output_queue, reconnect_delay_seconds=1.0, source="serial"):
        super().__init__(daemon=True)
        self.port = port
        self.baud = baud
        self.output_queue = output_queue
        self.reconnect_delay_seconds = reconnect_delay_seconds
        self.source = source
        self.stop_event = threading.Event()

    def emit(self, event_type, message):
        self.output_queue.put(PacketEvent(time.time(), self.port, event_type, message, source=self.source))

    def run(self):
        while not self.stop_event.is_set():
            serial_handle = None
            try:
                serial_handle = serial.Serial(self.port, self.baud, timeout=1)
                self.emit("status", "connected")

                while not self.stop_event.is_set():
                    raw_line = serial_handle.readline()
                    if not raw_line:
                        continue
                    text = raw_line.decode("utf-8", errors="replace").strip()
                    self.emit("data", text)

            except serial.SerialException as exc:
                self.emit("error", str(exc))
                time.sleep(self.reconnect_delay_seconds)
            except Exception as exc:
                self.emit("error", f"Unexpected error: {exc}")
                time.sleep(self.reconnect_delay_seconds)
            finally:
                if serial_handle is not None:
                    try:
                        serial_handle.close()
                    except Exception:
                        pass
                self.emit("status", "disconnected")

    def stop(self):
        self.stop_event.set()

import os
import queue

from receiver_io.serial_reader import SerialReader


class SerialSource:
    def __init__(self, ports, baud, output_queue=None, reconnect_delay_seconds=1.0, source_name="serial"):
        self.ports = list(ports)
        self.baud = baud
        self.output_queue = output_queue or queue.Queue()
        self.reconnect_delay_seconds = reconnect_delay_seconds
        self.source_name = source_name
        self.readers = []

    @staticmethod
    def detect_acm_ports(limit=2):
        ports = []
        try:
            from serial.tools import list_ports

            discovered = sorted((p.device for p in list_ports.comports() if "ttyACM" in p.device))
            ports = discovered[:limit]
        except Exception:
            for idx in range(10):
                candidate = f"/dev/ttyACM{idx}"
                if os.path.exists(candidate):
                    ports.append(candidate)
                if len(ports) >= limit:
                    break
        return ports

    @classmethod
    def resolve_requested_ports(cls, requested_ports, default_ports, detect_limit=2):
        if requested_ports:
            return list(requested_ports)

        detected = cls.detect_acm_ports(limit=detect_limit)
        if len(detected) >= 2:
            return detected
        return list(default_ports)

    def start(self):
        self.readers = []
        for port in self.ports:
            reader = SerialReader(
                port,
                self.baud,
                self.output_queue,
                reconnect_delay_seconds=self.reconnect_delay_seconds,
                source=self.source_name,
            )
            self.readers.append(reader)
            reader.start()

    def stop(self):
        for reader in self.readers:
            reader.stop()

    def get_queue(self):
        return self.output_queue

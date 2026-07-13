import json
from dataclasses import asdict


class JsonlRecorder:
    def __init__(self, path):
        self.path = path
        self.handle = open(path, "a", encoding="utf-8")

    def write(self, event):
        self.handle.write(json.dumps(asdict(event), separators=(",", ":")) + "\n")
        self.handle.flush()

    def close(self):
        try:
            self.handle.close()
        except Exception:
            pass

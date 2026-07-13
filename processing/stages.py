from collections import deque
import re


class ParserStage:
    _NUMBER_RE = re.compile(r"[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?")

    def run(self, event):
        point = None
        is_signal = False

        if event.event_type == "data":
            text = (event.message or "").strip()
            if text:
                fields = [field.strip() for field in text.split(",")]
                if len(fields) >= 3:
                    try:
                        point = (float(fields[0]), float(fields[1]), float(fields[2]))
                    except ValueError:
                        point = None

                if point is None:
                    numbers = self._NUMBER_RE.findall(text)
                    if len(numbers) >= 3:
                        try:
                            point = (float(numbers[0]), float(numbers[1]), float(numbers[2]))
                        except ValueError:
                            point = None

                letters = "".join(ch for ch in text.upper() if "A" <= ch <= "Z")
                if letters:
                    target = "SIGNAL"
                    index = 0
                    for ch in letters:
                        if index < len(target) and ch == target[index]:
                            index += 1
                    is_signal = index >= 5

        return {
            "event": event,
            "point": point,
            "is_signal": is_signal,
        }


class CalibrationStage:
    def __init__(self, axis_limits):
        self.axis_limits = dict(axis_limits)

    def run(self, parsed):
        point = parsed.get("point")
        if point is None:
            return parsed

        x, y, z = point
        xmin, xmax = self.axis_limits.get("x", (-1.0, 1.0))
        ymin, ymax = self.axis_limits.get("y", (-1.0, 1.0))
        zmin, zmax = self.axis_limits.get("z", (0.0, 2.0))

        x = max(xmin, min(xmax, x))
        y = max(ymin, min(ymax, y))
        z = max(zmin, min(zmax, z))

        out = dict(parsed)
        out["point"] = (x, y, z)
        return out


class FilterStage:
    def __init__(self, window_size=3):
        self.window_size = max(1, int(window_size))
        self._windows = {}

    def run(self, calibrated):
        event = calibrated["event"]
        point = calibrated.get("point")
        if point is None:
            return calibrated

        window = self._windows.get(event.port)
        if window is None:
            window = deque(maxlen=self.window_size)
            self._windows[event.port] = window

        window.append(point)
        xs = [p[0] for p in window]
        ys = [p[1] for p in window]
        zs = [p[2] for p in window]
        filtered = (sum(xs) / len(xs), sum(ys) / len(ys), sum(zs) / len(zs))

        out = dict(calibrated)
        out["point"] = filtered
        return out


class DetectorStage:
    def __init__(self, signal_window_seconds=2.5):
        self.signal_window_seconds = float(signal_window_seconds)
        self.signal_times = {}

    def run(self, filtered):
        event = filtered["event"]
        timestamps = self.signal_times.get(event.port)
        if timestamps is None:
            timestamps = deque(maxlen=500)
            self.signal_times[event.port] = timestamps

        if filtered.get("is_signal"):
            timestamps.append(event.timestamp)

        cutoff = event.timestamp - self.signal_window_seconds
        while timestamps and timestamps[0] < cutoff:
            timestamps.popleft()

        out = dict(filtered)
        out["signal_count"] = len(timestamps)
        return out

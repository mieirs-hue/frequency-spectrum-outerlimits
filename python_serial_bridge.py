#!/usr/bin/env python3
import argparse
import json
import os
import queue
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from receiver_io.serial_source import SerialSource


def parse_args():
    parser = argparse.ArgumentParser(description="Bridge local serial boards to browser clients over SSE.")
    parser.add_argument("--listen", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8786)
    parser.add_argument("--baud", type=int, default=115200)
    parser.add_argument("--ports", nargs="+", default=None, help="Serial ports to bridge")
    parser.add_argument("--max-hz", type=float, default=10.0, help="Maximum telemetry packet rate sent to SSE clients")
    return parser.parse_args()


def sse_message(event_name, payload):
    return f"event: {event_name}\ndata: {json.dumps(payload, separators=(',', ':'))}\n\n".encode("utf-8")


def main():
    args = parse_args()
    ports = SerialSource.resolve_requested_ports(args.ports, ["/dev/ttyACM0", "/dev/ttyACM1"], detect_limit=2)
    port_to_board = {port: chr(ord("A") + index) for index, port in enumerate(ports)}

    subscriber_lock = threading.Lock()
    subscribers = set()
    event_queue = queue.Queue()

    serial_source = SerialSource(ports, args.baud, output_queue=event_queue, source_name="bridge")
    serial_source.start()

    def broadcast(event_name, payload):
        message = sse_message(event_name, payload)
        with subscriber_lock:
            dead = []
            for subscriber in subscribers:
                try:
                    subscriber.put_nowait(message)
                except Exception:
                    dead.append(subscriber)
            for subscriber in dead:
                subscribers.discard(subscriber)

    max_hz = max(0.1, float(args.max_hz))
    flush_interval = 1.0 / max_hz

    def queue_pump():
        broadcast("ready", {"mode": "bridge", "ports": ports, "baud": args.baud})
        latest_by_board = {}
        dropped_by_board = {}
        last_flush = time.monotonic()
        while True:
            timeout = max(0.0, flush_interval - (time.monotonic() - last_flush))
            try:
                event = event_queue.get(timeout=timeout)
                payload = {
                    "timestamp": event.timestamp,
                    "port": event.port,
                    "board": port_to_board.get(event.port, "?"),
                    "event_type": event.event_type,
                    "message": event.message,
                    "source": event.source,
                }
                board_id = payload["board"]
                if board_id in latest_by_board:
                    dropped_by_board[board_id] = dropped_by_board.get(board_id, 0) + 1
                latest_by_board[board_id] = payload
            except queue.Empty:
                pass

            now = time.monotonic()
            if now - last_flush < flush_interval:
                continue

            if latest_by_board:
                boards = {}
                dropped_total = 0
                for board_id in sorted(latest_by_board.keys()):
                    boards[board_id] = dict(latest_by_board[board_id])
                    dropped_total += int(dropped_by_board.get(board_id, 0))

                outgoing = {
                    "timestamp": time.time(),
                    "event_type": "batch",
                    "boards": boards,
                    "dropped_packets": dropped_total,
                    "bridge_max_hz": max_hz,
                }
                broadcast("packet", outgoing)
                latest_by_board.clear()
                dropped_by_board.clear()

            last_flush = now

    class BridgeHandler(BaseHTTPRequestHandler):
        protocol_version = "HTTP/1.1"

        def log_message(self, format, *args):
            return

        def _send_cors_headers(self, content_type):
            self.send_response(200)
            self.send_header("Content-Type", content_type)
            self.send_header("Cache-Control", "no-cache, no-transform")
            self.send_header("Connection", "keep-alive")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")
            self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")

        def do_OPTIONS(self):
            self._send_cors_headers("text/plain; charset=utf-8")
            self.end_headers()

        def do_GET(self):
            if self.path.startswith("/health"):
                mem_total_kb = 0
                mem_available_kb = 0
                try:
                    with open("/proc/meminfo", "r", encoding="utf-8") as handle:
                        for line in handle:
                            if line.startswith("MemTotal:"):
                                mem_total_kb = int(line.split()[1])
                            elif line.startswith("MemAvailable:"):
                                mem_available_kb = int(line.split()[1])
                except Exception:
                    pass

                mem_used_kb = max(0, mem_total_kb - mem_available_kb)
                cpu_count = os.cpu_count() or 1
                load_1 = 0.0
                try:
                    load_1 = os.getloadavg()[0]
                except Exception:
                    pass

                cpu_load_pct_est = max(0.0, min(100.0, (load_1 / cpu_count) * 100.0))

                body = json.dumps(
                    {
                        "ok": True,
                        "ports": ports,
                        "bridge_max_hz": max_hz,
                        "cpu_load_pct_est": round(cpu_load_pct_est, 2),
                        "mem_total_mb": round(mem_total_kb / 1024.0, 1),
                        "mem_used_mb": round(mem_used_kb / 1024.0, 1),
                    }
                ).encode("utf-8")
                self._send_cors_headers("application/json; charset=utf-8")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
                return

            if self.path.startswith("/events"):
                self._send_cors_headers("text/event-stream; charset=utf-8")
                self.send_header("X-Accel-Buffering", "no")
                self.end_headers()

                client_queue = queue.Queue()
                with subscriber_lock:
                    subscribers.add(client_queue)

                try:
                    self.wfile.write(b": connected\n\n")
                    self.wfile.flush()
                    while True:
                        try:
                            message = client_queue.get(timeout=15)
                        except queue.Empty:
                            self.wfile.write(b": ping\n\n")
                            self.wfile.flush()
                            continue

                        self.wfile.write(message)
                        self.wfile.flush()
                except Exception:
                    pass
                finally:
                    with subscriber_lock:
                        subscribers.discard(client_queue)
                return

            self._send_cors_headers("text/plain; charset=utf-8")
            body = b"DensePose serial bridge"
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

    threading.Thread(target=queue_pump, daemon=True).start()
    server = ThreadingHTTPServer((args.listen, args.port), BridgeHandler)
    print(f"Serial bridge listening on http://{args.listen}:{args.port}/events for {', '.join(ports)}")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        serial_source.stop()
        server.server_close()


if __name__ == "__main__":
    main()
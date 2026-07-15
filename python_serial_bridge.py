#!/usr/bin/env python3
import argparse
import json
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

    def queue_pump():
        broadcast("ready", {"mode": "bridge", "ports": ports, "baud": args.baud})
        while True:
            event = event_queue.get()
            payload = {
                "timestamp": event.timestamp,
                "port": event.port,
                "board": port_to_board.get(event.port, "?"),
                "event_type": event.event_type,
                "message": event.message,
                "source": event.source,
            }
            broadcast("packet", payload)

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
                body = json.dumps({"ok": True, "ports": ports}).encode("utf-8")
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
#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="/home/unclejesse/security_densepose"
PORT="8765"
URL="http://127.0.0.1:${PORT}/densepose_web_visual.html"
BRIDGE_PORT="8786"
BRIDGE_URL="http://127.0.0.1:${BRIDGE_PORT}/events"
BRIDGE_HEALTH_URL="http://127.0.0.1:${BRIDGE_PORT}/health"

find_browser() {
  for candidate in chromium-browser chromium google-chrome google-chrome-stable; do
    if command -v "${candidate}" >/dev/null 2>&1; then
      printf '%s' "${candidate}"
      return 0
    fi
  done

  return 1
}

if ! curl -fsS "${URL}" >/dev/null 2>&1; then
  if ! pgrep -f "python3 -m http.server ${PORT} --bind 127.0.0.1" >/dev/null 2>&1; then
    nohup python3 -m http.server "${PORT}" --bind 127.0.0.1 > /tmp/densepose_web_visual_server.log 2>&1 &
    sleep 1
  fi
fi

if ! curl -fsS "${BRIDGE_HEALTH_URL}" >/dev/null 2>&1; then
  PYTHON_BIN="${REPO_DIR}/.venv/bin/python"
  if [[ ! -x "${PYTHON_BIN}" ]]; then
    PYTHON_BIN="python3"
  fi

  if ! pgrep -f "python_serial_bridge.py --listen 127.0.0.1 --port ${BRIDGE_PORT}" >/dev/null 2>&1; then
    nohup "${PYTHON_BIN}" "${REPO_DIR}/python_serial_bridge.py" --listen 127.0.0.1 --port "${BRIDGE_PORT}" --ports /dev/ttyACM0 /dev/ttyACM1 > /tmp/densepose_serial_bridge.log 2>&1 &
    sleep 1
  fi
fi

cd "${REPO_DIR}"
export DISPLAY="${DISPLAY:-:1}"

BROWSER="$(find_browser)"
if [[ -z "${BROWSER}" ]]; then
  echo "No Chromium-family browser found. Install chromium-browser, chromium, or google-chrome, then retry." >&2
  exit 1
fi

exec "${BROWSER}" --new-window --app="${URL}" "${URL}"
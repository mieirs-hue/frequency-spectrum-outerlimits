#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="/home/unclejesse/security_densepose"
PYTHON_BIN="${REPO_DIR}/.venv/bin/python"

if [[ ! -x "${PYTHON_BIN}" ]]; then
  PYTHON_BIN="python3"
fi

MODE="${1:-baseline}"
DURATION="${2:-90}"
STAMP="$(date +%Y%m%d_%H%M%S)"
OUT_DIR="${REPO_DIR}/rf_events/characterization"
mkdir -p "${OUT_DIR}"

LOG_FILE="${OUT_DIR}/${STAMP}_${MODE}.jsonl"
VALIDATE_REPORT="${OUT_DIR}/${STAMP}_${MODE}.validate.json"
ANALYSIS_REPORT="${OUT_DIR}/${STAMP}_${MODE}.analysis.json"

case "${MODE}" in
  baseline)
    echo "Running baseline capture (${DURATION}s): no motion in sensing area."
    ;;
  motion)
    echo "Running motion capture (${DURATION}s)."
    echo "Use repeatable sequence:"
    echo "1) wave one hand through sensing region"
    echo "2) walk across board-to-board line at constant speed"
    echo "3) pause 5-10s"
    echo "4) repeat opposite direction"
    ;;
  soak)
    echo "Running soak capture (${DURATION}s): long-run stability test."
    ;;
  *)
    echo "Usage: $0 [baseline|motion|soak] [duration_seconds]"
    exit 2
    ;;
esac

cd "${REPO_DIR}"
"${PYTHON_BIN}" python_receiver.py --headless --duration "${DURATION}" --log-file "${LOG_FILE}"

set +e
"${PYTHON_BIN}" validate_recording.py "${LOG_FILE}" \
  --check-monotonic \
  --strict-ports \
  --min-duration 10 \
  --report "${VALIDATE_REPORT}"
VALIDATE_EXIT=$?
set -e

"${PYTHON_BIN}" scripts/analyze_csi_recording.py "${LOG_FILE}" --report "${ANALYSIS_REPORT}"

echo "Capture complete"
echo "Raw log: ${LOG_FILE}"
echo "Validation: ${VALIDATE_REPORT}"
echo "Analysis: ${ANALYSIS_REPORT}"

if [[ ${VALIDATE_EXIT} -ne 0 ]]; then
  echo "Validation reported issues (exit=${VALIDATE_EXIT}); see report for details."
fi

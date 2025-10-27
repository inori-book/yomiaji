#!/usr/bin/env bash
set -euo pipefail

PY_HOST="127.0.0.1"
PY_PORT="${PY_PORT:-8001}"
NEXT_PORT="${PORT:-3000}"
HEALTH_URL="http://$PY_HOST:$PY_PORT/health"

log(){ echo "[start] $*" >&2; }

log "Node: $(node -v 2>/dev/null || echo missing)"
log "Python: $(python3 -V 2>/dev/null || echo missing)"
log "Pip: $(python3 -m pip --version 2>/dev/null || echo missing)"

python3 - <<'PY' || { echo "[start] Python import FAILED"; exit 1; }
import sys
print("PY_EXE:", sys.executable, flush=True)
try:
    import numpy, pandas, fastapi, uvicorn
    import MeCab
    print("NUMPY:", numpy.__version__, "PANDAS:", pandas.__version__, flush=True)
    print("FASTAPI:", fastapi.__version__, "UVICORN:", uvicorn.__version__, flush=True)
    print("MECAB: OK", flush=True)
except Exception as e:
    print("IMPORT_ERR:", repr(e), flush=True)
    raise
PY

log "Starting Python API on ${PY_HOST}:${PY_PORT}"
uvicorn python.app:app --host "$PY_HOST" --port "$PY_PORT" --log-level info &
PY_PID=$!

for i in $(seq 1 10); do
  sleep 2
  if curl -fsS "$HEALTH_URL" >/dev/null; then
    log "Python API is up: $HEALTH_URL"
    break
  fi
  if ! kill -0 "$PY_PID" 2>/dev/null; then
    log "Python API process exited early"
    wait "$PY_PID" || true
    exit 1
  fi
  log "Waiting Python API... ($i/10)"
done
curl -fsS "$HEALTH_URL" || { log "Health check failed"; exit 1; }

log "Installing Node deps (if needed)"
if command -v yarn >/dev/null 2>&1; then
  yarn install --frozen-lockfile || yarn install
  log "Building static export (memory optimized)"
  NODE_OPTIONS="--max-old-space-size=256 --max-semi-space-size=32" yarn build
  log "Starting static server on :$NEXT_PORT"
  # Use a simple static server
  npx serve out -p "$NEXT_PORT" &
  WEB_PID=$!
else
  npm ci || npm i
  NODE_OPTIONS="--max-old-space-size=256 --max-semi-space-size=32" npm run build
  npx serve out -p "$NEXT_PORT" &
  WEB_PID=$!
fi

trap 'log "Shutting down"; kill $PY_PID $WEB_PID 2>/dev/null || true' INT TERM
wait -n $PY_PID $WEB_PID
log "A child process exited; terminating the other."
kill $PY_PID $WEB_PID 2>/dev/null || true
wait || true
exit 1
#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SESSION_NAME="analyser-lark-gateway"
PID_FILE="$ROOT_DIR/.gateway/gateway.pid"

stop_gateway() {
  if [[ -f "$PID_FILE" ]]; then
    pid="$(cat "$PID_FILE")"
    if kill -0 "$pid" >/dev/null 2>&1; then
      kill -TERM "$pid"
      for _ in 1 2 3 4 5; do
        kill -0 "$pid" >/dev/null 2>&1 || break
        sleep 1
      done
    fi
    rm -f "$PID_FILE"
  fi
  screen -S "$SESSION_NAME" -X quit >/dev/null 2>&1 || true
}

case "${1:-}" in
  start)
    stop_gateway
    printf -v command 'cd %q && echo $$ > .gateway/gateway.pid && exec node dist/src/gateway/index.js >> .gateway/stdout.log 2>> .gateway/stderr.log' "$ROOT_DIR"
    mkdir -p "$ROOT_DIR/.gateway"
    screen -DmS "$SESSION_NAME" /bin/zsh -lc "$command"
    ;;
  stop)
    stop_gateway
    ;;
  status)
    screen -ls | grep -F "$SESSION_NAME" || true
    "$ROOT_DIR/node_modules/.bin/lark-cli" event status
    ;;
  *)
    echo "Usage: $0 {start|stop|status}" >&2
    exit 2
    ;;
esac

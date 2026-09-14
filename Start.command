#!/bin/bash
cd "$(dirname "$0")" || exit 1
PORT="${PORT:-3000}"
if command -v node >/dev/null 2>&1; then
  (sleep 1; open "http://localhost:$PORT") &
  PORT="$PORT" node scripts/server.mjs
elif command -v python3 >/dev/null 2>&1; then
  echo "Starting local preview with Python. No information is sent to Barsys."
  (sleep 1; open "http://localhost:$PORT") &
  python3 -m http.server "$PORT" --bind 127.0.0.1
else
  echo "Opening the local project. Event films are bundled. Menu covers load from Barsys until npm run assets is run."
  open index.html
fi

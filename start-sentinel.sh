#!/bin/bash
export PATH="/opt/homebrew/bin:/opt/homebrew/opt/postgresql@16/bin:$PATH"
cd "$(dirname "$0")/barsys-sentinel"
exec npm run dev -- --port 3460

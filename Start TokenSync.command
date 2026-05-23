#!/bin/bash
cd "$(dirname "$0")"
PORT=3001
URL="http://127.0.0.1:${PORT}/?v=$(date +%s)"

echo "============================================"
echo " TokenSync"
echo " URL: $URL"
echo "============================================"

if [ ! -d "server/node_modules" ]; then
  echo "Installiere Abhängigkeiten…"
  npm run setup
fi

echo "Stoppe alten Server auf Port $PORT…"
lsof -ti:"$PORT" | xargs kill -9 2>/dev/null
sleep 1

echo "Starte Server…"
npm run dev >> /tmp/tokensync-dev.log 2>&1 &
SRV_PID=$!

for i in 1 2 3 4 5 6 7 8 9 10; do
  if curl -sf "http://127.0.0.1:${PORT}/api/health" >/dev/null 2>&1; then
    echo "Server bereit."
    open "$URL"
    echo ""
    echo "Browser geöffnet. Wenn die Seite WEISS ist:"
    echo "  → Diese URL kopieren: $URL"
    echo "  → NICHT index.html im Finder öffnen"
    echo ""
    echo "Log: /tmp/tokensync-dev.log"
    exit 0
  fi
  sleep 1
done

echo "FEHLER: Server startet nicht. Log:"
tail -20 /tmp/tokensync-dev.log
kill "$SRV_PID" 2>/dev/null
exit 1

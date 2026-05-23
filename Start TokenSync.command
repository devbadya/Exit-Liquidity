#!/bin/bash
cd "$(dirname "$0")"
echo "TokenSync — starte Server auf http://localhost:3001"
if [ ! -d "server/node_modules" ]; then
  npm run setup
fi
if ! lsof -ti:3001 >/dev/null 2>&1; then
  npm run dev &
  sleep 2
fi
open "http://localhost:3001"
echo "Fertig. Browser sollte sich öffnen. Terminal offen lassen."

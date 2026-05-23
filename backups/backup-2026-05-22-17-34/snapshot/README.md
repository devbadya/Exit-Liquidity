# TokenSync — Crypto Intelligence

Informationsplattform mit **Crypto News** (8+ RSS-Quellen, 60s Refresh) und **Fear & Greed Hub** (Alternative.me + CoinGecko).

## Start

```bash
# Root (installiert concurrently)
npm install

# Server & Client Dependencies (falls noch nicht)
cd server && npm install && cd ../client && npm install && cd ..

# Beides parallel starten
npm run dev
```

- Frontend: http://localhost:5173
- API: http://localhost:3001

## Struktur

- `client/` — React + Vite + Tailwind
- `server/` — Express API, Aggregator, Cron
- `PROJECT_PLAN.md` — Roadmap
- `WORKFLOW.md` — Security & Backup nach Tasks

## Hinweis

Keine Anlageberatung. News verlinken zur Originalquelle.

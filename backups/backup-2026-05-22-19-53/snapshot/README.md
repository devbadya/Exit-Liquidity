# TokenSync — Crypto Intelligence

Informationsplattform mit **Crypto News** (8+ RSS-Quellen, 60s Refresh) und **Fear & Greed Hub** (Alternative.me + CoinGecko).

**Frontend:** HTML, CSS, JavaScript (`public/`)  
**Backend:** Node.js + Express (`server/`)

## Start

```bash
cd server && npm install && cd ..
npm run dev
```

Öffne **http://localhost:3001**

## Struktur

- `public/` — **HTML / CSS / JS** (Haupt-UI)
  - `index.html`
  - `css/styles.css`
  - `js/app.js`, `api.js`, `components.js`, `utils.js`
- `server/` — API, Aggregator, Cron, statische Dateien
- `client/` — altes React-Projekt (optional, nicht mehr Standard)

## Hinweis

Keine Anlageberatung. News verlinken zur Originalquelle.

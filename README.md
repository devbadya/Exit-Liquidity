# TokenSync — Crypto Intelligence

Informationsplattform mit **Crypto News** (8+ RSS-Quellen, 60s Refresh) und **Fear & Greed Hub** (Alternative.me + CoinGecko).

**Frontend:** HTML, CSS, JavaScript (`public/`)  
**Backend:** Node.js + Express (`server/`)

## API-Keys (beide aktiv)

In `server/.env` — **beide Keys werden parallel genutzt:**

| Key | Quelle | Verwendung |
|-----|--------|--------------|
| `CMC_API_KEY` | CoinMarketCap | **Alle Coins** (`#/coins`) — bis 1000 Coins |
| `COINGECKO_API_KEY` | CoinGecko | **Markets Hub**, ASI, Average Crypto, F&G Marktdaten |

```env
CMC_API_KEY=dein_coinmarketcap_key
COINGECKO_API_KEY=CG-dein_coingecko_key
```

Status prüfen: `GET http://localhost:3001/api/status`

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

## Paper Trading

Simuliertes Perp-Terminal (Hyperliquid-Idee) mit **$10.000** Startkapital:

- `#/paper` — volles Terminal: **Kerzenchart**, Binance Live-Kurs, Trade-Panel, Portfolio
- `#/coins` — Menü **Tabelle** | **Live · 24h** (Auto-Refresh 30s, Top-Filter)
- Jede **Coin-Seite** (`#/coin/…`) — interaktiver Kerzenchart (Pan/Zoom) + Live-Update Mark-Preis (~3s)
- Coin- & andere Seiten — Multi-Source-Kurse (kein Trading-Panel)
- **Order-Typen:** Market, Limit, Stop
- **Hebel** 1×–50×, Größen-Slider, TP/SL %, Trailing (Strategie)
- **15+ Strategie-Presets** (Scalp, Swing, DCA, Grid, Breakout, Bracket, …)
- **Engine:** Limit-Fills, Liquidation, TP/SL, offene Orders
- Speicher: `localStorage` (`tokensync_paper_v2`)

## Hinweis

Keine Anlageberatung. Paper Trading ist Simulation, keine echten Orders. News verlinken zur Originalquelle.

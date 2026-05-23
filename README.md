# TokenSync — Crypto Intelligence

**Repository:** https://github.com/devbadya/Exit-Liquidity

Informationsplattform mit **Crypto News**, **Fear & Greed**, **Live-Kurse**, **Paper Trading** und CoinMarketCap-Liste.

> **Wichtig:** Die App läuft nur über den Dev-Server (`npm run dev`), nicht durch Doppelklick auf `index.html`.

## Schnellstart (von GitHub)

```bash
git clone https://github.com/devbadya/Exit-Liquidity.git
cd Exit-Liquidity
npm run setup
cp server/.env.example server/.env
# Keys in server/.env eintragen (siehe unten)
npm run dev
```

Im Browser öffnen: **http://localhost:3001**

## API-Keys

In `server/.env`:

```env
CMC_API_KEY=dein_coinmarketcap_key
COINGECKO_API_KEY=CG-dein_coingecko_key
```

| Key | Quelle | Verwendung |
|-----|--------|--------------|
| `CMC_API_KEY` | CoinMarketCap | Alle Coins (`#/coins`) |
| `COINGECKO_API_KEY` | CoinGecko | Markets, Charts, F&G |

Status: `GET http://localhost:3001/api/status`

## Features

- **Dashboard** — News, F&G, Marktüberblick
- **Markets** — Top Coins, ASI, Average Crypto
- **Alle Coins** — CMC-Liste, Live · 24h-Ansicht
- **Coin-Detail** — Multi-Source-Live-Kurse, Chart (1H–MAX, Pan/Zoom)
- **Paper Trading** (`#/paper`) — Binance Live, Kerzen, Perp-Simulation ($10k)

## Struktur

- `public/` — Frontend (HTML, CSS, JS)
- `server/` — Express API + statische Dateien

## Hinweis

Keine Anlageberatung. Paper Trading ist Simulation.

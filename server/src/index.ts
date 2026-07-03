import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import NodeCache from 'node-cache';
import cron from 'node-cron';
import path from 'path';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { aggregateNews } from './services/newsAggregator.js';
import { fetchFearGreedData } from './services/fearGreedService.js';
import { fetchMarketOverview } from './services/marketService.js';
import { fetchAllCmcCoins, fetchCmcLiveSnapshot, filterAndPaginateCoins } from './services/cmcService.js';
import { fetchCoinsFromCoinGecko } from './services/coinsFallbackService.js';
import { buildMarketOverviewFromCmc } from './services/marketFallbackService.js';
import { fetchCoinChart, VALID_CHART_RANGES, type ChartRange } from './services/coinChartService.js';
import { fetchLivePrice } from './services/livePriceService.js';
import { fetchBinanceLivePrice } from './services/binancePriceService.js';
import { loadSnapshot, saveSnapshot } from './lib/snapshotStore.js';
import type { FearGreedResponse, NewsResponse } from './types/index.js';
import type { MarketOverviewResponse } from './types/market.js';
import type { CmcCoin } from './types/cmc.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLIENT_DIST = path.resolve(__dirname, '../../client/dist');
const PUBLIC_DIR  = path.resolve(__dirname, '../../public');
const STATIC_DIR  = existsSync(path.join(CLIENT_DIST, 'index.html')) ? CLIENT_DIST : PUBLIC_DIR;
// Das Legacy-Frontend (public/) nutzt Inline-Scripts — nur dann CSP lockern
const LEGACY_STATIC = STATIC_DIR === PUBLIC_DIR;

const PORT = Number(process.env.PORT) || 3001;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:3001';

const app = express();
// TTL 0 = Daten verfallen nie: Wenn ein Refresh fehlschlägt, servieren wir
// die letzten guten Daten (stale) statt 503. Cron ersetzt sie bei Erfolg.
const cache = new NodeCache({ stdTTL: 0, useClones: false });

const newsCacheKey = 'news';
const fgCacheKey = 'fearGreed';
const marketCacheKey = 'markets';
const cmcCacheKey = 'cmcCoins';

interface DatasetHealth {
  lastSuccess: string | null;
  lastError: string | null;
  lastErrorAt: string | null;
  source: string | null;
}

const datasetHealth: Record<string, DatasetHealth> = {
  [newsCacheKey]: { lastSuccess: null, lastError: null, lastErrorAt: null, source: null },
  [fgCacheKey]: { lastSuccess: null, lastError: null, lastErrorAt: null, source: null },
  [marketCacheKey]: { lastSuccess: null, lastError: null, lastErrorAt: null, source: null },
  [cmcCacheKey]: { lastSuccess: null, lastError: null, lastErrorAt: null, source: null },
};

function recordSuccess(key: string, source: string): void {
  datasetHealth[key].lastSuccess = new Date().toISOString();
  datasetHealth[key].source = source;
}

function recordFailure(key: string, err: unknown): void {
  datasetHealth[key].lastError = err instanceof Error ? err.message : String(err);
  datasetHealth[key].lastErrorAt = new Date().toISOString();
}

function storeDataset<T>(key: string, data: T, source: string): void {
  cache.set(key, data);
  saveSnapshot(key, data);
  recordSuccess(key, source);
}

/** Warm-Start: letzte gute Daten von Disk laden, damit nach Neustart kein 503 kommt */
function loadPersistedSnapshots(): void {
  for (const key of [newsCacheKey, fgCacheKey, marketCacheKey, cmcCacheKey]) {
    const snap = loadSnapshot<unknown>(key);
    if (snap) {
      cache.set(key, snap.data);
      datasetHealth[key].lastSuccess = snap.savedAt;
      datasetHealth[key].source = 'disk-snapshot';
      console.log(`Snapshot geladen: ${key} (Stand ${snap.savedAt})`);
    }
  }
}

let newsRefreshing = false;
let fgRefreshing = false;
let marketRefreshing = false;
let cmcRefreshing = false;

async function refreshNews(): Promise<void> {
  if (newsRefreshing) return;
  newsRefreshing = true;
  try {
    const data = await aggregateNews();
    if (!data.articles.length) throw new Error('Keine Artikel von den RSS-Quellen erhalten');
    const payload: NewsResponse = {
      articles: data.articles,
      lastUpdated: new Date().toISOString(),
      sourcesActive: data.sourcesActive,
      totalFetched: data.totalFetched,
    };
    storeDataset(newsCacheKey, payload, 'rss');
  } catch (err) {
    recordFailure(newsCacheKey, err);
    console.warn('News refresh failed:', err instanceof Error ? err.message : err);
  } finally {
    newsRefreshing = false;
  }
}

async function refreshFearGreed(): Promise<void> {
  if (fgRefreshing) return;
  fgRefreshing = true;
  try {
    // fetchFearGreedData hat intern die Kette alternative.me → CMC → Composite
    const data = await fetchFearGreedData();
    storeDataset(fgCacheKey, data, data.current.source);
  } catch (err) {
    recordFailure(fgCacheKey, err);
    console.warn('Fear & Greed refresh failed:', err instanceof Error ? err.message : err);
  } finally {
    fgRefreshing = false;
  }
}

async function refreshMarkets(): Promise<void> {
  if (marketRefreshing) return;
  marketRefreshing = true;
  try {
    const data = await fetchMarketOverview();
    storeDataset(marketCacheKey, data, 'coingecko');
  } catch (err) {
    recordFailure(marketCacheKey, err);
    console.warn('Markets refresh (CoinGecko) failed:', err instanceof Error ? err.message : err);
    // Fallback: Überblick aus den gecachten CMC-Coins bauen
    const cmcCoins = cache.get<CmcCoin[]>(cmcCacheKey);
    if (cmcCoins?.length) {
      try {
        const fallback = buildMarketOverviewFromCmc(cmcCoins);
        storeDataset(marketCacheKey, fallback, 'coinmarketcap-fallback');
        console.log('Markets: Fallback aus CMC-Daten aktiv');
      } catch (fbErr) {
        console.warn('Markets CMC fallback failed:', fbErr instanceof Error ? fbErr.message : fbErr);
      }
    }
  } finally {
    marketRefreshing = false;
  }
}

async function refreshCmc(): Promise<void> {
  if (cmcRefreshing) return;
  cmcRefreshing = true;
  try {
    const coins = await fetchAllCmcCoins();
    if (!coins.length) throw new Error('CoinMarketCap lieferte keine Coins');
    storeDataset(cmcCacheKey, coins, 'coinmarketcap');
  } catch (err) {
    recordFailure(cmcCacheKey, err);
    console.warn('CMC refresh failed:', err instanceof Error ? err.message : err);
    // Fallback: gleiche Datenform aus CoinGecko
    try {
      const coins = await fetchCoinsFromCoinGecko(500);
      if (coins.length) {
        storeDataset(cmcCacheKey, coins, 'coingecko-fallback');
        console.log(`Coins: Fallback über CoinGecko aktiv (${coins.length} Coins)`);
      }
    } catch (fbErr) {
      console.warn('Coins CoinGecko fallback failed:', fbErr instanceof Error ? fbErr.message : fbErr);
    }
  } finally {
    cmcRefreshing = false;
  }
}

const isProd = process.env.NODE_ENV === 'production';

// Build allowed origins list — includes any value set via CLIENT_ORIGIN
const allowedOrigins = [
  CLIENT_ORIGIN,
  'http://127.0.0.1:3001',
  'http://localhost:3001',
].filter(Boolean);

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc:  ["'self'"],
        scriptSrc:   LEGACY_STATIC ? ["'self'", "'unsafe-inline'"] : ["'self'"],
        styleSrc:    ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc:     ["'self'", 'https://fonts.gstatic.com', 'data:'],
        imgSrc:      ["'self'", 'https:', 'data:'],
        connectSrc:  [
          "'self'",
          ...allowedOrigins,
          ...(isProd ? [] : ['ws://localhost:3001', 'ws://127.0.0.1:3001']),
        ],
      },
    },
  }),
);
app.use(
  cors({
    origin(origin, cb) {
      if (!origin) return cb(null, true); // server-to-server / curl
      if (
        allowedOrigins.includes(origin) ||
        /^https:\/\/.*\.railway\.app$/.test(origin) ||
        /^https:\/\/.*\.up\.railway\.app$/.test(origin)
      ) {
        return cb(null, true);
      }
      cb(new Error('CORS: origin not allowed'));
    },
    methods: ['GET'],
  }),
);
// Nur API-Routen limitieren — statische Assets (JS/CSS/Bilder) zählen sonst mit
// und ein normaler Seitenaufruf kann das Limit sprengen
app.use(
  '/api',
  rateLimit({
    windowMs: 60_000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

function datasetReport(key: string) {
  const health = datasetHealth[key];
  const hasData = cache.get(key) !== undefined;
  const ageSeconds = health.lastSuccess
    ? Math.round((Date.now() - new Date(health.lastSuccess).getTime()) / 1000)
    : null;
  return {
    available: hasData,
    source: health.source,
    lastSuccess: health.lastSuccess,
    ageSeconds,
    lastError: health.lastError,
    lastErrorAt: health.lastErrorAt,
  };
}

app.get('/api/health', (_req, res) => {
  const datasets = {
    news: datasetReport(newsCacheKey),
    fearGreed: datasetReport(fgCacheKey),
    markets: datasetReport(marketCacheKey),
    coins: datasetReport(cmcCacheKey),
  };
  const allAvailable = Object.values(datasets).every((d) => d.available);
  const anyAvailable = Object.values(datasets).some((d) => d.available);
  res.json({
    status: allAvailable ? 'ok' : anyAvailable ? 'degraded' : 'starting',
    datasets,
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/status', (_req, res) => {
  res.json({
    apis: {
      coinmarketcap: {
        configured: Boolean(process.env.CMC_API_KEY),
        cached: Boolean(cache.get<CmcCoin[]>(cmcCacheKey)?.length),
        endpoint: '/api/cmc/coins',
      },
      coingecko: {
        configured: Boolean(process.env.COINGECKO_API_KEY),
        cached: Boolean(cache.get<MarketOverviewResponse>(marketCacheKey)),
        endpoint: '/api/markets',
      },
      alternativeMe: { configured: true, endpoint: '/api/fear-greed' },
      binance: { configured: true, note: 'Spot Mid (Bid/Ask) + USDT/USDC' },
      uniswap: { configured: true, note: 'Uniswap v2/v3 via DexScreener (Ethereum)' },
      hyperliquid: { configured: true, note: 'Öffentliche Mid-Preise (Perp)' },
      rssNews: { configured: true, endpoint: '/api/news' },
    },
    datasets: {
      news: datasetReport(newsCacheKey),
      fearGreed: datasetReport(fgCacheKey),
      markets: datasetReport(marketCacheKey),
      coins: datasetReport(cmcCacheKey),
    },
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/news', (req, res) => {
  const cached = cache.get<NewsResponse>(newsCacheKey);
  const source = req.query.source as string | undefined;
  const category = req.query.category as string | undefined;

  if (!cached) {
    res.status(503).json({ error: 'News loading, retry shortly' });
    return;
  }

  let articles = cached.articles;
  if (source) articles = articles.filter((a) => a.sourceId === source);
  if (category) articles = articles.filter((a) => a.categories.includes(category));

  res.json({ ...cached, articles });
});

app.get('/api/fear-greed', (_req, res) => {
  const cached = cache.get<FearGreedResponse>(fgCacheKey);
  if (!cached) {
    res.status(503).json({ error: 'Fear & Greed loading, retry shortly' });
    return;
  }
  res.json(cached);
});

app.get('/api/cmc/summary', (_req, res) => {
  const cached = cache.get<CmcCoin[]>(cmcCacheKey);
  if (!cached?.length) {
    res.status(503).json({ error: 'CoinMarketCap-Daten werden geladen…' });
    return;
  }
  const totalMarketCap = cached.reduce((s, c) => s + c.marketCap, 0);
  const btc = cached.find((c) => c.symbol === 'BTC');
  const eth = cached.find((c) => c.symbol === 'ETH');
  const vol24h = cached.reduce((s, c) => s + c.volume24h, 0);
  res.json({
    totalMarketCap,
    totalVolume24h: vol24h,
    marketCapChange24h: btc?.change24h ?? 0,
    btcDominance: totalMarketCap && btc ? (btc.marketCap / totalMarketCap) * 100 : 0,
    ethDominance: totalMarketCap && eth ? (eth.marketCap / totalMarketCap) * 100 : 0,
    btcPrice: btc?.price ?? 0,
    btcChange24h: btc?.change24h ?? 0,
    coinCount: cached.length,
    source: datasetHealth[cmcCacheKey].source === 'coingecko-fallback' ? 'CoinGecko (Fallback)' : 'CoinMarketCap',
    lastUpdated: cached[0]?.lastUpdated ?? new Date().toISOString(),
  });
});

app.get('/api/coin/:slug', (req, res) => {
  const cached = cache.get<CmcCoin[]>(cmcCacheKey);
  const slug = req.params.slug.toLowerCase();
  const coin = cached?.find((c) => c.slug === slug || c.symbol.toLowerCase() === slug);
  if (!coin) {
    res.status(404).json({ error: 'Coin nicht gefunden' });
    return;
  }
  res.json(coin);
});

app.get('/api/coin/:slug/binance', async (req, res) => {
  const slug = req.params.slug.toLowerCase();
  const binanceCacheKey = `binance:${slug}`;
  const cachedBn = cache.get(binanceCacheKey);
  if (cachedBn) {
    res.json(cachedBn);
    return;
  }
  const cached = cache.get<CmcCoin[]>(cmcCacheKey);
  const coin = cached?.find((c) => c.slug === slug || c.symbol.toLowerCase() === slug);
  try {
    const bn = await fetchBinanceLivePrice(slug, coin);
    if (!bn) {
      res.status(404).json({
        error: `${coin?.symbol ?? slug} nicht auf Binance Spot (USDT/USDC)`,
      });
      return;
    }
    cache.set(binanceCacheKey, bn, 2);
    res.json(bn);
  } catch (err) {
    res.status(502).json({
      error: err instanceof Error ? err.message : 'Binance-Kurs nicht verfügbar',
    });
  }
});

app.get('/api/coin/:slug/live', async (req, res) => {
  const slug = req.params.slug.toLowerCase();
  const liveCacheKey = `live:${slug}`;
  const cachedLive = cache.get(liveCacheKey);
  if (cachedLive) {
    res.json(cachedLive);
    return;
  }
  const cached = cache.get<CmcCoin[]>(cmcCacheKey);
  const coin = cached?.find((c) => c.slug === slug || c.symbol.toLowerCase() === slug);
  try {
    const live = await fetchLivePrice(slug, coin);
    cache.set(liveCacheKey, live, 2);
    res.json(live);
  } catch (err) {
    res.status(502).json({
      error: err instanceof Error ? err.message : 'Live-Kurs nicht verfügbar',
    });
  }
});

app.get('/api/coin/:slug/chart', async (req, res) => {
  const range = (req.query.range as string) || '24h';
  if (!VALID_CHART_RANGES.includes(range as ChartRange)) {
    res.status(400).json({ error: 'Ungültiger Zeitraum' });
    return;
  }
  try {
    const slug = req.params.slug.toLowerCase();
    const chart = await fetchCoinChart(slug, range as ChartRange);
    res.json(chart);
  } catch (err) {
    res.status(502).json({
      error: err instanceof Error ? err.message : 'Chart konnte nicht geladen werden',
    });
  }
});

app.get('/api/cmc/list', (_req, res) => {
  const cached = cache.get<CmcCoin[]>(cmcCacheKey);
  if (!cached?.length) {
    res.status(503).json({ error: 'CoinMarketCap-Daten werden geladen…' });
    return;
  }
  res.json({
    coins: cached,
    total: cached.length,
    lastUpdated: cached[0]?.lastUpdated ?? new Date().toISOString(),
    source: datasetHealth[cmcCacheKey].source === 'coingecko-fallback' ? 'CoinGecko (Fallback)' : 'CoinMarketCap',
  });
});

app.get('/api/cmc/live', async (req, res) => {
  const limit = Math.min(200, Math.max(20, Number(req.query.limit) || 100));
  const liveCacheKey = `cmcLive:${limit}`;
  const cachedLive = cache.get(liveCacheKey);
  if (cachedLive) {
    res.json(cachedLive);
    return;
  }
  try {
    const coins = await fetchCmcLiveSnapshot(limit);
    const payload = {
      coins,
      total: coins.length,
      lastUpdated: new Date().toISOString(),
      source: 'CoinMarketCap',
      refreshSeconds: 30,
    };
    cache.set(liveCacheKey, payload, 30);
    const main = cache.get<CmcCoin[]>(cmcCacheKey);
    if (main?.length) {
      const byId = new Map(coins.map((c) => [c.id, c]));
      cache.set(
        cmcCacheKey,
        main.map((c) => (byId.has(c.id) ? { ...c, ...byId.get(c.id)! } : c)),
      );
    }
    res.json(payload);
  } catch (err) {
    // Fallback: letzte bekannte Liste ausliefern statt Fehler
    const main = cache.get<CmcCoin[]>(cmcCacheKey);
    if (main?.length) {
      res.json({
        coins: main.slice(0, limit),
        total: Math.min(limit, main.length),
        lastUpdated: main[0]?.lastUpdated ?? new Date().toISOString(),
        source: 'Cache (Live-Update nicht verfügbar)',
        refreshSeconds: 30,
      });
      return;
    }
    res.status(502).json({
      error: err instanceof Error ? err.message : 'Live-Update nicht verfügbar',
    });
  }
});

app.get('/api/cmc/coins', (req, res) => {
  const cached = cache.get<CmcCoin[]>(cmcCacheKey);
  if (!cached?.length) {
    res.status(503).json({ error: 'CoinMarketCap-Daten werden geladen…' });
    return;
  }
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(10, Number(req.query.limit) || 50));
  const search = (req.query.search as string) || undefined;
  const { items, total } = filterAndPaginateCoins(cached, { page, limit, search });
  res.json({
    coins: items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    lastUpdated: cached[0]?.lastUpdated ?? new Date().toISOString(),
    source: datasetHealth[cmcCacheKey].source === 'coingecko-fallback' ? 'CoinGecko (Fallback)' : 'CoinMarketCap',
  });
});

app.get('/api/markets', (_req, res) => {
  const cached = cache.get<MarketOverviewResponse>(marketCacheKey);
  if (!cached) {
    res.status(503).json({ error: 'Marktdaten werden geladen…' });
    return;
  }
  res.json(cached);
});

app.get('/api/fear-greed/history', (req, res) => {
  const cached = cache.get<FearGreedResponse>(fgCacheKey);
  const days = Math.min(90, Math.max(7, Number(req.query.days) || 30));
  if (!cached) {
    res.status(503).json({ error: 'Loading' });
    return;
  }
  res.json({
    range: `${days}d`,
    points: cached.history.slice(0, days),
  });
});

app.use(express.static(STATIC_DIR, {
  etag: true,
  setHeaders(res, filePath) {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  },
}));

app.use((req, res, next) => {
  if (req.method !== 'GET' || req.path.startsWith('/api')) {
    next();
    return;
  }
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(path.join(STATIC_DIR, 'index.html'));
});

cron.schedule('* * * * *', () => void refreshNews());
cron.schedule('*/5 * * * *', () => void refreshFearGreed());
cron.schedule('*/10 * * * *', () => void refreshMarkets());
cron.schedule('*/15 * * * *', () => void refreshCmc());

async function bootstrap() {
  loadPersistedSnapshots();
  app.listen(PORT, () => {
    console.log(`TokenSync → http://localhost:${PORT}`);
  });
  // CMC zuerst anstoßen, damit der Markets-Fallback notfalls Daten hat
  await refreshCmc();
  await Promise.allSettled([refreshNews(), refreshFearGreed(), refreshMarkets()]);
}

void bootstrap();

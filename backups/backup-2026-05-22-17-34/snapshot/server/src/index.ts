import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import NodeCache from 'node-cache';
import cron from 'node-cron';
import { aggregateNews } from './services/newsAggregator.js';
import { fetchFearGreedData } from './services/fearGreedService.js';
import type { FearGreedResponse, NewsResponse } from './types/index.js';

const PORT = Number(process.env.PORT) || 3001;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

const app = express();
const cache = new NodeCache();

const newsCacheKey = 'news';
const fgCacheKey = 'fearGreed';

let newsRefreshing = false;
let fgRefreshing = false;

async function refreshNews(): Promise<void> {
  if (newsRefreshing) return;
  newsRefreshing = true;
  try {
    const data = await aggregateNews();
    const payload: NewsResponse = {
      articles: data.articles,
      lastUpdated: new Date().toISOString(),
      sourcesActive: data.sourcesActive,
      totalFetched: data.totalFetched,
    };
    cache.set(newsCacheKey, payload, 120);
  } finally {
    newsRefreshing = false;
  }
}

async function refreshFearGreed(): Promise<void> {
  if (fgRefreshing) return;
  fgRefreshing = true;
  try {
    const data = await fetchFearGreedData();
    cache.set(fgCacheKey, data, 600);
  } finally {
    fgRefreshing = false;
  }
}

app.use(helmet());
app.use(
  cors({
    origin: [CLIENT_ORIGIN, 'http://127.0.0.1:5173'],
    methods: ['GET'],
  }),
);
app.use(
  rateLimit({
    windowMs: 60_000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
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

cron.schedule('* * * * *', () => void refreshNews());
cron.schedule('*/5 * * * *', () => void refreshFearGreed());

async function bootstrap() {
  await Promise.all([refreshNews(), refreshFearGreed()]);
  app.listen(PORT, () => {
    console.log(`TokenSync API → http://localhost:${PORT}`);
  });
}

void bootstrap();

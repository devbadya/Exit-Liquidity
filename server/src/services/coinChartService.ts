import NodeCache from 'node-cache';
import { coingeckoFetch } from './coingeckoClient.js';

const chartCache = new NodeCache({ stdTTL: 300 });

export type ChartRange = '1h' | '24h' | '7d' | '1m' | '3m' | 'ytd' | '1y' | 'max';

export const VALID_CHART_RANGES: ChartRange[] = [
  '1h',
  '24h',
  '7d',
  '1m',
  '3m',
  'ytd',
  '1y',
  'max',
];

const OHLC_DAYS: Partial<Record<ChartRange, string>> = {
  '7d': '7',
  '1m': '30',
  '3m': '90',
  '1y': '365',
};

export interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface CoinChartResponse {
  slug: string;
  range: ChartRange;
  candles: Candle[];
  currentPrice: number;
  changePercent: number;
  high: number;
  low: number;
  open: number;
  source: string;
}

function ytdDayCount(): number {
  const start = Date.UTC(new Date().getUTCFullYear(), 0, 1);
  return Math.max(1, Math.ceil((Date.now() - start) / 86400000));
}

function buildCandlesFromPrices(
  prices: [number, number][],
  bucketMs: number,
  sinceMs?: number,
): Candle[] {
  const filtered = sinceMs ? prices.filter(([ts]) => ts >= sinceMs) : prices;
  const buckets = new Map<number, { o: number; h: number; l: number; c: number; t: number }>();

  for (const [ts, price] of filtered) {
    const key = Math.floor(ts / bucketMs) * bucketMs;
    const b = buckets.get(key);
    if (!b) {
      buckets.set(key, { o: price, h: price, l: price, c: price, t: key });
    } else {
      b.h = Math.max(b.h, price);
      b.l = Math.min(b.l, price);
      b.c = price;
    }
  }

  return [...buckets.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, v]) => ({
      timestamp: v.t,
      open: v.o,
      high: v.h,
      low: v.l,
      close: v.c,
    }));
}

async function fetchMarketChartPrices(
  slug: string,
  days: number | string,
): Promise<[number, number][]> {
  const url = `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(slug)}/market_chart?vs_currency=usd&days=${days}`;
  const json = await coingeckoFetch<{ prices: [number, number][] }>(url);
  return json.prices ?? [];
}

async function fetchOhlcCandles(slug: string, days: string): Promise<Candle[]> {
  const url = `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(slug)}/ohlc?vs_currency=usd&days=${days}`;
  const json = await coingeckoFetch<[number, number, number, number, number][]>(url);
  return (json || []).map(([ts, open, high, low, close]) => ({
    timestamp: ts,
    open,
    high,
    low,
    close,
  }));
}

/** Kurzfristig: market_chart (5-Min/30-Min-Ticks), kein interval=hourly */
async function fetchIntradayCandles(
  slug: string,
  hours: number,
  bucketMs: number,
): Promise<Candle[]> {
  const chartDays = hours <= 1 ? 1 : hours <= 24 ? 1 : 2;
  const prices = await fetchMarketChartPrices(slug, chartDays);
  const since = Date.now() - hours * 60 * 60 * 1000;
  let candles = buildCandlesFromPrices(prices, bucketMs, since);

  if (candles.length < 8) {
    candles = buildCandlesFromPrices(
      prices,
      bucketMs,
      Date.now() - Math.max(hours * 2, 6) * 60 * 60 * 1000,
    );
  }

  if (candles.length < 2) {
    const ohlc = await fetchOhlcCandles(slug, '7');
    const need = Math.max(12, Math.ceil(hours * 2));
    return ohlc.slice(-need);
  }

  return candles;
}

async function fetchYtdCandles(slug: string): Promise<Candle[]> {
  const days = Math.min(ytdDayCount(), 365);
  const yearStart = Date.UTC(new Date().getUTCFullYear(), 0, 1);

  try {
    const prices = await fetchMarketChartPrices(slug, days);
    let bucketMs = 24 * 60 * 60 * 1000;
    if (days <= 14) bucketMs = 60 * 60 * 1000;
    else if (days <= 45) bucketMs = 4 * 60 * 60 * 1000;

    const candles = buildCandlesFromPrices(prices, bucketMs, yearStart);
    if (candles.length >= 2) return candles;
  } catch {
    /* fallback OHLC */
  }

  return fetchOhlcCandles(slug, String(days));
}

async function fetchMaxCandles(slug: string): Promise<Candle[]> {
  try {
    return await fetchOhlcCandles(slug, '365');
  } catch {
    const prices = await fetchMarketChartPrices(slug, 365);
    return buildCandlesFromPrices(prices, 24 * 60 * 60 * 1000);
  }
}

async function fetchCandlesForRange(slug: string, range: ChartRange): Promise<Candle[]> {
  switch (range) {
    case '1h':
      return fetchIntradayCandles(slug, 1, 5 * 60 * 1000);
    case '24h':
      return fetchIntradayCandles(slug, 24, 30 * 60 * 1000);
    case 'ytd':
      return fetchYtdCandles(slug);
    case 'max':
      return fetchMaxCandles(slug);
    default: {
      const days = OHLC_DAYS[range];
      if (!days) throw new Error(`Unbekannter Chart-Zeitraum: ${range}`);
      return fetchOhlcCandles(slug, days);
    }
  }
}

export async function fetchCoinChart(slug: string, range: ChartRange): Promise<CoinChartResponse> {
  const key = `${slug}:chart:${range}`;
  const cached = chartCache.get<CoinChartResponse>(key);
  if (cached) return cached;

  const candles = await fetchCandlesForRange(slug, range);
  if (!candles.length) throw new Error('Keine Kerzen-Daten für diesen Coin');

  const first = candles[0];
  const last = candles[candles.length - 1];

  const result: CoinChartResponse = {
    slug,
    range,
    candles,
    currentPrice: last.close,
    changePercent: first.open ? ((last.close - first.open) / first.open) * 100 : 0,
    high: Math.max(...candles.map((c) => c.high)),
    low: Math.min(...candles.map((c) => c.low)),
    open: first.open,
    source: range === 'max' ? 'CoinGecko · 365T (API-Limit)' : 'CoinGecko',
  };

  const ttl = range === '1h' || range === '24h' ? 90 : 300;
  chartCache.set(key, result, ttl);
  return result;
}

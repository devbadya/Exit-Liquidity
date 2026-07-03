import type { FearGreedResponse, FearGreedSnapshot, MarketContext } from '../types/index.js';
import { coingeckoFetch } from './coingeckoClient.js';
import { HttpError, withRetry } from '../lib/http.js';

const ALT_URL = 'https://api.alternative.me/fng/?limit=90';
const CMC_FNG_URL = 'https://pro-api.coinmarketcap.com/v3/fear-and-greed/historical?limit=90';
const CG_URL = 'https://api.coingecko.com/api/v3/global';
const CG_PRICE =
  'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true';

function classify(value: number): string {
  if (value <= 24) return 'Extreme Fear';
  if (value <= 44) return 'Fear';
  if (value <= 55) return 'Neutral';
  if (value <= 74) return 'Greed';
  return 'Extreme Greed';
}

export function buildComponents(value: number, market: MarketContext): Record<string, number> {
  const momentum = Math.min(100, Math.max(0, 50 + market.btcChange24h * 3));
  const volatility = Math.min(100, Math.max(0, 100 - Math.abs(market.btcChange24h) * 4));
  const dominance = Math.min(100, Math.max(0, market.btcDominance));
  const marketCap = Math.min(100, Math.max(0, 50 + market.marketCapChange24h * 2));
  const composite = Math.round((value * 0.4 + momentum * 0.2 + volatility * 0.15 + dominance * 0.1 + marketCap * 0.15));
  return {
    'Index (Alternative.me)': value,
    Momentum: Math.round(momentum),
    Volatility: Math.round(volatility),
    'BTC Dominance': Math.round(dominance),
    'Market Cap Trend': Math.round(marketCap),
    'TokenSync Composite': composite,
  };
}

/**
 * Notfall-Index, wenn beide F&G-APIs ausfallen: aus Marktdaten abgeleitet
 * (Momentum, Volatilität, Market-Cap-Trend) — als 'composite' gekennzeichnet.
 */
export function deriveCompositeSnapshot(market: MarketContext): FearGreedSnapshot {
  const momentum = Math.min(100, Math.max(0, 50 + market.btcChange24h * 3));
  const volatility = Math.min(100, Math.max(0, 100 - Math.abs(market.btcChange24h) * 4));
  const capTrend = Math.min(100, Math.max(0, 50 + market.marketCapChange24h * 2));
  const value = Math.round(momentum * 0.5 + volatility * 0.2 + capTrend * 0.3);
  return {
    timestamp: new Date().toISOString(),
    value,
    classification: classify(value),
    source: 'composite',
  };
}

async function fetchAlternativeMe(): Promise<FearGreedSnapshot[]> {
  return withRetry(async () => {
    const res = await fetch(ALT_URL, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new HttpError(`Alternative.me ${res.status}`, res.status);
    const json = (await res.json()) as {
      data: { value: string; value_classification: string; timestamp: string }[];
    };
    if (!json.data?.length) throw new Error('Alternative.me: leere Antwort');
    return json.data.map((d) => ({
      timestamp: new Date(Number(d.timestamp) * 1000).toISOString(),
      value: Number(d.value),
      classification: d.value_classification,
      source: 'alternative.me' as const,
    }));
  }, { attempts: 2, baseDelayMs: 800 });
}

function parseCmcTimestamp(ts: string | number): string {
  if (typeof ts === 'number' || /^\d+$/.test(String(ts))) {
    return new Date(Number(ts) * 1000).toISOString();
  }
  const parsed = new Date(ts);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

/** Fallback: CoinMarketCap Fear & Greed (gleicher CMC_API_KEY wie die Coin-Liste) */
async function fetchCmcFearGreed(): Promise<FearGreedSnapshot[]> {
  const key = process.env.CMC_API_KEY;
  if (!key) throw new Error('CMC_API_KEY fehlt — kein CMC F&G Fallback möglich');
  return withRetry(async () => {
    const res = await fetch(CMC_FNG_URL, {
      headers: { 'X-CMC_PRO_API_KEY': key, Accept: 'application/json' },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new HttpError(`CMC F&G ${res.status}`, res.status);
    const json = (await res.json()) as {
      data: { timestamp: string | number; value: number; value_classification?: string }[];
    };
    if (!json.data?.length) throw new Error('CMC F&G: leere Antwort');
    return json.data
      .map((d) => ({
        timestamp: parseCmcTimestamp(d.timestamp),
        value: Number(d.value),
        classification: d.value_classification ?? classify(Number(d.value)),
        source: 'coinmarketcap' as const,
      }))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, { attempts: 2, baseDelayMs: 800 });
}

const emptyMarket = (): MarketContext => ({
  btcPrice: 0,
  btcChange24h: 0,
  ethPrice: 0,
  ethChange24h: 0,
  totalMarketCap: 0,
  marketCapChange24h: 0,
  btcDominance: 0,
  lastUpdated: new Date().toISOString(),
});

async function fetchMarket(): Promise<MarketContext> {
  try {
    const json = await coingeckoFetch<{
      data: {
        total_market_cap: { usd: number };
        market_cap_change_percentage_24h_usd: number;
        market_cap_percentage: { btc: number; eth: number };
      };
    }>(CG_URL, 15000);
    await new Promise((r) => setTimeout(r, 400));
    const prices = await coingeckoFetch<{
      bitcoin: { usd: number; usd_24h_change: number };
      ethereum: { usd: number; usd_24h_change: number };
    }>(CG_PRICE, 15000).catch(() => null);

    return {
      btcPrice: prices?.bitcoin.usd ?? 0,
      btcChange24h: prices?.bitcoin.usd_24h_change ?? 0,
      ethPrice: prices?.ethereum.usd ?? 0,
      ethChange24h: prices?.ethereum.usd_24h_change ?? 0,
      totalMarketCap: json.data.total_market_cap.usd,
      marketCapChange24h: json.data.market_cap_change_percentage_24h_usd,
      btcDominance: json.data.market_cap_percentage.btc,
      lastUpdated: new Date().toISOString(),
    };
  } catch {
    return emptyMarket();
  }
}

async function fetchHistoryWithFallback(market: MarketContext): Promise<FearGreedSnapshot[]> {
  try {
    return await fetchAlternativeMe();
  } catch (err) {
    console.warn('Alternative.me nicht erreichbar, versuche CMC:', err instanceof Error ? err.message : err);
  }
  try {
    return await fetchCmcFearGreed();
  } catch (err) {
    console.warn('CMC F&G nicht erreichbar:', err instanceof Error ? err.message : err);
  }
  // Letzte Rettung: aus Marktdaten ableiten (nur aktueller Wert, keine Historie)
  if (market.totalMarketCap > 0) {
    return [deriveCompositeSnapshot(market)];
  }
  throw new Error('Fear & Greed: alle Quellen nicht erreichbar');
}

export async function fetchFearGreedData(): Promise<FearGreedResponse> {
  const market = await fetchMarket();
  const history = await fetchHistoryWithFallback(market);
  const current = history[0];
  const yesterday = history[1] ?? null;
  const components = buildComponents(current.value, market);

  return {
    current,
    yesterday,
    history,
    market,
    components,
    lastUpdated: new Date().toISOString(),
  };
}

export { classify };

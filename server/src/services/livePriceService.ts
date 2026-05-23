import type { CmcCoin } from '../types/cmc.js';
import type { LivePriceResponse, LivePriceQuote } from '../types/livePrice.js';
import { coingeckoFetch } from './coingeckoClient.js';
import { fetchBinanceSpot, fetchHyperliquidMid, fetchUniswapSpot } from './exchangeFeeds.js';
import { buildRobustReference } from './priceAnalysis.js';
import { resolveEthereumContract } from './tokenContractResolver.js';

const CMC_BASE = 'https://pro-api.coinmarketcap.com';

const SLUG_TO_SYMBOL: Record<string, string> = {
  bitcoin: 'BTC',
  ethereum: 'ETH',
  tether: 'USDT',
  binancecoin: 'BNB',
  solana: 'SOL',
  ripple: 'XRP',
  'usd-coin': 'USDC',
  cardano: 'ADA',
  dogecoin: 'DOGE',
  tron: 'TRX',
  chainlink: 'LINK',
  avalanche: 'AVAX',
  polkadot: 'DOT',
  polygon: 'MATIC',
  litecoin: 'LTC',
  'shiba-inu': 'SHIB',
  uniswap: 'UNI',
  cosmos: 'ATOM',
  'near-protocol': 'NEAR',
  aptos: 'APT',
  arbitrum: 'ARB',
  optimism: 'OP',
  sui: 'SUI',
  pepe: 'PEPE',
};

function resolveExchangeSymbol(slug: string, cachedCoin?: CmcCoin): string {
  if (cachedCoin?.symbol) return cachedCoin.symbol;
  return SLUG_TO_SYMBOL[slug.toLowerCase()] ?? slug.toUpperCase();
}

function getCmcKey(): string | undefined {
  return process.env.CMC_API_KEY;
}

async function fetchCmcLive(slug: string): Promise<LivePriceQuote | null> {
  const key = getCmcKey();
  if (!key) return null;
  try {
    const url = `${CMC_BASE}/v1/cryptocurrency/quotes/latest?slug=${encodeURIComponent(slug)}&convert=USD`;
    const res = await fetch(url, {
      headers: { 'X-CMC_PRO_API_KEY': key, Accept: 'application/json' },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      data: Record<string, { quote: { USD: { price: number; percent_change_24h: number; last_updated: string } } }>;
    };
    const entry = Object.values(json.data)[0];
    if (!entry?.quote?.USD) return null;
    const usd = entry.quote.USD;
    return {
      price: usd.price,
      change24h: usd.percent_change_24h ?? null,
      updatedAt: usd.last_updated || new Date().toISOString(),
      source: 'coinmarketcap',
    };
  } catch {
    return null;
  }
}

async function fetchGeckoLive(slug: string): Promise<LivePriceQuote | null> {
  try {
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(slug)}&vs_currencies=usd&include_24hr_change=true&include_last_updated_at=true`;
    const json = await coingeckoFetch<
      Record<string, { usd: number; usd_24h_change?: number; last_updated_at?: number }>
    >(url, 12000);
    const row = json[slug];
    if (!row?.usd) return null;
    return {
      price: row.usd,
      change24h: row.usd_24h_change ?? null,
      updatedAt: row.last_updated_at
        ? new Date(row.last_updated_at * 1000).toISOString()
        : new Date().toISOString(),
      source: 'coingecko',
    };
  } catch {
    return null;
  }
}

async function fetchBinanceLive(symbol: string): Promise<LivePriceQuote | null> {
  const spot = await fetchBinanceSpot(symbol);
  if (!spot) return null;
  return {
    price: spot.price,
    change24h: spot.change24h,
    updatedAt: new Date().toISOString(),
    source: 'binance',
    detail: `${spot.pair} · ${spot.method === 'mid' ? 'Mid' : 'Last'}`,
  };
}

async function fetchHyperliquidLive(symbol: string): Promise<LivePriceQuote | null> {
  const mid = await fetchHyperliquidMid(symbol);
  if (mid == null) return null;
  return {
    price: mid,
    change24h: null,
    updatedAt: new Date().toISOString(),
    source: 'hyperliquid',
    detail: 'Perp Mid',
  };
}

async function fetchUniswapLive(slug: string): Promise<LivePriceQuote | null> {
  const address = await resolveEthereumContract(slug);
  if (!address) return null;
  const spot = await fetchUniswapSpot(address);
  if (!spot) return null;
  const liq =
    spot.liquidityUsd >= 1e6
      ? `$${(spot.liquidityUsd / 1e6).toFixed(1)}M Liq`
      : spot.liquidityUsd >= 1e3
        ? `$${(spot.liquidityUsd / 1e3).toFixed(0)}k Liq`
        : 'Low Liq';
  return {
    price: spot.price,
    change24h: spot.change24h,
    updatedAt: new Date().toISOString(),
    source: 'uniswap',
    detail: `${spot.pairLabel} · ${spot.dexId} · ${liq}`,
  };
}

export async function fetchLivePrice(slug: string, cachedCoin?: CmcCoin): Promise<LivePriceResponse> {
  const exchangeSym = resolveExchangeSymbol(slug, cachedCoin);
  const symbol = cachedCoin?.symbol ?? exchangeSym;
  const name = cachedCoin?.name ?? slug;

  const [coingecko, coinmarketcap, binance, hyperliquid, uniswap] = await Promise.all([
    fetchGeckoLive(slug),
    fetchCmcLive(slug),
    fetchBinanceLive(exchangeSym),
    fetchHyperliquidLive(exchangeSym),
    fetchUniswapLive(slug),
  ]);

  const allQuotes = [coingecko, coinmarketcap, binance, hyperliquid, uniswap].filter(
    (q): q is LivePriceQuote => q !== null,
  );
  const analysis = buildRobustReference(allQuotes);

  return {
    slug,
    symbol,
    name,
    coingecko,
    coinmarketcap,
    binance,
    hyperliquid,
    uniswap,
    sourceCount: allQuotes.length,
    referencePrice: analysis.referencePrice,
    spreadPercent: analysis.spreadPercent,
    spreadUsd: analysis.spreadUsd,
    syncStatus: analysis.syncStatus,
    syncLabel: analysis.syncLabel,
    accuracyScore: analysis.accuracyScore,
    comparison: analysis.comparison,
    outliersExcluded: analysis.outliersExcluded,
    lastUpdated: new Date().toISOString(),
  };
}

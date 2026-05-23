/** Öffentliche Börsen- & DEX-Feeds (kein API-Key) */

const BINANCE_QUOTES = ['USDT', 'USDC', 'FDUSD'] as const;
const UNISWAP_DEX_IDS = new Set(['uniswap', 'uniswap_v2', 'uniswap_v3']);
const STABLE_QUOTES = new Set(['USDC', 'USDT', 'DAI', 'USDC.E', 'USD₮0', 'USD0']);

let hyperliquidMids: Record<string, string> | null = null;
let hyperliquidFetchedAt = 0;
const HL_CACHE_MS = 2500;

export interface BinanceSpotResult {
  price: number;
  change24h: number | null;
  pair: string;
  method: 'mid' | 'last';
}

export interface UniswapSpotResult {
  price: number;
  change24h: number | null;
  pairLabel: string;
  liquidityUsd: number;
  dexId: string;
}

interface DexPair {
  dexId?: string;
  priceUsd?: string;
  priceChange?: { h24?: number };
  liquidity?: { usd?: number };
  baseToken?: { symbol?: string };
  quoteToken?: { symbol?: string };
  pairAddress?: string;
}

export async function fetchHyperliquidMid(symbol: string): Promise<number | null> {
  const sym = symbol.toUpperCase();
  const now = Date.now();
  if (!hyperliquidMids || now - hyperliquidFetchedAt > HL_CACHE_MS) {
    try {
      const res = await fetch('https://api.hyperliquid.xyz/info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ type: 'allMids', dex: '' }),
        signal: AbortSignal.timeout(12000),
      });
      if (!res.ok) return null;
      hyperliquidMids = (await res.json()) as Record<string, string>;
      hyperliquidFetchedAt = now;
    } catch {
      return null;
    }
  }
  const raw = hyperliquidMids[sym];
  if (!raw) return null;
  const price = parseFloat(raw);
  return Number.isFinite(price) && price > 0 ? price : null;
}

async function fetchBinanceBookMid(pair: string): Promise<number | null> {
  const url = `https://api.binance.com/api/v3/ticker/bookTicker?symbol=${encodeURIComponent(pair)}`;
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { bidPrice: string; askPrice: string };
  const bid = parseFloat(json.bidPrice);
  const ask = parseFloat(json.askPrice);
  if (!Number.isFinite(bid) || !Number.isFinite(ask) || bid <= 0 || ask <= 0) return null;
  return (bid + ask) / 2;
}

async function fetchBinance24h(pair: string): Promise<{ last: number; change24h: number | null } | null> {
  const url = `https://api.binance.com/api/v3/ticker/24hr?symbol=${encodeURIComponent(pair)}`;
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { lastPrice: string; priceChangePercent: string };
  const last = parseFloat(json.lastPrice);
  if (!Number.isFinite(last) || last <= 0) return null;
  const ch = parseFloat(json.priceChangePercent);
  return { last, change24h: Number.isFinite(ch) ? ch : null };
}

/** Binance Spot: Mid (Bid+Ask)/2 bevorzugt, sonst Last — USDT/USDC/FDUSD */
export async function fetchBinanceSpot(symbol: string): Promise<BinanceSpotResult | null> {
  const base = symbol.toUpperCase();
  for (const quote of BINANCE_QUOTES) {
    const pair = `${base}${quote}`;
    try {
      const [mid, day] = await Promise.all([
        fetchBinanceBookMid(pair),
        fetchBinance24h(pair),
      ]);
      const price = mid ?? day?.last ?? null;
      if (price == null || price <= 0) continue;
      return {
        price,
        change24h: day?.change24h ?? null,
        pair,
        method: mid != null ? 'mid' : 'last',
      };
    } catch {
      continue;
    }
  }
  return null;
}

function scoreUniswapPair(p: DexPair): number {
  const liq = p.liquidity?.usd ?? 0;
  const quote = (p.quoteToken?.symbol ?? '').toUpperCase();
  const stableBonus = STABLE_QUOTES.has(quote) ? 2 : quote === 'WETH' || quote === 'ETH' ? 1.2 : 1;
  const v3Bonus = p.dexId === 'uniswap_v3' ? 1.15 : 1;
  return liq * stableBonus * v3Bonus;
}

function pickBestUniswapPair(pairs: DexPair[]): DexPair | null {
  const uni = pairs.filter((p) => p.dexId && UNISWAP_DEX_IDS.has(p.dexId.toLowerCase()));
  if (!uni.length) return null;
  return uni.reduce((best, p) => (scoreUniswapPair(p) > scoreUniswapPair(best) ? p : best));
}

/** Uniswap v2/v3 USD-Preis über DexScreener (höchste Liquidität) */
export async function fetchUniswapSpot(tokenAddress: string): Promise<UniswapSpotResult | null> {
  try {
    const url = `https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`;
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { pairs?: DexPair[] };
    const best = pickBestUniswapPair(json.pairs ?? []);
    if (!best?.priceUsd) return null;

    const price = parseFloat(best.priceUsd);
    if (!Number.isFinite(price) || price <= 0) return null;

    const base = best.baseToken?.symbol ?? '?';
    const quote = best.quoteToken?.symbol ?? '?';
    return {
      price,
      change24h: best.priceChange?.h24 ?? null,
      pairLabel: `${base}/${quote}`,
      liquidityUsd: best.liquidity?.usd ?? 0,
      dexId: best.dexId ?? 'uniswap',
    };
  } catch {
    return null;
  }
}

import type { CmcCoin } from '../types/cmc.js';

const CMC_BASE = 'https://pro-api.coinmarketcap.com';
const BATCH = 200;
const MAX_COINS = 1000;

interface CmcListingRow {
  id: number;
  name: string;
  symbol: string;
  slug: string;
  cmc_rank: number;
  circulating_supply: number;
  max_supply: number | null;
  last_updated: string;
  quote: {
    USD: {
      price: number;
      volume_24h: number;
      percent_change_24h: number;
      percent_change_7d: number;
      percent_change_30d: number;
      market_cap: number;
    };
  };
}

function getApiKey(): string {
  const key = process.env.CMC_API_KEY;
  if (!key) throw new Error('CMC_API_KEY fehlt in server/.env');
  return key;
}

async function fetchListingsPage(start: number): Promise<CmcListingRow[]> {
  const url = `${CMC_BASE}/v1/cryptocurrency/listings/latest?start=${start}&limit=${BATCH}&convert=USD&sort=market_cap&sort_dir=desc`;
  const res = await fetch(url, {
    headers: {
      'X-CMC_PRO_API_KEY': getApiKey(),
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(25000),
  });

  if (res.status === 429) throw new Error('CoinMarketCap Rate Limit — bitte später erneut versuchen');
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`CoinMarketCap ${res.status}: ${body.slice(0, 120)}`);
  }

  const json = (await res.json()) as { data: CmcListingRow[] };
  return json.data ?? [];
}

function mapRow(row: CmcListingRow): CmcCoin {
  const usd = row.quote.USD;
  return {
    id: row.id,
    rank: row.cmc_rank,
    name: row.name,
    symbol: row.symbol,
    slug: row.slug,
    price: usd.price ?? 0,
    marketCap: usd.market_cap ?? 0,
    volume24h: usd.volume_24h ?? 0,
    change24h: usd.percent_change_24h ?? null,
    change7d: usd.percent_change_7d ?? null,
    change30d: usd.percent_change_30d ?? null,
    circulatingSupply: row.circulating_supply ?? 0,
    maxSupply: row.max_supply,
    lastUpdated: row.last_updated,
  };
}

let cachedCoins: CmcCoin[] | null = null;
let cacheTime = 0;
const CACHE_MS = 10 * 60 * 1000;

export async function fetchAllCmcCoins(): Promise<CmcCoin[]> {
  if (cachedCoins && Date.now() - cacheTime < CACHE_MS) return cachedCoins;

  const all: CmcCoin[] = [];
  let start = 1;

  while (start <= MAX_COINS) {
    const page = await fetchListingsPage(start);
    if (!page.length) break;
    all.push(...page.map(mapRow));
    if (page.length < BATCH) break;
    start += BATCH;
    await new Promise((r) => setTimeout(r, 1200));
  }

  cachedCoins = all;
  cacheTime = Date.now();
  return all;
}

export function filterAndPaginateCoins(
  coins: CmcCoin[],
  opts: { page: number; limit: number; search?: string },
): { items: CmcCoin[]; total: number } {
  let list = coins;
  const q = opts.search?.trim().toLowerCase();
  if (q) {
    list = coins.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.symbol.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q),
    );
  }
  const total = list.length;
  const page = Math.max(1, opts.page);
  const limit = Math.min(100, Math.max(10, opts.limit));
  const start = (page - 1) * limit;
  return { items: list.slice(start, start + limit), total };
}

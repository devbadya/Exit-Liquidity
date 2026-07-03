/**
 * Fallback für die Coin-Liste: Wenn CoinMarketCap nicht erreichbar ist
 * (kein Key, Rate Limit, Ausfall), liefern wir dieselbe Datenform aus CoinGecko.
 */
import type { CmcCoin } from '../types/cmc.js';
import { coingeckoFetch } from './coingeckoClient.js';

export interface GeckoMarketRow {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number | null;
  market_cap: number | null;
  market_cap_rank: number | null;
  total_volume: number | null;
  circulating_supply: number | null;
  max_supply: number | null;
  last_updated: string | null;
  price_change_percentage_24h_in_currency?: number | null;
  price_change_percentage_7d_in_currency?: number | null;
  price_change_percentage_30d_in_currency?: number | null;
}

/** Stabile numerische Pseudo-ID aus dem CoinGecko-String-Slug (CmcCoin.id ist number) */
export function numericIdFromSlug(slug: string): number {
  let hash = 0;
  for (let i = 0; i < slug.length; i++) {
    hash = (hash * 31 + slug.charCodeAt(i)) | 0;
  }
  // Negativ vermeiden und Kollision mit echten CMC-IDs (klein) unwahrscheinlich machen
  return 1_000_000_000 + Math.abs(hash);
}

export function mapGeckoToCmcCoin(row: GeckoMarketRow, fallbackRank: number): CmcCoin {
  return {
    id: numericIdFromSlug(row.id),
    rank: row.market_cap_rank ?? fallbackRank,
    name: row.name,
    symbol: (row.symbol || '').toUpperCase(),
    slug: row.id,
    imageUrl: row.image || '',
    price: row.current_price ?? 0,
    marketCap: row.market_cap ?? 0,
    volume24h: row.total_volume ?? 0,
    change24h: row.price_change_percentage_24h_in_currency ?? null,
    change7d: row.price_change_percentage_7d_in_currency ?? null,
    change30d: row.price_change_percentage_30d_in_currency ?? null,
    circulatingSupply: row.circulating_supply ?? 0,
    maxSupply: row.max_supply,
    lastUpdated: row.last_updated ?? new Date().toISOString(),
  };
}

const PER_PAGE = 250;

export async function fetchCoinsFromCoinGecko(maxCoins = 500): Promise<CmcCoin[]> {
  const pages = Math.max(1, Math.ceil(maxCoins / PER_PAGE));
  const all: CmcCoin[] = [];

  for (let page = 1; page <= pages; page++) {
    const url =
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc` +
      `&per_page=${PER_PAGE}&page=${page}&sparkline=false&price_change_percentage=24h,7d,30d`;
    const rows = await coingeckoFetch<GeckoMarketRow[]>(url);
    all.push(...rows.map((r, i) => mapGeckoToCmcCoin(r, (page - 1) * PER_PAGE + i + 1)));
    if (rows.length < PER_PAGE) break;
    if (page < pages) await new Promise((r) => setTimeout(r, 500));
  }

  return all.slice(0, maxCoins);
}

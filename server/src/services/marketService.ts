import type {
  AltcoinSeasonData,
  AverageCryptoIndex,
  CategoryRow,
  CoinRow,
  GlobalMarketStats,
  MarketOverviewResponse,
} from '../types/market.js';
import { coingeckoFetch } from './coingeckoClient.js';

const STABLE_SYMBOLS = new Set([
  'usdt', 'usdc', 'dai', 'busd', 'tusd', 'usdp', 'usdd', 'fdusd', 'pyusd', 'eurc',
]);

const CG_GLOBAL = 'https://api.coingecko.com/api/v3/global';
const CG_MARKETS =
  'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=false&price_change_percentage=24h,7d,30d,90d';
const CG_CATEGORIES = 'https://api.coingecko.com/api/v3/coins/categories?order=market_cap_desc';

interface CGMarket {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  total_volume: number;
  market_cap_rank: number;
  price_change_percentage_24h_in_currency?: number;
  price_change_percentage_7d_in_currency?: number;
  price_change_percentage_30d_in_currency?: number;
  price_change_percentage_90d_in_currency?: number;
}

function mapCoin(c: CGMarket): CoinRow {
  return {
    id: c.id,
    symbol: c.symbol.toUpperCase(),
    name: c.name,
    image: c.image,
    price: c.current_price ?? 0,
    marketCap: c.market_cap ?? 0,
    volume24h: c.total_volume ?? 0,
    change24h: c.price_change_percentage_24h_in_currency ?? null,
    change7d: c.price_change_percentage_7d_in_currency ?? null,
    change30d: c.price_change_percentage_30d_in_currency ?? null,
    change90d: c.price_change_percentage_90d_in_currency ?? null,
    rank: c.market_cap_rank ?? 0,
  };
}

function isStable(coin: CoinRow): boolean {
  return STABLE_SYMBOLS.has(coin.symbol.toLowerCase()) || coin.name.toLowerCase().includes('stable');
}

function calcAltcoinSeason(coins: CoinRow[]): AltcoinSeasonData {
  const btc = coins.find((c) => c.symbol === 'BTC');
  const btc90 = btc?.change90d ?? 0;

  const alts = coins
    .filter((c) => c.symbol !== 'BTC' && c.symbol !== 'ETH' && !isStable(c) && c.change90d !== null)
    .slice(0, 50);

  const outperforming = alts.filter((c) => (c.change90d ?? 0) > btc90).length;
  const sampleSize = alts.length || 1;
  const index = Math.round((outperforming / Math.min(50, sampleSize)) * 100);

  let classification = 'Neutral';
  if (index >= 75) classification = 'Altcoin Season';
  else if (index <= 25) classification = 'Bitcoin Season';

  return {
    index,
    classification,
    outperformingCount: outperforming,
    sampleSize: Math.min(50, sampleSize),
    btcChange90d: btc90,
    description:
      'Misst, wie viele der Top-Altcoins Bitcoin auf 90-Tage-Sicht outperformen (CMC/Blockchaincenter-Methodik).',
  };
}

function calcAverageCrypto(coins: CoinRow[]): AverageCryptoIndex {
  const top = coins.filter((c) => !isStable(c)).slice(0, 50);
  const totalCap = top.reduce((s, c) => s + c.marketCap, 0) || 1;

  const weighted = (field: keyof CoinRow) => {
    let sum = 0;
    let weight = 0;
    for (const c of top) {
      const v = c[field];
      if (typeof v === 'number' && v !== null && c.marketCap > 0) {
        sum += v * c.marketCap;
        weight += c.marketCap;
      }
    }
    return weight ? sum / weight : 0;
  };

  const change24h = weighted('change24h');
  const change7d = weighted('change7d');
  const change30d = weighted('change30d');

  const score = Math.min(100, Math.max(0, Math.round(50 + change24h * 2.5)));

  let classification = 'Neutral';
  if (score >= 65) classification = 'Bullish Market';
  else if (score <= 35) classification = 'Bearish Market';

  return {
    score,
    classification,
    change24h,
    change7d,
    change30d,
    weightedCoins: top.length,
    description:
      'Market-Cap-gewichteter Durchschnitt der Top-50 Kurse (24h/7d/30d). Ähnlich einem CMC-Markt-Durchschnittsindex.',
  };
}

async function fetchWithDelay<T>(url: string, ms: number): Promise<T> {
  await new Promise((r) => setTimeout(r, ms));
  return coingeckoFetch<T>(url);
}

export async function fetchMarketOverview(): Promise<MarketOverviewResponse> {
  const globalJson = await coingeckoFetch<{ data: Record<string, unknown> }>(CG_GLOBAL);
  const marketsJson = await fetchWithDelay<CGMarket[]>(CG_MARKETS, 400);
  const categoriesJson = await fetchWithDelay<
    { name: string; market_cap: number; market_cap_change_24h: number; volume_24h: number; top_3_coins: string[] }[]
  >(CG_CATEGORIES, 400).catch(() => []);

  const g = globalJson.data;
  const mcp = g.market_cap_percentage as Record<string, number>;
  const coins = marketsJson.map(mapCoin);

  const defiCat = categoriesJson.find((c) => c.name.toLowerCase() === 'defi');
  const stableCat = categoriesJson.find((c) => c.name.toLowerCase().includes('stablecoin'));

  const global: GlobalMarketStats = {
    totalMarketCap: (g.total_market_cap as { usd: number }).usd,
    totalVolume24h: (g.total_volume as { usd: number }).usd,
    marketCapChange24h: g.market_cap_change_percentage_24h_usd as number,
    btcDominance: mcp.btc ?? 0,
    ethDominance: mcp.eth ?? 0,
    activeCryptos: g.active_cryptocurrencies as number,
    markets: g.markets as number,
    defiMarketCap: defiCat?.market_cap ?? 0,
    defiChange24h: defiCat?.market_cap_change_24h ?? 0,
    stablecoinMarketCap: stableCat?.market_cap ?? 0,
    stablecoinChange24h: stableCat?.market_cap_change_24h ?? 0,
  };

  const sorted24 = [...coins].filter((c) => c.change24h !== null);
  const gainers = [...sorted24].sort((a, b) => (b.change24h ?? 0) - (a.change24h ?? 0)).slice(0, 8);
  const losers = [...sorted24].sort((a, b) => (a.change24h ?? 0) - (b.change24h ?? 0)).slice(0, 8);

  const categories: CategoryRow[] = categoriesJson.slice(0, 12).map((c) => ({
    name: c.name,
    marketCap: c.market_cap,
    marketCapChange24h: c.market_cap_change_24h,
    volume24h: c.volume_24h,
    topCoins: c.top_3_coins ?? [],
  }));

  const dominanceChart = [
    { name: 'Bitcoin', value: global.btcDominance, color: '#f7931a' },
    { name: 'Ethereum', value: global.ethDominance, color: '#627eea' },
    {
      name: 'Andere',
      value: Math.max(0, 100 - global.btcDominance - global.ethDominance),
      color: '#22d3ee',
    },
  ];

  return {
    global,
    topCoins: coins.slice(0, 50),
    gainers,
    losers,
    categories,
    altcoinSeason: calcAltcoinSeason(coins),
    averageCrypto: calcAverageCrypto(coins),
    dominanceChart,
    sources: ['CoinGecko Global', 'CoinGecko Markets', 'CoinGecko Categories'],
    lastUpdated: new Date().toISOString(),
  };
}

/* ──────────────── News ──────────────── */
export interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  content?: string;
  imageUrl?: string;
  source: string;
  sourceId: string;
  url: string;
  publishedAt: string;
  categories: string[];
  tags: string[];
  sentiment?: 'bullish' | 'bearish' | 'neutral';
}
export interface NewsResponse {
  articles: NewsArticle[];
  lastUpdated: string;
  sourcesActive: number;
  totalFetched: number;
}

/* ──────────────── Fear & Greed ──────────────── */
export interface FearGreedSnapshot {
  timestamp: string;
  value: number;
  classification: string;
  source: string;
}
export interface MarketContext {
  btcPrice: number;
  btcChange24h: number;
  ethPrice: number;
  ethChange24h: number;
  totalMarketCap: number;
  marketCapChange24h: number;
  btcDominance: number;
  lastUpdated: string;
}
export interface FearGreedResponse {
  current: FearGreedSnapshot;
  yesterday: FearGreedSnapshot | null;
  history: FearGreedSnapshot[];
  market: MarketContext;
  components: Record<string, number>;
  lastUpdated: string;
}

/* ──────────────── Markets ──────────────── */
export interface CoinRow {
  id: string;
  symbol: string;
  name: string;
  image: string;
  price: number;
  marketCap: number;
  volume24h: number;
  change24h: number | null;
  change7d: number | null;
  change30d: number | null;
  change90d: number | null;
  rank: number;
}
export interface CategoryRow {
  name: string;
  marketCap: number;
  marketCapChange24h: number;
  volume24h: number;
  topCoins: string[];
}
export interface AltcoinSeasonData {
  index: number;
  classification: string;
  outperformingCount: number;
  sampleSize: number;
  btcChange90d: number;
  description: string;
}
export interface AverageCryptoIndex {
  score: number;
  classification: string;
  change24h: number;
  change7d: number;
  change30d: number;
  weightedCoins: number;
  description: string;
}
export interface GlobalMarketStats {
  totalMarketCap: number;
  totalVolume24h: number;
  marketCapChange24h: number;
  btcDominance: number;
  ethDominance: number;
  activeCryptos: number;
  markets: number;
  defiMarketCap: number;
  defiChange24h: number;
  stablecoinMarketCap: number;
  stablecoinChange24h: number;
}
export interface MarketOverviewResponse {
  global: GlobalMarketStats;
  topCoins: CoinRow[];
  gainers: CoinRow[];
  losers: CoinRow[];
  categories: CategoryRow[];
  altcoinSeason: AltcoinSeasonData;
  averageCrypto: AverageCryptoIndex;
  dominanceChart: { name: string; value: number; color: string }[];
  sources: string[];
  lastUpdated: string;
}

/* ──────────────── CMC / Coins ──────────────── */
export interface CmcCoin {
  id: number;
  rank: number;
  name: string;
  symbol: string;
  slug: string;
  imageUrl: string;
  price: number;
  marketCap: number;
  volume24h: number;
  change24h: number | null;
  change7d: number | null;
  change30d: number | null;
  circulatingSupply: number;
  maxSupply: number | null;
  lastUpdated: string;
}
export interface CmcCoinsResponse {
  coins: CmcCoin[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  lastUpdated: string;
  source: string;
}
export interface CmcSummaryResponse {
  coinCount: number;
  totalMarketCap: number;
  btcDominance: number;
  lastUpdated: string;
}

/* ──────────────── Coin detail / live ──────────────── */
export interface CoinDetail {
  id: string;
  name: string;
  symbol: string;
  image: string;
  price: number;
  change24h: number | null;
  change7d: number | null;
  marketCap: number;
  volume24h: number;
  ath: number | null;
  atl: number | null;
  circulatingSupply: number;
  maxSupply: number | null;
  description?: string;
  rank: number;
}
export interface LivePriceSource {
  price: number;
  detail?: string;
  pair?: string;
}
export interface LivePriceResponse {
  slug: string;
  symbol: string;
  referencePrice: number;
  syncLabel: string;
  change24h: number | null;
  lastUpdated: string;
  binance?: LivePriceSource;
  sources: { id: string; label: string; sub: string; quote?: { price: number; detail?: string } }[];
  outliersExcluded?: string[];
}
export interface BinancePriceResponse {
  slug: string;
  symbol: string;
  price: number;
  change24h: number | null;
  lastUpdated: string;
}

/* ──────────────── Chart ──────────────── */
export interface ChartCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}
export interface CoinChartResponse {
  slug: string;
  range: string;
  candles: ChartCandle[];
  source: string;
}

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

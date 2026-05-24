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

export interface CmcSummary {
  coinCount: number;
  totalMarketCap: number;
  totalVolume24h: number;
  btcDominance: number;
  ethDominance: number;
  lastUpdated: string;
}

export interface CoinDetail {
  id: string;
  slug: string;
  name: string;
  symbol: string;
  image: string;
  price: number;
  marketCap: number;
  volume24h: number;
  change24h: number | null;
  change7d: number | null;
  change30d: number | null;
  rank: number;
  description?: string;
}

export interface ChartPoint {
  time: number;
  price: number;
}

export interface CoinChartResponse {
  range: string;
  points: ChartPoint[];
  source: string;
}

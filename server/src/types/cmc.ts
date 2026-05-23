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

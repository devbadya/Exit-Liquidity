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

export interface FearGreedSnapshot {
  timestamp: string;
  value: number;
  classification: string;
  source: 'alternative.me' | 'composite';
}

export interface FearGreedHistory {
  range: string;
  points: FearGreedSnapshot[];
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

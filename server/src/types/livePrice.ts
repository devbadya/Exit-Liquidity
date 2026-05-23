export type LivePriceSource =
  | 'coingecko'
  | 'coinmarketcap'
  | 'binance'
  | 'hyperliquid'
  | 'uniswap';

export interface LivePriceQuote {
  price: number;
  change24h: number | null;
  updatedAt: string;
  source: LivePriceSource;
  /** Zusatzinfo (Binance-Paar, Uniswap-Pool, …) */
  detail?: string;
}

export type ComparisonStatus = 'aligned' | 'minor' | 'divergence' | 'outlier';

export interface SourceComparison {
  source: LivePriceSource;
  label: string;
  price: number;
  deviationPercent: number;
  deviationUsd: number;
  status: ComparisonStatus;
}

export interface LivePriceResponse {
  slug: string;
  symbol: string;
  name: string;
  coingecko: LivePriceQuote | null;
  coinmarketcap: LivePriceQuote | null;
  binance: LivePriceQuote | null;
  hyperliquid: LivePriceQuote | null;
  uniswap: LivePriceQuote | null;
  sourceCount: number;
  referencePrice: number;
  spreadPercent: number;
  spreadUsd: number;
  syncStatus: 'excellent' | 'good' | 'divergence' | 'partial';
  syncLabel: string;
  accuracyScore: number;
  comparison: SourceComparison[];
  outliersExcluded: string[];
  lastUpdated: string;
}

import type {
  NewsResponse,
  FearGreedResponse,
  MarketOverviewResponse,
  CmcCoinsResponse,
  CmcSummaryResponse,
  CoinDetail,
  LivePriceResponse,
  BinancePriceResponse,
  CoinChartResponse,
} from '../types';

const API = '/api';

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const fetchNews = (params?: { source?: string; category?: string }) => {
  const q = new URLSearchParams();
  if (params?.source) q.set('source', params.source);
  if (params?.category) q.set('category', params.category);
  return get<NewsResponse>(`/news?${q}`);
};

export const fetchFearGreed = () => get<FearGreedResponse>('/fear-greed');

export const fetchMarkets = () => get<MarketOverviewResponse>('/markets');

export const fetchCmcSummary = () => get<CmcSummaryResponse>('/cmc/summary');

export const fetchCmcCoins = (params?: { page?: number; limit?: number; search?: string }) => {
  const q = new URLSearchParams();
  q.set('page', String(params?.page ?? 1));
  q.set('limit', String(params?.limit ?? 50));
  if (params?.search) q.set('search', params.search);
  return get<CmcCoinsResponse>(`/cmc/coins?${q}`);
};

export const fetchCoinDetail = (slug: string) => get<CoinDetail>(`/coin/${encodeURIComponent(slug)}`);

export const fetchCoinLive = (slug: string) => get<LivePriceResponse>(`/coin/${encodeURIComponent(slug)}/live`);

export const fetchBinancePrice = (slug: string) => get<BinancePriceResponse>(`/coin/${encodeURIComponent(slug)}/binance`);

export const fetchCoinChart = (slug: string, range: string) =>
  get<CoinChartResponse>(`/coin/${encodeURIComponent(slug)}/chart?range=${range}`);

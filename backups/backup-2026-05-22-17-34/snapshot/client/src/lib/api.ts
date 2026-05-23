import type { FearGreedResponse, NewsResponse } from '../types';

const API = '/api';

export async function fetchNews(params?: { source?: string; category?: string }): Promise<NewsResponse> {
  const q = new URLSearchParams();
  if (params?.source) q.set('source', params.source);
  if (params?.category) q.set('category', params.category);
  const res = await fetch(`${API}/news?${q}`);
  if (!res.ok) throw new Error('News konnte nicht geladen werden');
  return res.json();
}

export async function fetchFearGreed(): Promise<FearGreedResponse> {
  const res = await fetch(`${API}/fear-greed`);
  if (!res.ok) throw new Error('Fear & Greed konnte nicht geladen werden');
  return res.json();
}

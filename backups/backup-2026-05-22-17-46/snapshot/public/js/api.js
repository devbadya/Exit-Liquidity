/** TokenSync — API-Aufrufe */
const API = '/api';

async function fetchNews(params) {
  const q = new URLSearchParams();
  if (params?.source) q.set('source', params.source);
  if (params?.category) q.set('category', params.category);
  const res = await fetch(`${API}/news?${q}`);
  if (!res.ok) throw new Error('News konnten nicht geladen werden');
  return res.json();
}

async function fetchFearGreed() {
  const res = await fetch(`${API}/fear-greed`);
  if (!res.ok) throw new Error('Fear & Greed konnte nicht geladen werden');
  return res.json();
}

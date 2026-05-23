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

async function fetchMarkets() {
  const res = await fetch(`${API}/markets`);
  if (!res.ok) throw new Error('Marktdaten konnten nicht geladen werden');
  return res.json();
}

async function fetchCmcSummary() {
  const res = await fetch(`${API}/cmc/summary`);
  if (!res.ok) throw new Error('CMC Summary nicht verfügbar');
  return res.json();
}

async function fetchCoinDetail(slug) {
  const res = await fetch(`${API}/coin/${encodeURIComponent(slug)}`);
  if (!res.ok) throw new Error('Coin nicht gefunden');
  return res.json();
}

async function fetchCoinLive(slug) {
  const res = await fetch(`${API}/coin/${encodeURIComponent(slug)}/live`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Live-Kurs nicht verfügbar');
  }
  return res.json();
}

/** Paper-Trading: Live-Kurs direkt von Binance Spot */
async function fetchBinancePrice(slug) {
  const res = await fetch(`${API}/coin/${encodeURIComponent(slug)}/binance`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Binance-Kurs nicht verfügbar');
  }
  return res.json();
}

async function fetchCoinChart(slug, range) {
  const res = await fetch(`${API}/coin/${encodeURIComponent(slug)}/chart?range=${range}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Chart konnte nicht geladen werden');
  }
  return res.json();
}

async function fetchCmcLive(limit = 100) {
  const res = await fetch(`${API}/cmc/live?limit=${limit}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Live-Kurse nicht verfügbar');
  }
  return res.json();
}

async function fetchCmcList() {
  const res = await fetch(`${API}/cmc/list`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'CoinMarketCap-Liste nicht verfügbar');
  }
  return res.json();
}

async function fetchCmcCoins(params) {
  const q = new URLSearchParams();
  q.set('page', String(params?.page ?? 1));
  q.set('limit', String(params?.limit ?? 50));
  if (params?.search) q.set('search', params.search);
  const res = await fetch(`${API}/cmc/coins?${q}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'CoinMarketCap-Daten konnten nicht geladen werden');
  }
  return res.json();
}

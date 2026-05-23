/** TokenSync — Hilfsfunktionen */
const PLACEHOLDER_IMG =
  'https://images.unsplash.com/photo-1639765488507-f0f7350f4577?w=800&q=80';

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'gerade eben';
  if (mins < 60) return `vor ${mins} Min.`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `vor ${hrs} Std.`;
  const days = Math.floor(hrs / 24);
  return `vor ${days} Tag${days > 1 ? 'en' : ''}`;
}

/** Trading-UI (Hyperliquid, Binance, CMC): dynamische Dezimalstellen */
function formatUsd(n, compact) {
  if (n == null || !Number.isFinite(n)) return '—';
  if (compact && n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (compact && n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (compact && n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;

  const abs = Math.abs(n);
  let maxFrac = 2;
  if (abs < 0.0000001) maxFrac = 12;
  else if (abs < 0.00001) maxFrac = 10;
  else if (abs < 0.01) maxFrac = 8;
  else if (abs < 1) maxFrac = 6;
  else if (abs < 100) maxFrac = 4;
  else if (abs < 10000) maxFrac = 3;

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: maxFrac,
  }).format(n);
}

function formatPct(n) {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

function fgColor(value) {
  if (value <= 24) return '#ef4444';
  if (value <= 44) return '#f97316';
  if (value <= 55) return '#eab308';
  if (value <= 74) return '#84cc16';
  return '#22c55e';
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function imgOnError(img) {
  img.onerror = null;
  img.src = PLACEHOLDER_IMG;
}

function pctClass(v) {
  if (v == null) return '';
  return v >= 0 ? 'delta-up' : 'delta-down';
}

function formatPctOrDash(v) {
  if (v == null || Number.isNaN(v)) return '—';
  return formatPct(v);
}

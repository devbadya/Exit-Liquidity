export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'gerade eben';
  if (mins < 60) return `vor ${mins} Min.`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `vor ${hrs} Std.`;
  const days = Math.floor(hrs / 24);
  return `vor ${days} Tag${days > 1 ? 'en' : ''}`;
}

export function formatUsd(n: number, compact = false): string {
  if (compact && n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (compact && n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (compact && n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: n < 100 ? 2 : 0 }).format(n);
}

export function formatPct(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

export function fgColor(value: number): string {
  if (value <= 24) return '#ef4444';
  if (value <= 44) return '#f97316';
  if (value <= 55) return '#eab308';
  if (value <= 74) return '#84cc16';
  return '#22c55e';
}

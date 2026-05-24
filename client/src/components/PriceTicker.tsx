import { useCallback } from 'react';
import { usePolling } from '../hooks/usePolling';
import { fetchMarkets } from '../lib/api';
import { formatUsd, formatPct } from '../lib/format';

export function PriceTicker() {
  const { data } = usePolling(useCallback(() => fetchMarkets(), []), 60_000);

  const coins = data?.topCoins?.slice(0, 10) ?? [];
  if (coins.length === 0) {
    return (
      <div className="h-9 bg-[var(--bg-1)] border-b border-[var(--b0)]" />
    );
  }

  // Duplicate for seamless loop
  const items = [...coins, ...coins];

  return (
    <div className="h-9 bg-[var(--bg-1)] border-b border-[var(--b1)] flex items-center overflow-hidden relative z-50">
      <div className="ticker-wrap flex-1">
        <div className="ticker-track">
          {items.map((c, i) => (
            <span key={`${c.id}-${i}`} className="ticker-item">
              <span className="sym">{c.symbol}</span>
              <span className="price">{formatUsd(c.price)}</span>
              {c.change24h !== null && (
                <span className={`num text-[11px] ${c.change24h >= 0 ? 'up' : 'dn'}`}>
                  {formatPct(c.change24h)}
                </span>
              )}
            </span>
          ))}
        </div>
      </div>
      <div className="shrink-0 px-3 hidden sm:flex items-center gap-1.5 border-l border-[var(--b1)] h-full text-[11px] text-[var(--t2)]">
        <div className="status-live" />
        <span>Live</span>
      </div>
    </div>
  );
}

import { TrendingDown, TrendingUp } from 'lucide-react';
import type { MarketContext } from '../types';
import { formatPct, formatUsd } from '../lib/format';

interface Props { market: MarketContext; }

export function MarketStrip({ market }: Props) {
  const items = [
    { label: 'Bitcoin',       value: formatUsd(market.btcPrice),             change: market.btcChange24h,       sym: 'BTC' },
    { label: 'Ethereum',      value: formatUsd(market.ethPrice),             change: market.ethChange24h,       sym: 'ETH' },
    { label: 'Market Cap',    value: formatUsd(market.totalMarketCap, true), change: market.marketCapChange24h, sym: 'MKT' },
    { label: 'BTC Dominanz',  value: `${market.btcDominance.toFixed(1)}%`,  change: null,                      sym: 'DOM' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {items.map(({ label, value, change, sym }) => {
        const up = change !== null && change >= 0;
        return (
          <div key={label} className="stat-card">
            <div className="flex items-center justify-between mb-3">
              <span className="t-label">{sym}</span>
              {change !== null && (
                <span className={`flex items-center gap-1 text-[11px] num font-semibold ${up ? 'up' : 'dn'}`}>
                  {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {formatPct(change)}
                </span>
              )}
            </div>
            <p className="num font-bold text-[var(--t0)] text-lg truncate">{value}</p>
            <p className="text-xs text-[var(--t1)] mt-0.5">{label}</p>
          </div>
        );
      })}
    </div>
  );
}

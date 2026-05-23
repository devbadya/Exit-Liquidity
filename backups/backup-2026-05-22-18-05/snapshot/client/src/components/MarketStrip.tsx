import { Bitcoin, TrendingUp, TrendingDown, Globe } from 'lucide-react';
import type { MarketContext } from '../types';
import { formatPct, formatUsd } from '../lib/format';

interface Props {
  market: MarketContext;
}

export function MarketStrip({ market }: Props) {
  const items = [
    { label: 'Bitcoin', value: formatUsd(market.btcPrice), change: market.btcChange24h, icon: Bitcoin },
    { label: 'Ethereum', value: formatUsd(market.ethPrice), change: market.ethChange24h, icon: TrendingUp },
    { label: 'Market Cap', value: formatUsd(market.totalMarketCap, true), change: market.marketCapChange24h, icon: Globe },
    { label: 'BTC Dominance', value: `${market.btcDominance.toFixed(1)}%`, change: null, icon: TrendingDown },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {items.map(({ label, value, change, icon: Icon }) => (
        <div key={label} className="glass rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-500 text-xs mb-2">
            <Icon className="w-3.5 h-3.5" />
            {label}
          </div>
          <p className="text-lg font-semibold text-white tabular-nums">{value}</p>
          {change !== null && (
            <p className={`text-xs mt-1 tabular-nums ${change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {formatPct(change)} (24h)
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

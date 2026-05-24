import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Button, Chip, Spinner } from '@heroui/react';
import { fetchMarkets } from '../lib/api';
import { usePolling } from '../hooks/usePolling';
import { SectionHeader } from '../components/SectionHeader';
import { timeAgo, formatUsd, formatPct } from '../lib/format';
import { TrendingUp, TrendingDown } from 'lucide-react';
import type { CoinRow } from '../types';

type Tab = 'overview' | 'gainers' | 'losers' | 'categories';
const TABS: { id: Tab; label: string }[] = [
  { id: 'overview',   label: 'Übersicht'  },
  { id: 'gainers',    label: 'Top Gainer' },
  { id: 'losers',     label: 'Top Loser'  },
  { id: 'categories', label: 'Kategorien' },
];

function PctBadge({ value }: { value: number | null }) {
  if (value == null) return <span className="text-slate-600">—</span>;
  return (
    <span className={`font-medium tabular-nums text-sm ${value >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
      {formatPct(value)}
    </span>
  );
}

function CoinTable({ coins, title }: { coins: CoinRow[]; title?: string }) {
  return (
    <Card className="glass border-0 rounded-2xl overflow-hidden">
      {title && (
        <div className="p-4 border-b border-slate-800">
          <h3 className="font-semibold text-white">{title}</h3>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-slate-500 text-xs uppercase tracking-wider border-b border-slate-800">
              <th className="text-left py-3 px-4">#</th>
              <th className="text-left py-3 px-2">Name</th>
              <th className="text-right py-3 px-4">Preis</th>
              <th className="text-right py-3 px-4">24h</th>
              <th className="text-right py-3 px-4 hidden md:table-cell">7d</th>
              <th className="text-right py-3 px-4 hidden lg:table-cell">Market Cap</th>
            </tr>
          </thead>
          <tbody>
            {coins.map((c) => (
              <tr key={c.id} className="border-b border-slate-800/60 hover:bg-slate-800/20 transition-colors">
                <td className="py-3 px-4 text-slate-500">{c.rank}</td>
                <td className="py-3 px-2">
                  <Link to={`/coin/${c.id}`} className="flex items-center gap-2 group hover:text-[#22d3ee]">
                    <img src={c.image} alt="" className="w-6 h-6 rounded-full" loading="lazy" />
                    <span className="font-medium text-white group-hover:text-[#22d3ee]">{c.name}</span>
                    <span className="text-slate-500 text-xs">{c.symbol}</span>
                  </Link>
                </td>
                <td className="py-3 px-4 text-right font-medium text-white tabular-nums">{formatUsd(c.price)}</td>
                <td className="py-3 px-4 text-right"><PctBadge value={c.change24h} /></td>
                <td className="py-3 px-4 text-right hidden md:table-cell"><PctBadge value={c.change7d} /></td>
                <td className="py-3 px-4 text-right hidden lg:table-cell text-slate-400 tabular-nums">{formatUsd(c.marketCap, true)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export function Markets() {
  const [tab, setTab] = useState<Tab>('overview');
  const { data, loading, error } = usePolling(useCallback(() => fetchMarkets(), []), 120_000);

  return (
    <div className="space-y-8">
      <SectionHeader
        title="Markets"
        subtitle={data ? `${data.sources.join(', ')} · ${timeAgo(data.lastUpdated)}` : ''}
      />

      {/* Global stats */}
      {data?.global && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Market Cap',    value: formatUsd(data.global.totalMarketCap, true),  change: data.global.marketCapChange24h },
            { label: 'Volume 24h',    value: formatUsd(data.global.totalVolume24h, true),  change: null },
            { label: 'BTC Dominanz',  value: `${data.global.btcDominance.toFixed(1)}%`,   change: null },
            { label: 'ETH Dominanz',  value: `${data.global.ethDominance.toFixed(1)}%`,   change: null },
            { label: 'Aktive Coins',  value: data.global.activeCryptos.toLocaleString(),  change: null },
            { label: 'DeFi Cap',      value: formatUsd(data.global.defiMarketCap, true),  change: data.global.defiChange24h },
          ].map(({ label, value, change }) => (
            <Card key={label} className="glass border-0 rounded-xl p-3">
              <p className="text-[11px] text-slate-500 mb-1">{label}</p>
              <p className="font-semibold text-white text-sm tabular-nums">{value}</p>
              {change != null && <PctBadge value={change} />}
            </Card>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map((t) => (
          <Button
            key={t.id}
            size="sm"
            variant={tab === t.id ? 'tertiary' : 'outline'}
            className={tab === t.id ? 'bg-[#22d3ee]/15 text-[#22d3ee] border-[#22d3ee]/30' : 'text-slate-400 border-slate-700'}
            onPress={() => setTab(t.id)}
          >
            {t.label}
          </Button>
        ))}
      </div>

      {loading && !data && <div className="flex justify-center py-24"><Spinner size="lg" /></div>}
      {error && <p className="text-red-400 text-sm">{error}</p>}

      {data && (
        <>
          {tab === 'overview' && (
            <div className="space-y-6">
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Dominance bar */}
                <Card className="glass border-0 rounded-2xl p-6">
                  <h3 className="font-semibold text-white mb-4">Marktdominanz</h3>
                  <div className="flex h-5 rounded-full overflow-hidden mb-3">
                    {data.dominanceChart.map((s) => (
                      <div key={s.name} style={{ width: `${s.value}%`, background: s.color }}
                        title={`${s.name} ${s.value.toFixed(1)}%`} />
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {data.dominanceChart.map((s) => (
                      <div key={s.name} className="flex items-center gap-1.5 text-sm">
                        <span className="w-3 h-3 rounded-full" style={{ background: s.color }} />
                        <span className="text-slate-400">{s.name}</span>
                        <span className="text-white tabular-nums">{s.value.toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Altcoin Season + Avg */}
                <Card className="glass border-0 rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-white">Altcoin Season</h3>
                    <Chip size="sm" variant="soft" className="bg-[#22d3ee]/10 text-[#22d3ee]">
                      {data.altcoinSeason.classification}
                    </Chip>
                  </div>
                  <p className="text-4xl font-bold text-white tabular-nums mb-2">{data.altcoinSeason.index}</p>
                  <p className="text-sm text-slate-400 leading-relaxed">{data.altcoinSeason.description}</p>
                  <div className="mt-4 pt-4 border-t border-slate-800">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-white">Avg. Crypto Index</span>
                      <Chip size="sm" variant="soft" className="bg-[#a78bfa]/10 text-[#a78bfa]">
                        {data.averageCrypto.classification}
                      </Chip>
                    </div>
                    <p className="text-3xl font-bold text-white tabular-nums">{data.averageCrypto.score}</p>
                    <div className="flex gap-4 mt-1 text-xs text-slate-500">
                      <span>24h: <PctBadge value={data.averageCrypto.change24h} /></span>
                      <span>7d: <PctBadge value={data.averageCrypto.change7d} /></span>
                      <span>30d: <PctBadge value={data.averageCrypto.change30d} /></span>
                    </div>
                  </div>
                </Card>
              </div>
              <CoinTable coins={data.topCoins} title="Top Coins" />
            </div>
          )}

          {tab === 'gainers' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                <h3 className="font-semibold text-white">Top Gainer (24h)</h3>
              </div>
              <CoinTable coins={data.gainers} />
            </div>
          )}

          {tab === 'losers' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-red-400" />
                <h3 className="font-semibold text-white">Top Loser (24h)</h3>
              </div>
              <CoinTable coins={data.losers} />
            </div>
          )}

          {tab === 'categories' && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.categories.map((cat) => (
                <Card key={cat.name} className="glass border-0 rounded-xl p-4">
                  <p className="font-medium text-white text-sm">{cat.name}</p>
                  <p className="text-slate-400 text-sm mt-1 tabular-nums">{formatUsd(cat.marketCap, true)}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <PctBadge value={cat.marketCapChange24h} />
                    <span className="text-xs text-slate-500">(24h)</span>
                  </div>
                  <div className="flex gap-1 mt-3">
                    {cat.topCoins.slice(0, 3).map((img, i) => (
                      <img key={i} src={img} alt="" className="w-5 h-5 rounded-full" loading="lazy" />
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

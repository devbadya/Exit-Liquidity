import { useCallback, useState } from 'react';
import { Card, Button, Chip, Spinner } from '@heroui/react';
import { Info } from 'lucide-react';
import { fetchFearGreed } from '../lib/api';
import { usePolling } from '../hooks/usePolling';
import { SectionHeader } from '../components/SectionHeader';
import { FearGreedGauge } from '../components/FearGreedGauge';
import { FearGreedChart } from '../components/FearGreedChart';
import { ComponentBars } from '../components/ComponentBars';
import { MarketStrip } from '../components/MarketStrip';
import { timeAgo } from '../lib/format';

const RANGES = [
  { label: '7 Tage',  days: 7  },
  { label: '30 Tage', days: 30 },
  { label: '90 Tage', days: 90 },
] as const;

export function FearGreed() {
  const [chartDays, setChartDays] = useState<7 | 30 | 90>(30);
  const { data, error, loading } = usePolling(useCallback(() => fetchFearGreed(), []), 300_000);
  const delta = data?.current && data?.yesterday ? data.current.value - data.yesterday.value : null;

  return (
    <div className="space-y-10">
      <SectionHeader
        title="Fear & Greed Index"
        subtitle="Gauge, Historie, Komponenten & Live-Marktdaten"
      />

      {error && (
        <div className="glass rounded-xl p-4 border border-red-500/20">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {loading && !data
        ? <div className="flex justify-center py-24"><Spinner size="lg" /></div>
        : data && (
          <>
            {/* Gauge + stats */}
            <div className="grid lg:grid-cols-2 gap-6">
              <Card className="glass border-0 rounded-2xl p-8 flex flex-col items-center justify-center glow-cyan">
                <FearGreedGauge value={data.current.value} classification={data.current.classification} />
                <p className="text-xs text-slate-500 mt-6">
                  Quelle: {data.current.source} · {timeAgo(data.lastUpdated)}
                </p>
              </Card>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Heute',   value: data.current.value,       cls: 'text-white' },
                    { label: 'Gestern', value: data.yesterday?.value ?? '—', cls: 'text-slate-300' },
                  ].map(({ label, value, cls }) => (
                    <Card key={label} className="glass border-0 rounded-xl p-5">
                      <p className="text-xs text-slate-500 uppercase tracking-wider">{label}</p>
                      <p className={`text-3xl font-bold mt-2 tabular-nums ${cls}`}>{value}</p>
                      {label === 'Gestern' && delta !== null && (
                        <Chip size="sm" variant="soft"
                          className={`mt-1 ${delta >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                          {delta >= 0 ? '+' : ''}{delta} Punkte
                        </Chip>
                      )}
                    </Card>
                  ))}
                </div>

                <Card className="glass border-0 rounded-xl p-5 flex gap-3">
                  <Info className="w-5 h-5 text-[#22d3ee] shrink-0 mt-0.5" />
                  <p className="text-sm text-slate-400 leading-relaxed">
                    Der Crypto Fear & Greed Index fasst Volatilität, Momentum, Social Media,
                    Umfragen, Dominanz und Trends zusammen.
                    0 = Extreme Fear · 100 = Extreme Greed
                  </p>
                </Card>
              </div>
            </div>

            {/* Market strip */}
            <section>
              <h2 className="text-lg font-semibold text-white mb-4">Marktkontext</h2>
              <MarketStrip market={data.market} />
            </section>

            {/* Chart */}
            <Card className="glass border-0 rounded-2xl p-6">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <h2 className="text-lg font-semibold text-white">Historischer Verlauf</h2>
                <div className="flex gap-2">
                  {RANGES.map(({ label, days }) => (
                    <Button
                      key={days}
                      size="sm"
                      variant={chartDays === days ? 'tertiary' : 'outline'}
                      className={chartDays === days
                        ? 'bg-[#a78bfa]/20 text-[#a78bfa] border-[#a78bfa]/30'
                        : 'text-slate-400 border-slate-700'}
                      onPress={() => setChartDays(days)}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>
              <FearGreedChart history={data.history} days={chartDays} />
            </Card>

            {/* Components + table */}
            <div className="grid lg:grid-cols-2 gap-6">
              <Card className="glass border-0 rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-white mb-6">Index-Komponenten</h2>
                <ComponentBars components={data.components} />
              </Card>

              <Card className="glass border-0 rounded-2xl p-6 overflow-hidden">
                <h2 className="text-lg font-semibold text-white mb-4">Historie</h2>
                <div className="overflow-x-auto max-h-80 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="text-slate-500 text-xs uppercase tracking-wider sticky top-0 bg-[#151d2e]">
                      <tr>
                        <th className="text-left py-2 pr-4">Datum</th>
                        <th className="text-right py-2 px-2">Wert</th>
                        <th className="text-left py-2 pl-4">Stimmung</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.history.slice(0, chartDays).map((row) => (
                        <tr key={row.timestamp} className="border-t border-slate-800/80">
                          <td className="py-2.5 text-slate-400">
                            {new Date(row.timestamp).toLocaleDateString('de-DE')}
                          </td>
                          <td className="py-2.5 text-right font-medium text-white tabular-nums">{row.value}</td>
                          <td className="py-2.5 pl-4 text-slate-400">{row.classification}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          </>
        )}
    </div>
  );
}

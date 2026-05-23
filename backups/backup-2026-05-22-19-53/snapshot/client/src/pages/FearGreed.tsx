import { useCallback, useState } from 'react';
import { Info } from 'lucide-react';
import { fetchFearGreed } from '../lib/api';
import { usePolling } from '../hooks/usePolling';
import { LoadingState } from '../components/LoadingState';
import { SectionHeader } from '../components/SectionHeader';
import { FearGreedGauge } from '../components/FearGreedGauge';
import { FearGreedChart } from '../components/FearGreedChart';
import { ComponentBars } from '../components/ComponentBars';
import { MarketStrip } from '../components/MarketStrip';
import { timeAgo } from '../lib/format';

const RANGES = [
  { label: '7 Tage', days: 7 },
  { label: '30 Tage', days: 30 },
  { label: '90 Tage', days: 90 },
] as const;

export function FearGreed() {
  const [chartDays, setChartDays] = useState(30);
  const load = useCallback(() => fetchFearGreed(), []);
  const { data, error, loading } = usePolling(load, 300_000);

  if (loading && !data) return <LoadingState label="Fear & Greed wird geladen…" />;

  const delta =
    data?.current && data?.yesterday ? data.current.value - data.yesterday.value : null;

  return (
    <div className="space-y-10">
      <SectionHeader
        title="Fear & Greed Index"
        subtitle="Umfassende Marktstimmung — Gauge, Historie, Komponenten & Live-Marktdaten"
      />

      {error && <p className="text-red-400">{error}</p>}

      {data && (
        <>
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="glass rounded-2xl p-8 flex flex-col items-center justify-center glow-cyan">
              <FearGreedGauge
                value={data.current.value}
                classification={data.current.classification}
                size="lg"
              />
              <p className="text-xs text-slate-500 mt-6">Quelle: {data.current.source} · {timeAgo(data.lastUpdated)}</p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="glass rounded-xl p-5">
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Heute</p>
                  <p className="text-3xl font-bold text-white mt-2 tabular-nums">{data.current.value}</p>
                  <p className="text-sm text-slate-400 mt-1">{data.current.classification}</p>
                </div>
                <div className="glass rounded-xl p-5">
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Gestern</p>
                  <p className="text-3xl font-bold text-slate-300 mt-2 tabular-nums">
                    {data.yesterday?.value ?? '—'}
                  </p>
                  {delta !== null && (
                    <p className={`text-sm mt-1 tabular-nums ${delta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {delta >= 0 ? '+' : ''}{delta} Punkte
                    </p>
                  )}
                </div>
              </div>

              <div className="glass rounded-xl p-5 flex gap-3">
                <Info className="w-5 h-5 text-cyan-500 shrink-0 mt-0.5" />
                <p className="text-sm text-slate-400 leading-relaxed">
                  Der Crypto Fear & Greed Index fasst Volatilität, Momentum, Social Media,
                  Umfragen, Dominanz und Trends zusammen. 0 = Extreme Fear, 100 = Extreme Greed.
                  TokenSync ergänzt einen Composite-Score aus Live-Marktdaten.
                </p>
              </div>
            </div>
          </div>

          <section>
            <h2 className="text-lg font-semibold text-white mb-4">Marktkontext</h2>
            <MarketStrip market={data.market} />
          </section>

          <section className="glass rounded-2xl p-6">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <h2 className="text-lg font-semibold text-white">Historischer Verlauf</h2>
              <div className="flex gap-2">
                {RANGES.map(({ label, days }) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setChartDays(days)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      chartDays === days
                        ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                        : 'text-slate-400 border border-slate-800 hover:border-slate-600'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <FearGreedChart history={data.history} days={chartDays} />
          </section>

          <div className="grid lg:grid-cols-2 gap-6">
            <section className="glass rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-white mb-6">Index-Komponenten</h2>
              <ComponentBars components={data.components} />
            </section>

            <section className="glass rounded-2xl p-6 overflow-hidden">
              <h2 className="text-lg font-semibold text-white mb-4">Historie (Tabelle)</h2>
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
            </section>
          </div>
        </>
      )}
    </div>
  );
}

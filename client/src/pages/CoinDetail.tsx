import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { Card, Button, Chip, Spinner } from '@heroui/react';
import { fetchCoinDetail, fetchCoinLive, fetchCoinChart } from '../lib/api';
import type { CoinDetail as CoinDetailType, LivePriceResponse, CoinChartResponse } from '../types';
import { formatUsd, formatPct, timeAgo } from '../lib/format';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

const RANGES = ['1h', '24h', '7d', '30d', '3m', '1y', 'max'] as const;
type Range = typeof RANGES[number];

function PctBadge({ value }: { value: number | null }) {
  if (value == null) return <Chip size="sm" variant="soft" className="bg-slate-800 text-slate-500">—</Chip>;
  return (
    <Chip size="sm" variant="soft"
      className={value >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}>
      {formatPct(value)}
    </Chip>
  );
}

export function CoinDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [detail, setDetail]   = useState<CoinDetailType | null>(null);
  const [live,   setLive]     = useState<LivePriceResponse | null>(null);
  const [chart,  setChart]    = useState<CoinChartResponse | null>(null);
  const [range,  setRange]    = useState<Range>('24h');
  const [loading, setLoading] = useState(true);
  const liveTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    void Promise.allSettled([
      fetchCoinDetail(slug),
      fetchCoinLive(slug),
      fetchCoinChart(slug, '24h'),
    ]).then(([d, l, c]) => {
      if (d.status === 'fulfilled') setDetail(d.value);
      if (l.status === 'fulfilled') setLive(l.value);
      if (c.status === 'fulfilled') setChart(c.value);
      setLoading(false);
    });
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    void fetchCoinChart(slug, range).then(setChart).catch(() => {});
  }, [slug, range]);

  useEffect(() => {
    if (!slug) return;
    liveTimer.current = setInterval(() => {
      void fetchCoinLive(slug).then(setLive).catch(() => {});
    }, 10_000);
    return () => { if (liveTimer.current) clearInterval(liveTimer.current); };
  }, [slug]);

  if (loading) return <div className="flex justify-center py-24"><Spinner size="lg" /></div>;
  if (!detail && !live) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-400 mb-4">Coin nicht gefunden.</p>
        <Link to="/coins">
          <Button variant="outline" className="border-slate-700 text-slate-400">
            <ArrowLeft className="w-4 h-4 mr-1" /> Alle Coins
          </Button>
        </Link>
      </div>
    );
  }

  const name   = detail?.name   ?? live?.symbol ?? slug ?? '';
  const symbol = detail?.symbol ?? live?.symbol ?? '';
  const price  = live?.referencePrice ?? detail?.price ?? 0;
  const change = live?.change24h ?? detail?.change24h ?? null;

  const chartData = (chart?.candles ?? []).map((c) => ({
    time:  new Date(c.time * 1000).toLocaleDateString('de-DE', { month: 'short', day: '2-digit' }),
    close: c.close,
  }));

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <Link to="/coins" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-[#22d3ee]">
        <ArrowLeft className="w-4 h-4" /> Alle Coins
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        {detail?.image && (
          <img src={detail.image} alt={name} className="w-14 h-14 rounded-full shrink-0" />
        )}
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold text-white">{name}</h1>
            <Chip size="sm" variant="soft" className="bg-slate-800 text-slate-400">{symbol}</Chip>
            {detail && <Chip size="sm" variant="soft" className="bg-slate-800 text-slate-500">#{detail.rank}</Chip>}
          </div>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <span className="text-3xl font-bold text-white tabular-nums">{formatUsd(price)}</span>
            <PctBadge value={change} />
            {live && (
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <RefreshCw className="w-3 h-3 animate-spin" style={{ animationDuration: '3s' }} />
                Live · {timeAgo(live.lastUpdated)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Chart */}
      <Card className="glass border-0 rounded-2xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h2 className="font-semibold text-white">Kursverlauf</h2>
          <div className="flex gap-1.5 flex-wrap">
            {RANGES.map((r) => (
              <Button key={r} size="sm"
                variant={range === r ? 'tertiary' : 'outline'}
                className={`uppercase text-xs ${range === r
                  ? 'bg-[#22d3ee]/15 text-[#22d3ee] border-[#22d3ee]/30'
                  : 'text-slate-400 border-slate-700'}`}
                onPress={() => setRange(r)}>
                {r}
              </Button>
            ))}
          </div>
        </div>
        {chartData.length > 0 ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="coinGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#22d3ee" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#22d3ee" stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={['auto', 'auto']} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} width={64}
                  tickFormatter={(v: number) => formatUsd(v, true)} />
                <Tooltip
                  contentStyle={{ background: '#151d2e', border: '1px solid #334155', borderRadius: '12px', fontSize: '12px' }}
                  formatter={(v) => [formatUsd(typeof v === 'number' ? v : 0), 'Preis']}
                  labelStyle={{ color: '#94a3b8' }}
                />
                <Area type="monotone" dataKey="close" stroke="#22d3ee" strokeWidth={2} fill="url(#coinGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : <div className="flex justify-center py-12"><Spinner /></div>}
      </Card>

      {/* Stats */}
      {detail && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: '24h',        value: <PctBadge value={detail.change24h} /> },
            { label: '7d',         value: <PctBadge value={detail.change7d} />  },
            { label: 'Market Cap', value: <span className="text-white text-sm">{formatUsd(detail.marketCap, true)}</span> },
            { label: 'Vol. 24h',   value: <span className="text-white text-sm">{formatUsd(detail.volume24h, true)}</span> },
            { label: 'ATH',        value: <span className="text-white text-sm">{detail.ath ? formatUsd(detail.ath) : '—'}</span> },
            { label: 'ATL',        value: <span className="text-white text-sm">{detail.atl ? formatUsd(detail.atl) : '—'}</span> },
            { label: 'Umlauf',     value: <span className="text-white text-sm">{detail.circulatingSupply.toLocaleString('en')}</span> },
            { label: 'Max Supply', value: <span className="text-white text-sm">{detail.maxSupply ? detail.maxSupply.toLocaleString('en') : '∞'}</span> },
          ].map(({ label, value }) => (
            <Card key={label} className="glass border-0 rounded-xl p-4">
              <p className="text-xs text-slate-500 mb-1.5">{label}</p>
              {value}
            </Card>
          ))}
        </div>
      )}

      {/* Live sources */}
      {live?.sources && live.sources.length > 0 && (
        <Card className="glass border-0 rounded-2xl p-6">
          <h2 className="font-semibold text-white mb-4">Live-Kursquellen</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {live.sources.map((src) => (
              <div key={src.id} className="glass rounded-xl p-3 border border-slate-800">
                <p className="text-sm font-medium text-white">{src.label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{src.sub}</p>
                {src.quote && (
                  <p className="text-sm text-[#22d3ee] tabular-nums mt-1">{formatUsd(src.quote.price)}</p>
                )}
              </div>
            ))}
          </div>
          {live.syncLabel && <p className="text-xs text-slate-600 mt-3">Sync: {live.syncLabel}</p>}
        </Card>
      )}
    </div>
  );
}

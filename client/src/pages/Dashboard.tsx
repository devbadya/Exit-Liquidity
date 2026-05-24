import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, BarChart3, Coins, TrendingDown, TrendingUp } from 'lucide-react';
import { Spinner } from '@heroui/react';
import { fetchNews, fetchFearGreed, fetchMarkets } from '../lib/api';
import { usePolling } from '../hooks/usePolling';
import { NewsCard } from '../components/NewsCard';
import { FearGreedGauge } from '../components/FearGreedGauge';
import { timeAgo, formatPct, formatUsd } from '../lib/format';

function StatCard({
  label, value, sub, color = 'var(--cyan)', delay = '0s',
}: { label: string; value: string; sub?: string; color?: string; delay?: string }) {
  return (
    <div className="stat-card animate-fade-up" style={{ animationDelay: delay }}>
      <p className="t-label mb-3">{label}</p>
      <p className="num font-bold text-[var(--t0)] truncate" style={{ fontSize: 'clamp(1.1rem,2.5vw,1.5rem)', color }}>
        {value}
      </p>
      {sub && <p className="text-xs text-[var(--t1)] mt-1 num">{sub}</p>}
    </div>
  );
}

function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <h2 className="t-h2 text-[var(--t0)]">{children}</h2>
      {action}
    </div>
  );
}

export function Dashboard() {
  const news = usePolling(useCallback(() => fetchNews(), []),     60_000);
  const fg   = usePolling(useCallback(() => fetchFearGreed(), []), 300_000);
  const mk   = usePolling(useCallback(() => fetchMarkets(), []),   300_000);

  const delta = fg.data?.current && fg.data?.yesterday
    ? fg.data.current.value - fg.data.yesterday.value
    : null;

  const featured   = news.data?.articles.slice(0, 2) ?? [];
  const topStories = news.data?.articles.slice(2, 8) ?? [];
  const gainers    = mk.data?.gainers?.slice(0, 5) ?? [];
  const losers     = mk.data?.losers?.slice(0, 5) ?? [];

  return (
    <div className="space-y-16">

      {/* ── Hero ─────────────────────────────────────── */}
      <section className="pt-2 pb-2 animate-fade-up">
        <div className="flex items-center gap-2 mb-5">
          <div className="status-live" />
          <span className="t-label" style={{ color: 'var(--cyan)' }}>Live · aktualisiert jede Minute</span>
        </div>

        <h1 className="t-hero text-[var(--t0)] mb-3">
          Crypto Intelligence
          <span className="block grad-text">in Echtzeit.</span>
        </h1>
        <p className="text-[var(--t1)] text-lg max-w-2xl leading-relaxed">
          News aus {news.data?.sourcesActive ?? '…'} Quellen,
          Fear & Greed Index, Live-Kurse und Paper Trading —
          alles auf einem Dashboard.
        </p>

        <div className="flex flex-wrap gap-3 mt-7">
          <Link to="/markets"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-[var(--bg-0)] transition-all hover:opacity-90 hover:scale-[1.02]"
            style={{ background: 'linear-gradient(135deg, var(--cyan), #0099cc)' }}>
            Markets erkunden <ArrowRight className="w-4 h-4" />
          </Link>
          <Link to="/news"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-[var(--t0)] border border-[var(--b2)] hover:border-[var(--cyan)]/40 hover:bg-[var(--bg-3)] transition-all">
            Alle News
          </Link>
        </div>
      </section>

      {/* ── Market stats ─────────────────────────────── */}
      {(fg.data?.market || mk.data?.global) && (
        <section>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {fg.data?.market && <>
              <StatCard
                label="Bitcoin"
                value={formatUsd(fg.data.market.btcPrice)}
                sub={`${formatPct(fg.data.market.btcChange24h)} 24h`}
                color={fg.data.market.btcChange24h >= 0 ? 'var(--green)' : 'var(--red)'}
                delay=".05s"
              />
              <StatCard
                label="Ethereum"
                value={formatUsd(fg.data.market.ethPrice)}
                sub={`${formatPct(fg.data.market.ethChange24h)} 24h`}
                color={fg.data.market.ethChange24h >= 0 ? 'var(--green)' : 'var(--red)'}
                delay=".1s"
              />
            </>}
            {mk.data?.global && <>
              <StatCard
                label="Total Market Cap"
                value={formatUsd(mk.data.global.totalMarketCap, true)}
                sub={`${formatPct(mk.data.global.marketCapChange24h)} 24h`}
                color="var(--t0)"
                delay=".15s"
              />
              <StatCard
                label="BTC Dominanz"
                value={`${mk.data.global.btcDominance.toFixed(1)}%`}
                sub={`${mk.data.global.activeCryptos.toLocaleString()} aktive Coins`}
                color="var(--amber)"
                delay=".2s"
              />
            </>}
          </div>
        </section>
      )}

      {/* ── F&G + Gainers/Losers ─────────────────────── */}
      <section className="grid lg:grid-cols-3 gap-6">

        {/* Fear & Greed */}
        <div className="card-pro p-6 border-grad glow-c animate-fade-up anim-d1">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="t-label mb-1">Fear & Greed Index</p>
              <p className="text-[var(--t1)] text-sm">
                {fg.data ? timeAgo(fg.data.lastUpdated) : '—'}
              </p>
            </div>
            <Link to="/fear-greed"
              className="flex items-center gap-1 text-xs text-[var(--cyan)] hover:opacity-80">
              Details <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {fg.loading && !fg.data
            ? <div className="flex justify-center py-10"><Spinner /></div>
            : fg.data ? (
              <div className="flex flex-col items-center">
                <FearGreedGauge value={fg.data.current.value} classification={fg.data.current.classification} size="sm" />
                {delta !== null && (
                  <div className={`mt-4 flex items-center gap-1.5 text-sm font-semibold num ${delta >= 0 ? 'up' : 'dn'}`}>
                    {delta >= 0
                      ? <TrendingUp className="w-4 h-4" />
                      : <TrendingDown className="w-4 h-4" />}
                    {delta >= 0 ? '+' : ''}{delta} vs. gestern
                  </div>
                )}
                <div className="w-full mt-4 pt-4 border-t border-[var(--b1)] grid grid-cols-2 gap-3 text-sm">
                  {[
                    { k: 'Heute',   v: fg.data.current.value         },
                    { k: 'Gestern', v: fg.data.yesterday?.value ?? '—'},
                  ].map(({ k, v }) => (
                    <div key={k} className="text-center bg-[var(--bg-2)] rounded-xl p-3">
                      <p className="t-label mb-1">{k}</p>
                      <p className="num text-xl font-bold text-[var(--t0)]">{v}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : <p className="text-[var(--t2)] text-sm">{fg.error}</p>}
        </div>

        {/* Gainers */}
        <div className="card-pro p-6 animate-fade-up anim-d2">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" style={{ color: 'var(--green)' }} />
              <p className="font-semibold text-[var(--t0)]">Top Gainer</p>
            </div>
            <Link to="/markets" className="text-xs text-[var(--cyan)] hover:opacity-80 flex items-center gap-1">
              Alle <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          {mk.loading && !mk.data
            ? <div className="space-y-2">{[1,2,3,4,5].map(i => <div key={i} className="skeleton h-10 rounded-lg" />)}</div>
            : gainers.length > 0 ? (
              <div className="space-y-1">
                {gainers.map((c) => (
                  <Link key={c.id} to={`/coin/${c.id}`}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--bg-4)] transition-colors group">
                    <img src={c.image} alt="" className="w-7 h-7 rounded-full" loading="lazy" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--t0)] truncate group-hover:text-[var(--cyan)] transition-colors">{c.name}</p>
                      <p className="text-xs text-[var(--t2)]">{c.symbol}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs num text-[var(--t0)]">{formatUsd(c.price)}</p>
                      <p className="text-xs num up font-semibold">{formatPct(c.change24h ?? 0)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : <p className="text-[var(--t2)] text-sm">Keine Daten</p>}
        </div>

        {/* Losers */}
        <div className="card-pro p-6 animate-fade-up anim-d3">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4" style={{ color: 'var(--red)' }} />
              <p className="font-semibold text-[var(--t0)]">Top Loser</p>
            </div>
            <Link to="/markets" className="text-xs text-[var(--cyan)] hover:opacity-80 flex items-center gap-1">
              Alle <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          {mk.loading && !mk.data
            ? <div className="space-y-2">{[1,2,3,4,5].map(i => <div key={i} className="skeleton h-10 rounded-lg" />)}</div>
            : losers.length > 0 ? (
              <div className="space-y-1">
                {losers.map((c) => (
                  <Link key={c.id} to={`/coin/${c.id}`}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--bg-4)] transition-colors group">
                    <img src={c.image} alt="" className="w-7 h-7 rounded-full" loading="lazy" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--t0)] truncate group-hover:text-[var(--cyan)] transition-colors">{c.name}</p>
                      <p className="text-xs text-[var(--t2)]">{c.symbol}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs num text-[var(--t0)]">{formatUsd(c.price)}</p>
                      <p className="text-xs num dn font-semibold">{formatPct(c.change24h ?? 0)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : <p className="text-[var(--t2)] text-sm">Keine Daten</p>}
        </div>
      </section>

      {/* ── Top News ─────────────────────────────────── */}
      <section>
        <SectionTitle
          action={
            <Link to="/news" className="flex items-center gap-1.5 text-sm text-[var(--cyan)] hover:opacity-80">
              Alle News <ArrowRight className="w-4 h-4" />
            </Link>
          }
        >
          Top Stories
        </SectionTitle>

        {news.loading && !news.data ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="card-pro overflow-hidden">
                <div className="skeleton h-44 rounded-t-2xl rounded-b-none" />
                <div className="p-4 space-y-2">
                  <div className="skeleton h-3 w-1/3" />
                  <div className="skeleton h-4 w-full" />
                  <div className="skeleton h-4 w-4/5" />
                </div>
              </div>
            ))}
          </div>
        ) : news.data && (
          <>
            {/* Featured: 2-column */}
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              {featured.map((a) => <NewsCard key={a.id} article={a} featured />)}
            </div>
            {/* Regular grid */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {topStories.map((a) => <NewsCard key={a.id} article={a} />)}
            </div>
          </>
        )}
      </section>

      {/* ── Quick nav cards ───────────────────────────── */}
      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            to: '/markets', icon: TrendingUp, label: 'Markets',
            sub: 'Globale Übersicht, Dominanz & Altcoin Season',
            gradient: 'from-[#00d4ff]/10 to-transparent',
            accent: 'var(--cyan)',
          },
          {
            to: '/coins', icon: Coins, label: 'Alle Coins',
            sub: '1000+ Kryptowährungen mit Live-Daten',
            gradient: 'from-[#9b7dfa]/10 to-transparent',
            accent: 'var(--violet)',
          },
          {
            to: '/fear-greed', icon: BarChart3, label: 'Fear & Greed',
            sub: 'Vollständige Stimmungsanalyse + Chart',
            gradient: 'from-emerald-500/10 to-transparent',
            accent: 'var(--green)',
          },
          {
            to: '/paper', icon: TrendingUp, label: 'Paper Trade',
            sub: 'Long/Short mit echten Binance-Preisen',
            gradient: 'from-amber-500/10 to-transparent',
            accent: 'var(--amber)',
          },
        ].map(({ to, icon: Icon, label, sub, gradient, accent }) => (
          <Link key={to} to={to} className="group">
            <div className={`card-pro p-5 h-full bg-gradient-to-br ${gradient}`}>
              <div className="w-9 h-9 rounded-xl mb-4 flex items-center justify-center"
                style={{ background: `${accent}18`, border: `1px solid ${accent}30` }}>
                <Icon className="w-4.5 h-4.5" style={{ color: accent }} />
              </div>
              <p className="font-semibold text-[var(--t0)] group-hover:text-[var(--cyan)] transition-colors">{label}</p>
              <p className="text-xs text-[var(--t1)] mt-1 leading-relaxed">{sub}</p>
              <div className="flex items-center gap-1 mt-4 text-xs font-medium" style={{ color: accent }}>
                Öffnen <ArrowRight className="w-3 h-3" />
              </div>
            </div>
          </Link>
        ))}
      </section>

    </div>
  );
}

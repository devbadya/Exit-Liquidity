import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, RefreshCw } from 'lucide-react';
import { fetchNews, fetchFearGreed } from '../lib/api';
import { usePolling } from '../hooks/usePolling';
import { LoadingState } from '../components/LoadingState';
import { NewsCard } from '../components/NewsCard';
import { FearGreedGauge } from '../components/FearGreedGauge';
import { MarketStrip } from '../components/MarketStrip';
import { timeAgo, formatPct } from '../lib/format';

export function Dashboard() {
  const loadNews = useCallback(() => fetchNews(), []);
  const loadFg = useCallback(() => fetchFearGreed(), []);

  const news = usePolling(loadNews, 60_000);
  const fg = usePolling(loadFg, 300_000);

  if (news.loading && fg.loading) return <LoadingState label="TokenSync wird geladen…" />;

  const featured = news.data?.articles.slice(0, 1)[0];
  const topStories = news.data?.articles.slice(1, 7) ?? [];
  const delta =
    fg.data?.current && fg.data?.yesterday
      ? fg.data.current.value - fg.data.yesterday.value
      : null;

  return (
    <div className="space-y-12">
      <section className="text-center sm:text-left py-4">
        <p className="text-xs uppercase tracking-[0.2em] text-cyan-500/80 mb-3">Crypto Intelligence Platform</p>
        <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl text-white italic leading-tight">
          Märkte verstehen.
          <span className="block gradient-text not-italic font-sans font-semibold text-3xl sm:text-4xl mt-2">
            News & Sentiment in Echtzeit.
          </span>
        </h1>
        <p className="text-slate-400 max-w-2xl mt-4 text-sm sm:text-base mx-auto sm:mx-0">
          Aggregierte Crypto-News aus {news.data?.sourcesActive ?? '…'} Quellen — aktualisiert jede Minute.
          Fear & Greed Index mit Marktkontext und historischen Charts.
        </p>
      </section>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass rounded-2xl p-6 glow-cyan">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white">Fear & Greed Index</h2>
            <Link to="/fear-greed" className="text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
              Details <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          {fg.data ? (
            <div className="flex flex-col sm:flex-row items-center gap-8">
              <FearGreedGauge
                value={fg.data.current.value}
                classification={fg.data.current.classification}
              />
              <div className="flex-1 space-y-4 w-full">
                {delta !== null && (
                  <div className="glass rounded-xl p-4 border border-slate-700/50">
                    <p className="text-xs text-slate-500">vs. gestern</p>
                    <p className={`text-2xl font-semibold tabular-nums ${delta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {delta >= 0 ? '+' : ''}{delta} Punkte
                    </p>
                  </div>
                )}
                <p className="text-sm text-slate-400 leading-relaxed">
                  Der Index misst die Marktstimmung von 0 (Extreme Fear) bis 100 (Extreme Greed).
                  Daten: Alternative.me · Markt: CoinGecko
                </p>
                <p className="text-xs text-slate-600">Aktualisiert {timeAgo(fg.data.lastUpdated)}</p>
              </div>
            </div>
          ) : (
            <p className="text-slate-500">{fg.error ?? 'Lädt…'}</p>
          )}
        </div>

        <div className="glass rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">Live Status</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-slate-800">
              <span className="text-slate-500">News-Quellen aktiv</span>
              <span className="text-cyan-400 font-medium">{news.data?.sourcesActive ?? '—'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-800">
              <span className="text-slate-500">Artikel (dedupliziert)</span>
              <span className="text-white font-medium">{news.data?.articles.length ?? '—'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-800">
              <span className="text-slate-500">News-Update</span>
              <span className="text-slate-300">{news.data ? timeAgo(news.data.lastUpdated) : '—'}</span>
            </div>
            {fg.data?.market && (
              <div className="flex justify-between py-2">
                <span className="text-slate-500">BTC 24h</span>
                <span className={fg.data.market.btcChange24h >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                  {formatPct(fg.data.market.btcChange24h)}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 pt-2">
            <RefreshCw className="w-3 h-3 animate-spin" style={{ animationDuration: '3s' }} />
            Auto-Refresh aktiv
          </div>
        </div>
      </div>

      {fg.data?.market && <MarketStrip market={fg.data.market} />}

      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-white">Top Stories</h2>
          <Link to="/news" className="text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
            Alle News <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        {news.data ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {featured && <NewsCard article={featured} featured />}
            {topStories.map((a) => (
              <NewsCard key={a.id} article={a} />
            ))}
          </div>
        ) : (
          <p className="text-slate-500">{news.error}</p>
        )}
      </section>
    </div>
  );
}

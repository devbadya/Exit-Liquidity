import { useCallback, useMemo, useState } from 'react';
import { Filter, RefreshCw } from 'lucide-react';
import { fetchNews } from '../lib/api';
import { usePolling } from '../hooks/usePolling';
import { LoadingState } from '../components/LoadingState';
import { SectionHeader } from '../components/SectionHeader';
import { NewsCard } from '../components/NewsCard';
import { timeAgo } from '../lib/format';

const CATEGORIES = ['all', 'crypto', 'bitcoin', 'defi', 'regulation', 'macro', 'markets', 'nft'] as const;

export function News() {
  const [source, setSource] = useState<string>('');
  const [category, setCategory] = useState<string>('all');

  const load = useCallback(
    () => fetchNews({
      source: source || undefined,
      category: category !== 'all' ? category : undefined,
    }),
    [source, category],
  );

  const { data, error, loading } = usePolling(load, 60_000);

  const sources = useMemo(() => {
    if (!data) return [];
    const map = new Map<string, string>();
    for (const a of data.articles) map.set(a.sourceId, a.source);
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [data]);

  if (loading && !data) return <LoadingState label="News werden aggregiert…" />;

  const featured = data?.articles[0];
  const rest = data?.articles.slice(1) ?? [];

  return (
    <div>
      <SectionHeader
        title="Crypto News Hub"
        subtitle={`${data?.articles.length ?? 0} Artikel aus ${data?.sourcesActive ?? 0} Quellen · Aktualisierung jede Minute`}
        action={
          data && (
            <span className="text-xs text-slate-500 flex items-center gap-2 glass px-3 py-2 rounded-lg">
              <RefreshCw className="w-3 h-3" />
              {timeAgo(data.lastUpdated)}
            </span>
          )
        }
      />

      <div className="glass rounded-2xl p-4 mb-8 flex flex-col lg:flex-row gap-4">
        <div className="flex items-center gap-2 text-slate-400 text-sm shrink-0">
          <Filter className="w-4 h-4" />
          Filter
        </div>
        <div className="flex flex-wrap gap-2 flex-1">
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50"
          >
            <option value="">Alle Quellen</option>
            {sources.map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={`px-3 py-2 rounded-lg text-xs font-medium capitalize transition-all ${
                  category === c
                    ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                    : 'bg-slate-900 text-slate-400 border border-slate-800 hover:border-slate-600'
                }`}
              >
                {c === 'all' ? 'Alle' : c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && <p className="text-red-400 mb-4">{error}</p>}

      {data && (
        <>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {featured && <NewsCard article={featured} featured />}
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {rest.map((a) => (
              <NewsCard key={a.id} article={a} />
            ))}
          </div>
          {data.articles.length === 0 && (
            <p className="text-center text-slate-500 py-16">Keine Artikel für diesen Filter.</p>
          )}
        </>
      )}
    </div>
  );
}

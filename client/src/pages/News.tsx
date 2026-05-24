import { useCallback, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Card, Button, Spinner } from '@heroui/react';
import { fetchNews } from '../lib/api';
import { usePolling } from '../hooks/usePolling';
import { SectionHeader } from '../components/SectionHeader';
import { NewsCard } from '../components/NewsCard';
import { timeAgo } from '../lib/format';

const CATEGORIES = ['all', 'crypto', 'bitcoin', 'defi', 'regulation', 'macro', 'markets', 'nft'] as const;

export function News() {
  const [source,   setSource]   = useState('');
  const [category, setCategory] = useState('all');

  const load = useCallback(
    () => fetchNews({ source: source || undefined, category: category !== 'all' ? category : undefined }),
    [source, category],
  );
  const { data, error, loading } = usePolling(load, 60_000);

  const sources = useMemo(() => {
    if (!data) return [];
    const map = new Map<string, string>();
    for (const a of data.articles) map.set(a.sourceId, a.source);
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [data]);

  const featured = data?.articles[0];
  const rest     = data?.articles.slice(1) ?? [];

  return (
    <div>
      <SectionHeader
        title="Crypto News Hub"
        subtitle={`${data?.articles.length ?? 0} Artikel aus ${data?.sourcesActive ?? 0} Quellen · jede Minute`}
        action={
          data && (
            <span className="text-xs text-slate-500 flex items-center gap-2 glass px-3 py-2 rounded-lg">
              <RefreshCw className="w-3 h-3" />{timeAgo(data.lastUpdated)}
            </span>
          )
        }
      />

      {/* Filter bar */}
      <Card className="glass border-0 rounded-2xl p-4 mb-8">
        <div className="flex flex-col lg:flex-row gap-4">
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-[#22d3ee]/50"
          >
            <option value="">Alle Quellen</option>
            {sources.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <Button
                key={c}
                size="sm"
                variant={category === c ? 'tertiary' : 'outline'}
                className={`capitalize ${category === c ? 'bg-[#22d3ee]/15 text-[#22d3ee] border-[#22d3ee]/30' : 'text-slate-400 border-slate-700'}`}
                onPress={() => setCategory(c)}
              >
                {c === 'all' ? 'Alle' : c}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {error && <p className="text-red-400 mb-4">{error}</p>}

      {loading && !data
        ? <div className="flex justify-center py-24"><Spinner size="lg" /></div>
        : data && (
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {featured && <NewsCard article={featured} featured />}
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {rest.map((a) => <NewsCard key={a.id} article={a} />)}
            </div>
            {data.articles.length === 0 && (
              <p className="text-center text-slate-500 py-16">Keine Artikel für diesen Filter.</p>
            )}
          </>
        )}
    </div>
  );
}

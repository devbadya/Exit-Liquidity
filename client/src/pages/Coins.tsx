import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Button, Spinner } from '@heroui/react';
import { Search } from 'lucide-react';
import { fetchCmcCoins } from '../lib/api';
import { usePolling } from '../hooks/usePolling';
import { SectionHeader } from '../components/SectionHeader';
import { formatUsd, formatPct, timeAgo } from '../lib/format';
import type { CmcCoinsResponse } from '../types';

function PctBadge({ value }: { value: number | null }) {
  if (value == null) return <span className="text-slate-600">—</span>;
  return (
    <span className={`font-medium tabular-nums text-sm ${value >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
      {formatPct(value)}
    </span>
  );
}

export function Coins() {
  const [page,   setPage]   = useState(1);
  const [search, setSearch] = useState('');
  const [query,  setQuery]  = useState('');

  const load = useCallback(
    () => fetchCmcCoins({ page, limit: 50, search: query || undefined }),
    [page, query],
  );
  const { data, loading, error } = usePolling(load, 60_000);

  function applySearch() { setPage(1); setQuery(search); }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Alle Coins"
        subtitle={data ? `${data.total.toLocaleString('de-DE')} Kryptowährungen · ${timeAgo(data.lastUpdated)}` : ''}
      />

      {/* Search */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applySearch()}
            placeholder="Name oder Symbol suchen…"
            className="w-full pl-9 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-[#22d3ee]/50 placeholder:text-slate-500"
          />
        </div>
        <Button variant="tertiary" className="bg-[#22d3ee]/15 text-[#22d3ee]" onPress={applySearch}>
          Suchen
        </Button>
        {query && (
          <Button variant="outline" className="border-slate-700 text-slate-400"
            onPress={() => { setSearch(''); setQuery(''); setPage(1); }}>
            ✕ Reset
          </Button>
        )}
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {loading && !data
        ? <div className="flex justify-center py-24"><Spinner size="lg" /></div>
        : data && <CoinsTable data={data} page={page} setPage={setPage} />}
    </div>
  );
}

function CoinsTable({ data, page, setPage }: { data: CmcCoinsResponse; page: number; setPage: (p: number) => void }) {
  return (
    <>
      <Card className="glass border-0 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-500 text-xs uppercase tracking-wider border-b border-slate-800">
                <th className="text-left py-3 px-4">#</th>
                <th className="text-left py-3 px-2">Name</th>
                <th className="text-right py-3 px-4">Preis</th>
                <th className="text-right py-3 px-4">24h</th>
                <th className="text-right py-3 px-4 hidden md:table-cell">7d</th>
                <th className="text-right py-3 px-4 hidden md:table-cell">30d</th>
                <th className="text-right py-3 px-4 hidden lg:table-cell">Market Cap</th>
                <th className="text-right py-3 px-4 hidden xl:table-cell">Vol. 24h</th>
              </tr>
            </thead>
            <tbody>
              {data.coins.map((c) => (
                <tr key={c.slug} className="border-b border-slate-800/60 hover:bg-slate-800/20 transition-colors">
                  <td className="py-3 px-4 text-slate-500">{c.rank}</td>
                  <td className="py-3 px-2">
                    <Link to={`/coin/${c.slug}`} className="flex items-center gap-2 group">
                      <img src={c.imageUrl} alt="" className="w-7 h-7 rounded-full shrink-0" loading="lazy"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      <div>
                        <span className="font-medium text-white group-hover:text-[#22d3ee] transition-colors">{c.name}</span>
                        <span className="ml-1.5 text-slate-500 text-xs">{c.symbol}</span>
                      </div>
                    </Link>
                  </td>
                  <td className="py-3 px-4 text-right font-medium text-white tabular-nums">{formatUsd(c.price)}</td>
                  <td className="py-3 px-4 text-right"><PctBadge value={c.change24h} /></td>
                  <td className="py-3 px-4 text-right hidden md:table-cell"><PctBadge value={c.change7d} /></td>
                  <td className="py-3 px-4 text-right hidden md:table-cell"><PctBadge value={c.change30d} /></td>
                  <td className="py-3 px-4 text-right hidden lg:table-cell text-slate-400 tabular-nums">{formatUsd(c.marketCap, true)}</td>
                  <td className="py-3 px-4 text-right hidden xl:table-cell text-slate-400 tabular-nums">{formatUsd(c.volume24h, true)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button size="sm" variant="outline" className="border-slate-700 text-slate-400"
            isDisabled={page === 1} onPress={() => setPage(page - 1)}>
            ← Zurück
          </Button>
          <span className="text-sm text-slate-500">Seite {page} / {data.totalPages}</span>
          <Button size="sm" variant="outline" className="border-slate-700 text-slate-400"
            isDisabled={page >= data.totalPages} onPress={() => setPage(page + 1)}>
            Weiter →
          </Button>
        </div>
      )}
    </>
  );
}

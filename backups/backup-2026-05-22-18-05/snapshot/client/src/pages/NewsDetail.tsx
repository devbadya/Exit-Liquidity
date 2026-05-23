import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { fetchNews } from '../lib/api';
import type { NewsArticle } from '../types';
import { timeAgo } from '../lib/format';
import { LoadingState } from '../components/LoadingState';
import { NewsCard } from '../components/NewsCard';

const PLACEHOLDER = 'https://images.unsplash.com/photo-1639765488507-f0f7350f4577?w=1200&q=80';

export function NewsDetail() {
  const { id } = useParams<{ id: string }>();
  const [article, setArticle] = useState<NewsArticle | null>(null);
  const [related, setRelated] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const data = await fetchNews();
    const found = data.articles.find((a) => a.id === id);
    setArticle(found ?? null);
    if (found) {
      setRelated(
        data.articles
          .filter((a) => a.id !== id && a.categories.some((c) => found.categories.includes(c)))
          .slice(0, 4),
      );
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <LoadingState />;
  if (!article) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-400">Artikel nicht gefunden.</p>
        <Link to="/news" className="text-cyan-400 mt-4 inline-block">← Zurück zu News</Link>
      </div>
    );
  }

  return (
    <article className="max-w-4xl mx-auto">
      <Link to="/news" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-cyan-400 mb-8">
        <ArrowLeft className="w-4 h-4" /> Alle News
      </Link>

      <div className="rounded-2xl overflow-hidden mb-8 h-64 sm:h-80 relative">
        <img
          src={article.imageUrl || PLACEHOLDER}
          alt=""
          className="w-full h-full object-cover"
          onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER; }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0e17] to-transparent" />
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <span className="text-xs font-medium px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
          {article.source}
        </span>
        {article.categories.map((c) => (
          <span key={c} className="text-xs px-3 py-1 rounded-full bg-slate-800 text-slate-400 capitalize">
            {c}
          </span>
        ))}
        <span className="text-xs text-slate-500 ml-auto">{timeAgo(article.publishedAt)}</span>
      </div>

      <h1 className="text-3xl sm:text-4xl font-semibold text-white leading-tight">{article.title}</h1>

      <p className="text-slate-300 mt-6 text-lg leading-relaxed">{article.summary}</p>

      <a
        href={article.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 mt-8 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-violet-600 text-white font-medium hover:opacity-90 transition-opacity"
      >
        Vollständigen Artikel bei {article.source} lesen
        <ExternalLink className="w-4 h-4" />
      </a>

      <p className="text-xs text-slate-600 mt-4">
        TokenSync zeigt einen Auszug. Inhalt und Haftung liegen bei der Originalquelle.
      </p>

      {related.length > 0 && (
        <section className="mt-16 pt-12 border-t border-slate-800">
          <h2 className="text-xl font-semibold text-white mb-6">Verwandte Meldungen</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {related.map((a) => (
              <NewsCard key={a.id} article={a} />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}

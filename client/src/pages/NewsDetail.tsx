import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { Button, Chip, Spinner } from '@heroui/react';
import { fetchNews } from '../lib/api';
import type { NewsArticle } from '../types';
import { timeAgo } from '../lib/format';
import { NewsCard } from '../components/NewsCard';

const PLACEHOLDER = 'https://images.unsplash.com/photo-1639765488507-f0f7350f4577?w=1200&q=80';

export function NewsDetail() {
  const { id } = useParams<{ id: string }>();
  const [article, setArticle] = useState<NewsArticle | null>(null);
  const [related, setRelated]  = useState<NewsArticle[]>([]);
  const [loading, setLoading]  = useState(true);

  useEffect(() => {
    void (async () => {
      const data = await fetchNews();
      const found = data.articles.find((a) => a.id === id) ?? null;
      setArticle(found);
      if (found) {
        setRelated(
          data.articles
            .filter((a) => a.id !== id && a.categories.some((c) => found.categories.includes(c)))
            .slice(0, 4),
        );
      }
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <div className="flex justify-center py-24"><Spinner size="lg" /></div>;

  if (!article) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-400 mb-4">Artikel nicht gefunden.</p>
        <Link to="/news">
          <Button variant="outline" className="border-slate-700 text-slate-400">
            <ArrowLeft className="w-4 h-4 mr-1" /> Zurück zu News
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <article className="max-w-4xl mx-auto">
      <Link to="/news" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-[#22d3ee] mb-8">
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
        <Chip size="sm" variant="soft" className="bg-[#22d3ee]/10 text-[#22d3ee]">{article.source}</Chip>
        {article.categories.map((c) => (
          <Chip key={c} size="sm" variant="soft" className="bg-slate-800 text-slate-400 capitalize">{c}</Chip>
        ))}
        <span className="text-xs text-slate-500 ml-auto self-center">{timeAgo(article.publishedAt)}</span>
      </div>

      <h1 className="text-3xl sm:text-4xl font-semibold text-white leading-tight">{article.title}</h1>
      <p className="text-slate-300 mt-6 text-lg leading-relaxed">{article.summary}</p>

      <a
        href={article.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 mt-8 px-6 py-3 rounded-xl bg-gradient-to-r from-[#22d3ee] to-[#a78bfa] text-slate-900 font-semibold hover:opacity-90 transition-opacity"
      >
        Vollständig bei {article.source} lesen <ExternalLink className="w-4 h-4" />
      </a>

      <p className="text-xs text-slate-600 mt-4">
        TokenSync zeigt einen Auszug. Inhalt und Haftung liegen bei der Originalquelle.
      </p>

      {related.length > 0 && (
        <section className="mt-16 pt-12 border-t border-slate-800">
          <h2 className="text-xl font-semibold text-white mb-6">Verwandte Meldungen</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {related.map((a) => <NewsCard key={a.id} article={a} />)}
          </div>
        </section>
      )}
    </article>
  );
}

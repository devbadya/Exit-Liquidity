import { Link } from 'react-router-dom';
import { ArrowUpRight, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import type { NewsArticle } from '../types';
import { timeAgo } from '../lib/format';

const PLACEHOLDER = 'https://images.unsplash.com/photo-1639765488507-f0f7350f4577?w=800&q=80';

const SENT = {
  bullish: { icon: TrendingUp,   cls: 'text-[var(--green)] bg-[var(--green)]/10' },
  bearish: { icon: TrendingDown, cls: 'text-[var(--red)] bg-[var(--red)]/10'     },
  neutral: { icon: Minus,        cls: 'text-[var(--t2)] bg-[var(--bg-4)]'        },
};

interface Props { article: NewsArticle; featured?: boolean; }

export function NewsCard({ article, featured }: Props) {
  const cfg = article.sentiment ? SENT[article.sentiment] : SENT.neutral;
  const Icon = cfg.icon;

  if (featured) {
    return (
      <Link to={`/news/${article.id}`} className="group block h-full">
        <div className="card-pro overflow-hidden h-full flex flex-col">
          <div className="relative h-52 overflow-hidden">
            <img
              src={article.imageUrl || PLACEHOLDER}
              alt=""
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
              onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER; }}
            />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, var(--bg-3) 10%, transparent 60%)' }} />
            {article.sentiment && (
              <span className={`absolute top-3 right-3 flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full ${cfg.cls}`}>
                <Icon className="w-3 h-3" />{article.sentiment}
              </span>
            )}
          </div>
          <div className="p-5 flex flex-col flex-1">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--cyan)' }}>
                {article.source}
              </span>
              <span className="text-[var(--b2)]">·</span>
              <span className="text-[10px] text-[var(--t2)]">{timeAgo(article.publishedAt)}</span>
            </div>
            <h3 className="font-semibold text-[var(--t0)] leading-snug line-clamp-2 group-hover:text-[var(--cyan)] transition-colors">
              {article.title}
            </h3>
            <p className="text-[var(--t1)] text-sm mt-2 line-clamp-2 flex-1">{article.summary}</p>
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--b0)]">
              <div className="flex flex-wrap gap-1">
                {article.categories.slice(0, 2).map((c) => (
                  <span key={c} className="text-[10px] px-2 py-0.5 rounded bg-[var(--bg-4)] text-[var(--t2)] capitalize">{c}</span>
                ))}
              </div>
              <ArrowUpRight className="w-4 h-4 text-[var(--t2)] group-hover:text-[var(--cyan)] transition-colors" />
            </div>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link to={`/news/${article.id}`} className="group block h-full">
      <div className="card-pro overflow-hidden h-full flex flex-col">
        <div className="relative h-40 overflow-hidden shrink-0">
          <img
            src={article.imageUrl || PLACEHOLDER}
            alt=""
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
            onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER; }}
          />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, var(--bg-3) 5%, transparent 50%)' }} />
        </div>
        <div className="p-4 flex flex-col flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--cyan)' }}>{article.source}</span>
            <span className="text-[var(--t3)]">·</span>
            <span className="text-[10px] text-[var(--t2)]">{timeAgo(article.publishedAt)}</span>
          </div>
          <h3 className="font-medium text-sm text-[var(--t0)] line-clamp-2 leading-snug group-hover:text-[var(--cyan)] transition-colors flex-1">
            {article.title}
          </h3>
          <div className="flex flex-wrap gap-1 mt-3">
            {article.categories.slice(0, 2).map((c) => (
              <span key={c} className="text-[10px] px-2 py-0.5 rounded bg-[var(--bg-4)] text-[var(--t2)] capitalize">{c}</span>
            ))}
          </div>
        </div>
      </div>
    </Link>
  );
}

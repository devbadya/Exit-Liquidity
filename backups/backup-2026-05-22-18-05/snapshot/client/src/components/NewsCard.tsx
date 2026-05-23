import { Link } from 'react-router-dom';
import { ArrowUpRight, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import type { NewsArticle } from '../types';
import { timeAgo } from '../lib/format';

const PLACEHOLDER = 'https://images.unsplash.com/photo-1639765488507-f0f7350f4577?w=800&q=80';

const sentimentConfig = {
  bullish: { icon: TrendingUp, class: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  bearish: { icon: TrendingDown, class: 'text-red-400 bg-red-500/10 border-red-500/20' },
  neutral: { icon: Minus, class: 'text-slate-400 bg-slate-500/10 border-slate-500/20' },
};

interface Props {
  article: NewsArticle;
  featured?: boolean;
}

export function NewsCard({ article, featured }: Props) {
  const sent = article.sentiment ? sentimentConfig[article.sentiment] : sentimentConfig.neutral;
  const SentIcon = sent.icon;

  if (featured) {
    return (
      <Link
        to={`/news/${article.id}`}
        className="group glass rounded-2xl overflow-hidden glow-cyan hover:border-cyan-500/30 transition-all col-span-1 md:col-span-2 lg:col-span-2 grid md:grid-cols-2 min-h-[280px]"
      >
        <div className="relative h-48 md:h-full min-h-[200px] overflow-hidden">
          <img
            src={article.imageUrl || PLACEHOLDER}
            alt=""
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
            onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER; }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0e17] via-transparent to-transparent" />
        </div>
        <div className="p-6 flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap gap-2 mb-3">
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                {article.source}
              </span>
              {article.categories.slice(0, 2).map((c) => (
                <span key={c} className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 capitalize">
                  {c}
                </span>
              ))}
            </div>
            <h3 className="text-xl font-semibold text-white group-hover:text-cyan-300 transition-colors line-clamp-3">
              {article.title}
            </h3>
            <p className="text-slate-400 text-sm mt-3 line-clamp-3">{article.summary}</p>
          </div>
          <div className="flex items-center justify-between mt-4 text-xs text-slate-500">
            <span>{timeAgo(article.publishedAt)}</span>
            <span className={`flex items-center gap-1 px-2 py-1 rounded-full border ${sent.class}`}>
              <SentIcon className="w-3 h-3" />
              {article.sentiment}
            </span>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      to={`/news/${article.id}`}
      className="group glass rounded-xl overflow-hidden flex flex-col hover:border-violet-500/20 transition-all h-full"
    >
      <div className="relative h-40 overflow-hidden">
        <img
          src={article.imageUrl || PLACEHOLDER}
          alt=""
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
          onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER; }}
        />
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <ArrowUpRight className="w-5 h-5 text-white drop-shadow" />
        </div>
      </div>
      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] uppercase tracking-wider text-cyan-400/90 font-medium">{article.source}</span>
          <span className="text-slate-600">·</span>
          <span className="text-[10px] text-slate-500">{timeAgo(article.publishedAt)}</span>
        </div>
        <h3 className="font-medium text-white text-sm leading-snug line-clamp-2 group-hover:text-cyan-200 transition-colors">
          {article.title}
        </h3>
        <p className="text-slate-500 text-xs mt-2 line-clamp-2 flex-1">{article.summary}</p>
        <div className="flex flex-wrap gap-1 mt-3">
          {article.categories.slice(0, 2).map((c) => (
            <span key={c} className="text-[10px] px-2 py-0.5 rounded bg-slate-800/80 text-slate-500 capitalize">
              {c}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}

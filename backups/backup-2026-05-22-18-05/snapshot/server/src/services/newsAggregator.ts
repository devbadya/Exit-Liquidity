import crypto from 'crypto';
import Parser from 'rss-parser';
import sanitizeHtml from 'sanitize-html';
import type { NewsArticle } from '../types/index.js';

const parser = new Parser({
  timeout: 12000,
  customFields: {
    item: [['media:content', 'mediaContent'], ['media:thumbnail', 'mediaThumbnail']],
  },
});

interface FeedConfig {
  sourceId: string;
  source: string;
  url: string;
  categories: string[];
}

const FEEDS: FeedConfig[] = [
  { sourceId: 'coindesk', source: 'CoinDesk', url: 'https://www.coindesk.com/arc/outboundfeeds/rss/', categories: ['crypto', 'markets'] },
  { sourceId: 'cointelegraph', source: 'Cointelegraph', url: 'https://cointelegraph.com/rss', categories: ['crypto'] },
  { sourceId: 'decrypt', source: 'Decrypt', url: 'https://decrypt.co/feed', categories: ['crypto', 'defi'] },
  { sourceId: 'bitcoinmagazine', source: 'Bitcoin Magazine', url: 'https://bitcoinmagazine.com/.rss/full/', categories: ['crypto', 'bitcoin'] },
  { sourceId: 'theblock', source: 'The Block', url: 'https://www.theblock.co/rss.xml', categories: ['crypto', 'markets'] },
  { sourceId: 'cryptoslate', source: 'CryptoSlate', url: 'https://cryptoslate.com/feed/', categories: ['crypto'] },
  { sourceId: 'newsbtc', source: 'NewsBTC', url: 'https://www.newsbtc.com/feed/', categories: ['crypto', 'markets'] },
  { sourceId: 'utoday', source: 'U.Today', url: 'https://u.today/rss', categories: ['crypto'] },
];

function hashId(url: string): string {
  return crypto.createHash('sha256').update(url).digest('hex').slice(0, 16);
}

function stripHtml(html: string): string {
  return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} }).trim();
}

function extractImage(item: Record<string, unknown>): string | undefined {
  const enclosure = item.enclosure as { url?: string; type?: string } | undefined;
  if (enclosure?.url && (enclosure.type?.startsWith('image') || /\.(jpg|jpeg|png|webp|gif)/i.test(enclosure.url))) {
    return enclosure.url;
  }
  const content = (item['content:encoded'] || item.content || item.summary || '') as string;
  const match = content.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (match?.[1]) return match[1];
  const media = item.mediaContent as { $?: { url?: string } } | undefined;
  if (media?.$?.url) return media.$.url;
  const thumb = item.mediaThumbnail as { $?: { url?: string } } | undefined;
  if (thumb?.$?.url) return thumb.$.url;
  return undefined;
}

function normalizeTitle(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

function titleSimilarity(a: string, b: string): number {
  const wa = new Set(normalizeTitle(a).split(' '));
  const wb = new Set(normalizeTitle(b).split(' '));
  if (wa.size === 0 || wb.size === 0) return 0;
  let inter = 0;
  for (const w of wa) if (wb.has(w)) inter++;
  return inter / Math.max(wa.size, wb.size);
}

function categorize(title: string, summary: string, base: string[]): string[] {
  const text = `${title} ${summary}`.toLowerCase();
  const cats = new Set(base);
  if (/bitcoin|btc/.test(text)) cats.add('bitcoin');
  if (/ethereum|eth|defi/.test(text)) cats.add('defi');
  if (/regulation|sec|law|ban/.test(text)) cats.add('regulation');
  if (/fed|inflation|macro|stock|economy|bank/.test(text)) cats.add('macro');
  if (/nft|metaverse/.test(text)) cats.add('nft');
  return [...cats];
}

function inferSentiment(title: string, summary: string): 'bullish' | 'bearish' | 'neutral' {
  const text = `${title} ${summary}`.toLowerCase();
  const bull = /surge|rally|record high|approval|adoption|bull|gain|soar|breakout/.test(text);
  const bear = /crash|hack|ban|fraud|bear|drop|plunge|collapse|lawsuit|sec charge/.test(text);
  if (bull && !bear) return 'bullish';
  if (bear && !bull) return 'bearish';
  return 'neutral';
}

async function fetchFeed(config: FeedConfig): Promise<NewsArticle[]> {
  try {
    const feed = await parser.parseURL(config.url);
    return (feed.items || []).slice(0, 25).map((item) => {
      const url = item.link || item.guid || '';
      const rawSummary = item.contentSnippet || item.summary || '';
      const summary = stripHtml(rawSummary).slice(0, 400);
      const title = stripHtml(item.title || 'Untitled');
      const publishedAt = item.isoDate || item.pubDate || new Date().toISOString();
      return {
        id: hashId(url),
        title,
        summary: summary || title.slice(0, 200),
        imageUrl: extractImage(item as Record<string, unknown>),
        source: config.source,
        sourceId: config.sourceId,
        url,
        publishedAt: new Date(publishedAt).toISOString(),
        categories: categorize(title, summary, config.categories),
        tags: config.categories,
        sentiment: inferSentiment(title, summary),
      };
    }).filter((a) => a.url && a.title);
  } catch {
    return [];
  }
}

function deduplicate(articles: NewsArticle[]): NewsArticle[] {
  const seen = new Map<string, NewsArticle>();
  const sorted = [...articles].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );

  for (const article of sorted) {
    let duplicate = false;
    for (const existing of seen.values()) {
      if (article.url === existing.url || titleSimilarity(article.title, existing.title) > 0.82) {
        duplicate = true;
        break;
      }
    }
    if (!duplicate) seen.set(article.id, article);
  }
  return [...seen.values()];
}

export async function aggregateNews(): Promise<{
  articles: NewsArticle[];
  sourcesActive: number;
  totalFetched: number;
}> {
  const results = await Promise.all(FEEDS.map(fetchFeed));
  const sourcesActive = results.filter((r) => r.length > 0).length;
  const totalFetched = results.reduce((sum, r) => sum + r.length, 0);
  const articles = deduplicate(results.flat()).slice(0, 120);
  return { articles, sourcesActive, totalFetched };
}

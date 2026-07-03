import { describe, expect, it } from 'vitest';
import {
  categorize,
  deduplicate,
  inferSentiment,
  titleSimilarity,
} from '../src/services/newsAggregator.js';
import type { NewsArticle } from '../src/types/index.js';

function article(overrides: Partial<NewsArticle>): NewsArticle {
  return {
    id: Math.random().toString(36).slice(2),
    title: 'Titel',
    summary: 'Zusammenfassung',
    source: 'Test',
    sourceId: 'test',
    url: `https://example.com/${Math.random().toString(36).slice(2)}`,
    publishedAt: new Date().toISOString(),
    categories: [],
    tags: [],
    ...overrides,
  };
}

describe('titleSimilarity', () => {
  it('erkennt identische Titel', () => {
    expect(titleSimilarity('Bitcoin hits new high', 'Bitcoin hits new high')).toBe(1);
  });

  it('erkennt sehr ähnliche Titel (Interpunktion/Groß-Klein egal)', () => {
    const sim = titleSimilarity(
      'Bitcoin Hits New Record High Above $100k',
      'bitcoin hits new record high above $100k!',
    );
    expect(sim).toBeGreaterThan(0.82);
  });

  it('unterscheidet verschiedene Titel', () => {
    const sim = titleSimilarity('Ethereum upgrade delayed again', 'SEC sues major exchange');
    expect(sim).toBeLessThan(0.5);
  });
});

describe('deduplicate', () => {
  it('entfernt Artikel mit gleicher URL', () => {
    const a = article({ url: 'https://example.com/same' });
    const b = article({ url: 'https://example.com/same', title: 'Ganz anderer Titel hier' });
    expect(deduplicate([a, b])).toHaveLength(1);
  });

  it('entfernt Artikel mit fast identischem Titel', () => {
    const a = article({ title: 'Bitcoin surges past 100k as ETF inflows accelerate' });
    const b = article({ title: 'Bitcoin surges past 100k as ETF inflows accelerate!' });
    expect(deduplicate([a, b])).toHaveLength(1);
  });

  it('behält unterschiedliche Artikel', () => {
    const a = article({ title: 'Ethereum staking rewards drop sharply' });
    const b = article({ title: 'Solana network activity reaches record levels' });
    expect(deduplicate([a, b])).toHaveLength(2);
  });

  it('behält den neuesten Artikel eines Duplikat-Paars', () => {
    const older = article({
      title: 'Bitcoin surges past 100k as ETF inflows accelerate',
      publishedAt: '2026-01-01T00:00:00.000Z',
    });
    const newer = article({
      title: 'Bitcoin surges past 100k as ETF inflows accelerate!',
      publishedAt: '2026-01-02T00:00:00.000Z',
    });
    const result = deduplicate([older, newer]);
    expect(result).toHaveLength(1);
    expect(result[0].publishedAt).toBe(newer.publishedAt);
  });
});

describe('categorize', () => {
  it('erkennt Bitcoin-Themen', () => {
    expect(categorize('BTC rally continues', '', ['crypto'])).toContain('bitcoin');
  });

  it('erkennt Regulierungs-Themen', () => {
    expect(categorize('SEC announces new rules', '', [])).toContain('regulation');
  });

  it('behält Basis-Kategorien', () => {
    expect(categorize('Some title', '', ['crypto', 'markets'])).toEqual(
      expect.arrayContaining(['crypto', 'markets']),
    );
  });
});

describe('inferSentiment', () => {
  it('bullish bei positiven Signalwörtern', () => {
    expect(inferSentiment('Bitcoin surge to record high', '')).toBe('bullish');
  });

  it('bearish bei negativen Signalwörtern', () => {
    expect(inferSentiment('Exchange hack causes crash', '')).toBe('bearish');
  });

  it('neutral bei gemischten oder fehlenden Signalen', () => {
    expect(inferSentiment('Rally ends in crash', '')).toBe('neutral');
    expect(inferSentiment('Weekly market report', '')).toBe('neutral');
  });
});

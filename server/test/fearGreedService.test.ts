import { describe, expect, it } from 'vitest';
import { buildComponents, classify, deriveCompositeSnapshot } from '../src/services/fearGreedService.js';
import type { MarketContext } from '../src/types/index.js';

function market(overrides: Partial<MarketContext> = {}): MarketContext {
  return {
    btcPrice: 100000,
    btcChange24h: 0,
    ethPrice: 4000,
    ethChange24h: 0,
    totalMarketCap: 4e12,
    marketCapChange24h: 0,
    btcDominance: 55,
    lastUpdated: new Date().toISOString(),
    ...overrides,
  };
}

describe('classify', () => {
  it('ordnet Werte den richtigen Labels zu', () => {
    expect(classify(0)).toBe('Extreme Fear');
    expect(classify(24)).toBe('Extreme Fear');
    expect(classify(25)).toBe('Fear');
    expect(classify(50)).toBe('Neutral');
    expect(classify(60)).toBe('Greed');
    expect(classify(75)).toBe('Extreme Greed');
    expect(classify(100)).toBe('Extreme Greed');
  });
});

describe('buildComponents', () => {
  it('liefert alle Komponenten in 0–100', () => {
    const comps = buildComponents(50, market({ btcChange24h: 3, marketCapChange24h: 2 }));
    for (const [name, value] of Object.entries(comps)) {
      expect(value, name).toBeGreaterThanOrEqual(0);
      expect(value, name).toBeLessThanOrEqual(100);
    }
    expect(comps['Index (Alternative.me)']).toBe(50);
    expect(comps['TokenSync Composite']).toBeTypeOf('number');
  });

  it('klemmt Extremwerte auf die Grenzen', () => {
    const comps = buildComponents(100, market({ btcChange24h: 50, marketCapChange24h: 50 }));
    expect(comps.Momentum).toBe(100);
    expect(comps.Volatility).toBe(0);
    expect(comps['Market Cap Trend']).toBe(100);
  });
});

describe('deriveCompositeSnapshot', () => {
  it('erzeugt einen gültigen Snapshot aus Marktdaten', () => {
    const snap = deriveCompositeSnapshot(market({ btcChange24h: 2, marketCapChange24h: 1 }));
    expect(snap.source).toBe('composite');
    expect(snap.value).toBeGreaterThanOrEqual(0);
    expect(snap.value).toBeLessThanOrEqual(100);
    expect(snap.classification).toBe(classify(snap.value));
  });

  it('neutraler Markt ergibt einen mittleren Wert', () => {
    const snap = deriveCompositeSnapshot(market());
    expect(snap.value).toBeGreaterThanOrEqual(40);
    expect(snap.value).toBeLessThanOrEqual(75);
  });
});

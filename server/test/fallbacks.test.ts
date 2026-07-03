import { describe, expect, it } from 'vitest';
import { mapGeckoToCmcCoin, numericIdFromSlug, type GeckoMarketRow } from '../src/services/coinsFallbackService.js';
import { buildMarketOverviewFromCmc, cmcToCoinRow } from '../src/services/marketFallbackService.js';
import { filterAndPaginateCoins } from '../src/services/cmcService.js';
import type { CmcCoin } from '../src/types/cmc.js';

function geckoRow(overrides: Partial<GeckoMarketRow> = {}): GeckoMarketRow {
  return {
    id: 'bitcoin',
    symbol: 'btc',
    name: 'Bitcoin',
    image: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png',
    current_price: 100000,
    market_cap: 2e12,
    market_cap_rank: 1,
    total_volume: 5e10,
    circulating_supply: 19_800_000,
    max_supply: 21_000_000,
    last_updated: '2026-07-03T12:00:00.000Z',
    price_change_percentage_24h_in_currency: 1.5,
    price_change_percentage_7d_in_currency: -2.3,
    price_change_percentage_30d_in_currency: 10.1,
    ...overrides,
  };
}

function cmcCoin(overrides: Partial<CmcCoin> = {}): CmcCoin {
  return {
    id: 1,
    rank: 1,
    name: 'Bitcoin',
    symbol: 'BTC',
    slug: 'bitcoin',
    imageUrl: 'https://s2.coinmarketcap.com/static/img/coins/64x64/1.png',
    price: 100000,
    marketCap: 2e12,
    volume24h: 5e10,
    change24h: 1.5,
    change7d: -2.3,
    change30d: 10.1,
    circulatingSupply: 19_800_000,
    maxSupply: 21_000_000,
    lastUpdated: '2026-07-03T12:00:00.000Z',
    ...overrides,
  };
}

describe('numericIdFromSlug', () => {
  it('ist stabil und kollidiert nicht mit kleinen CMC-IDs', () => {
    expect(numericIdFromSlug('bitcoin')).toBe(numericIdFromSlug('bitcoin'));
    expect(numericIdFromSlug('bitcoin')).not.toBe(numericIdFromSlug('ethereum'));
    expect(numericIdFromSlug('bitcoin')).toBeGreaterThanOrEqual(1_000_000_000);
  });
});

describe('mapGeckoToCmcCoin', () => {
  it('mappt eine CoinGecko-Zeile in die CmcCoin-Form', () => {
    const coin = mapGeckoToCmcCoin(geckoRow(), 1);
    expect(coin.symbol).toBe('BTC');
    expect(coin.slug).toBe('bitcoin');
    expect(coin.rank).toBe(1);
    expect(coin.price).toBe(100000);
    expect(coin.change7d).toBe(-2.3);
    expect(coin.maxSupply).toBe(21_000_000);
  });

  it('kommt mit fehlenden Werten klar', () => {
    const coin = mapGeckoToCmcCoin(
      geckoRow({
        current_price: null,
        market_cap: null,
        market_cap_rank: null,
        price_change_percentage_24h_in_currency: null,
        last_updated: null,
      }),
      7,
    );
    expect(coin.price).toBe(0);
    expect(coin.marketCap).toBe(0);
    expect(coin.rank).toBe(7);
    expect(coin.change24h).toBeNull();
    expect(new Date(coin.lastUpdated).getTime()).toBeGreaterThan(0);
  });
});

describe('buildMarketOverviewFromCmc', () => {
  const coins = [
    cmcCoin(),
    cmcCoin({ id: 2, rank: 2, name: 'Ethereum', symbol: 'ETH', slug: 'ethereum', marketCap: 5e11, change24h: -1.2 }),
    cmcCoin({ id: 3, rank: 3, name: 'Solana', symbol: 'SOL', slug: 'solana', marketCap: 1e11, change24h: 5.5 }),
    cmcCoin({ id: 4, rank: 4, name: 'Tether', symbol: 'USDT', slug: 'tether', marketCap: 1.5e11, change24h: 0 }),
  ];

  it('baut einen vollständigen Markets-Überblick', () => {
    const overview = buildMarketOverviewFromCmc(coins);
    expect(overview.topCoins.length).toBeGreaterThan(0);
    expect(overview.global.totalMarketCap).toBeCloseTo(2e12 + 5e11 + 1e11 + 1.5e11);
    expect(overview.global.btcDominance).toBeGreaterThan(50);
    expect(overview.gainers[0].symbol).toBe('SOL');
    expect(overview.losers[0].symbol).toBe('ETH');
    expect(overview.sources[0]).toContain('CoinMarketCap');
    expect(overview.altcoinSeason.index).toBeGreaterThanOrEqual(0);
    expect(overview.averageCrypto.score).toBeGreaterThanOrEqual(0);
  });

  it('dominanceChart summiert sich auf 100', () => {
    const overview = buildMarketOverviewFromCmc(coins);
    const sum = overview.dominanceChart.reduce((s, d) => s + d.value, 0);
    expect(sum).toBeCloseTo(100, 5);
  });
});

describe('cmcToCoinRow', () => {
  it('mappt CmcCoin in die CoinRow-Form (ohne 90d)', () => {
    const row = cmcToCoinRow(cmcCoin());
    expect(row.id).toBe('bitcoin');
    expect(row.change90d).toBeNull();
    expect(row.image).toContain('coinmarketcap.com');
  });
});

describe('filterAndPaginateCoins', () => {
  const coins = Array.from({ length: 25 }, (_, i) =>
    cmcCoin({ id: i + 1, rank: i + 1, name: `Coin${i + 1}`, symbol: `C${i + 1}`, slug: `coin-${i + 1}` }),
  );

  it('paginiert korrekt', () => {
    const { items, total } = filterAndPaginateCoins(coins, { page: 2, limit: 10 });
    expect(total).toBe(25);
    expect(items).toHaveLength(10);
    expect(items[0].rank).toBe(11);
  });

  it('filtert per Suche über Name/Symbol/Slug', () => {
    const { items, total } = filterAndPaginateCoins(coins, { page: 1, limit: 10, search: 'coin-2' });
    expect(total).toBeGreaterThanOrEqual(1);
    expect(items.every((c) => c.slug.includes('coin-2'))).toBe(true);
  });
});

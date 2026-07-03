/**
 * Fallback für den Markets-Überblick: Wenn CoinGecko ausfällt, bauen wir
 * dieselbe Datenform aus den bereits gecachten CoinMarketCap-Coins.
 */
import type { CoinRow, GlobalMarketStats, MarketOverviewResponse } from '../types/market.js';
import type { CmcCoin } from '../types/cmc.js';
import { calcAltcoinSeason, calcAverageCrypto } from './marketService.js';

export function cmcToCoinRow(c: CmcCoin): CoinRow {
  return {
    id: c.slug,
    symbol: c.symbol,
    name: c.name,
    image: c.imageUrl,
    price: c.price,
    marketCap: c.marketCap,
    volume24h: c.volume24h,
    change24h: c.change24h,
    change7d: c.change7d,
    change30d: c.change30d,
    change90d: null, // CMC-Listings liefern keine 90d-Änderung
    rank: c.rank,
  };
}

export function buildMarketOverviewFromCmc(cmcCoins: CmcCoin[]): MarketOverviewResponse {
  const coins = cmcCoins
    .slice()
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 100)
    .map(cmcToCoinRow);

  const totalMarketCap = cmcCoins.reduce((s, c) => s + c.marketCap, 0);
  const totalVolume24h = cmcCoins.reduce((s, c) => s + c.volume24h, 0);
  const btc = coins.find((c) => c.symbol === 'BTC');
  const eth = coins.find((c) => c.symbol === 'ETH');

  // Market-Cap-gewichtete 24h-Änderung als Näherung für die globale Veränderung
  let capChangeWeighted = 0;
  let capWeight = 0;
  for (const c of coins) {
    if (c.change24h !== null && c.marketCap > 0) {
      capChangeWeighted += c.change24h * c.marketCap;
      capWeight += c.marketCap;
    }
  }

  const global: GlobalMarketStats = {
    totalMarketCap,
    totalVolume24h,
    marketCapChange24h: capWeight ? capChangeWeighted / capWeight : 0,
    btcDominance: totalMarketCap && btc ? (btc.marketCap / totalMarketCap) * 100 : 0,
    ethDominance: totalMarketCap && eth ? (eth.marketCap / totalMarketCap) * 100 : 0,
    activeCryptos: cmcCoins.length,
    markets: 0,
    defiMarketCap: 0,
    defiChange24h: 0,
    stablecoinMarketCap: 0,
    stablecoinChange24h: 0,
  };

  const withChange = coins.filter((c) => c.change24h !== null);
  const gainers = [...withChange].sort((a, b) => (b.change24h ?? 0) - (a.change24h ?? 0)).slice(0, 8);
  const losers = [...withChange].sort((a, b) => (a.change24h ?? 0) - (b.change24h ?? 0)).slice(0, 8);

  return {
    global,
    topCoins: coins.slice(0, 50),
    gainers,
    losers,
    categories: [], // Kategorien gibt es nur über CoinGecko
    altcoinSeason: calcAltcoinSeason(coins, 'change30d'),
    averageCrypto: calcAverageCrypto(coins),
    dominanceChart: [
      { name: 'Bitcoin', value: global.btcDominance, color: '#f7931a' },
      { name: 'Ethereum', value: global.ethDominance, color: '#627eea' },
      {
        name: 'Andere',
        value: Math.max(0, 100 - global.btcDominance - global.ethDominance),
        color: '#22d3ee',
      },
    ],
    sources: ['CoinMarketCap (Fallback — CoinGecko nicht erreichbar)'],
    lastUpdated: new Date().toISOString(),
  };
}

import type { CmcCoin } from '../types/cmc.js';
import { fetchBinanceSpot, type BinanceSpotResult } from './exchangeFeeds.js';

const SLUG_TO_SYMBOL: Record<string, string> = {
  bitcoin: 'BTC',
  ethereum: 'ETH',
  tether: 'USDT',
  binancecoin: 'BNB',
  solana: 'SOL',
  ripple: 'XRP',
  'usd-coin': 'USDC',
  cardano: 'ADA',
  dogecoin: 'DOGE',
  tron: 'TRX',
  chainlink: 'LINK',
  avalanche: 'AVAX',
  polkadot: 'DOT',
  polygon: 'MATIC',
  litecoin: 'LTC',
  'shiba-inu': 'SHIB',
  uniswap: 'UNI',
  cosmos: 'ATOM',
  'near-protocol': 'NEAR',
  aptos: 'APT',
  arbitrum: 'ARB',
  optimism: 'OP',
  sui: 'SUI',
  pepe: 'PEPE',
};

export interface BinanceLivePrice {
  slug: string;
  symbol: string;
  name: string;
  price: number;
  change24h: number | null;
  pair: string;
  method: 'mid' | 'last';
  source: 'binance';
  lastUpdated: string;
}

export function resolveBinanceSymbol(slug: string, cachedCoin?: CmcCoin): string {
  if (cachedCoin?.symbol) return cachedCoin.symbol;
  return SLUG_TO_SYMBOL[slug.toLowerCase()] ?? slug.toUpperCase();
}

export async function fetchBinanceLivePrice(
  slug: string,
  cachedCoin?: CmcCoin,
): Promise<BinanceLivePrice | null> {
  const symbol = resolveBinanceSymbol(slug, cachedCoin);
  const spot: BinanceSpotResult | null = await fetchBinanceSpot(symbol);
  if (!spot) return null;

  return {
    slug: slug.toLowerCase(),
    symbol: symbol.toUpperCase(),
    name: cachedCoin?.name ?? symbol,
    price: spot.price,
    change24h: spot.change24h,
    pair: spot.pair,
    method: spot.method,
    source: 'binance',
    lastUpdated: new Date().toISOString(),
  };
}

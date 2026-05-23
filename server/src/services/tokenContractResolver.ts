import { coingeckoFetch } from './coingeckoClient.js';

const CACHE_TTL_MS = 86_400_000;

interface CacheEntry {
  address: string | null;
  at: number;
}

const entries = new Map<string, CacheEntry>();

/** Ethereum Mainnet-Vertrag für DEX-Preise (Uniswap) */
export async function resolveEthereumContract(slug: string): Promise<string | null> {
  const key = slug.toLowerCase();
  const hit = entries.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.address;

  const native: Record<string, string> = {
    ethereum: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    bitcoin: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
    'wrapped-bitcoin': '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
  };
  if (native[key]) {
    entries.set(key, { address: native[key], at: Date.now() });
    return native[key];
  }

  try {
    const url = `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(key)}?localization=false&tickers=false&market_data=false&community_data=false&developer_data=false`;
    const json = await coingeckoFetch<{ platforms?: { ethereum?: string } }>(url, 12000);
    const addr = json.platforms?.ethereum?.toLowerCase() ?? null;
    const valid = addr && /^0x[a-f0-9]{40}$/.test(addr) ? addr : null;
    entries.set(key, { address: valid, at: Date.now() });
    return valid;
  } catch {
    entries.set(key, { address: null, at: Date.now() });
    return null;
  }
}

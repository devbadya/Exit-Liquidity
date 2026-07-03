/** CoinGecko API — mit Demo/Pro Key aus COINGECKO_API_KEY */
import { HttpError, withRetry } from '../lib/http.js';

export function coingeckoHeaders(): HeadersInit {
  const headers: Record<string, string> = { Accept: 'application/json' };
  const key = process.env.COINGECKO_API_KEY?.trim();
  if (key) {
    headers[key.startsWith('CG-') ? 'x-cg-demo-api-key' : 'x-cg-pro-api-key'] = key;
  }
  return headers;
}

async function coingeckoFetchOnce<T>(url: string, timeoutMs: number): Promise<T> {
  const res = await fetch(url, {
    headers: coingeckoHeaders(),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (res.status === 429) throw new HttpError('CoinGecko Rate Limit', 429);
  if (!res.ok) {
    let detail = '';
    try {
      const errBody = (await res.json()) as { status?: { error_message?: string } };
      detail = errBody?.status?.error_message ?? '';
    } catch {
      /* ignore */
    }
    throw new HttpError(detail ? `CoinGecko: ${detail}` : `CoinGecko ${res.status}`, res.status);
  }
  return res.json() as Promise<T>;
}

export async function coingeckoFetch<T>(url: string, timeoutMs = 20000): Promise<T> {
  return withRetry(() => coingeckoFetchOnce<T>(url, timeoutMs), { attempts: 3, baseDelayMs: 600 });
}

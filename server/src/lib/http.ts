/** Gemeinsamer HTTP-Helfer: Fehler mit Status + Retry mit Backoff */

export class HttpError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = 'HttpError';
  }
}

export interface RetryOptions {
  attempts?: number;
  baseDelayMs?: number;
  /** Entscheidet, ob nach einem Fehler erneut versucht wird (Default: keine 4xx-Retries) */
  shouldRetry?: (err: unknown) => boolean;
}

export function defaultShouldRetry(err: unknown): boolean {
  if (err instanceof HttpError && err.status !== undefined) {
    // 4xx (inkl. 429 Rate Limit) nicht wiederholen — das macht es nur schlimmer
    return err.status >= 500;
  }
  // Netzwerkfehler / Timeouts → Retry
  return true;
}

export async function withRetry<T>(fn: () => Promise<T>, opts: RetryOptions = {}): Promise<T> {
  const attempts = Math.max(1, opts.attempts ?? 3);
  const baseDelayMs = opts.baseDelayMs ?? 500;
  const shouldRetry = opts.shouldRetry ?? defaultShouldRetry;

  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (i === attempts - 1 || !shouldRetry(err)) break;
      await new Promise((r) => setTimeout(r, baseDelayMs * 2 ** i));
    }
  }
  throw lastErr;
}

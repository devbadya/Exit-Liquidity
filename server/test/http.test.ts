import { describe, expect, it, vi } from 'vitest';
import { HttpError, defaultShouldRetry, withRetry } from '../src/lib/http.js';

describe('withRetry', () => {
  it('gibt das Ergebnis beim ersten Erfolg zurück', async () => {
    const fn = vi.fn().mockResolvedValue(42);
    await expect(withRetry(fn)).resolves.toBe(42);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('wiederholt bei Netzwerkfehlern und liefert dann das Ergebnis', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('ECONNRESET'))
      .mockResolvedValueOnce('ok');
    await expect(withRetry(fn, { baseDelayMs: 1 })).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('wirft nach Ausschöpfen aller Versuche den letzten Fehler', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('down'));
    await expect(withRetry(fn, { attempts: 3, baseDelayMs: 1 })).rejects.toThrow('down');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('wiederholt NICHT bei 4xx-Fehlern (z. B. 429 Rate Limit)', async () => {
    const fn = vi.fn().mockRejectedValue(new HttpError('Rate Limit', 429));
    await expect(withRetry(fn, { attempts: 3, baseDelayMs: 1 })).rejects.toThrow('Rate Limit');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('wiederholt bei 5xx-Fehlern', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new HttpError('Server Error', 503))
      .mockResolvedValueOnce('recovered');
    await expect(withRetry(fn, { baseDelayMs: 1 })).resolves.toBe('recovered');
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe('defaultShouldRetry', () => {
  it('klassifiziert Fehler korrekt', () => {
    expect(defaultShouldRetry(new HttpError('x', 429))).toBe(false);
    expect(defaultShouldRetry(new HttpError('x', 404))).toBe(false);
    expect(defaultShouldRetry(new HttpError('x', 500))).toBe(true);
    expect(defaultShouldRetry(new HttpError('x'))).toBe(true);
    expect(defaultShouldRetry(new Error('timeout'))).toBe(true);
  });
});

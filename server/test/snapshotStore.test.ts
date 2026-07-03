import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { afterAll, describe, expect, it } from 'vitest';
import { loadSnapshot, saveSnapshot } from '../src/lib/snapshotStore.js';

const dir = mkdtempSync(path.join(tmpdir(), 'tokensync-snap-'));

afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe('snapshotStore', () => {
  it('speichert und lädt Daten (Roundtrip)', () => {
    const data = { coins: [{ symbol: 'BTC', price: 100000 }], total: 1 };
    saveSnapshot('testKey', data, dir);
    const loaded = loadSnapshot<typeof data>('testKey', dir);
    expect(loaded).not.toBeNull();
    expect(loaded!.data).toEqual(data);
    expect(new Date(loaded!.savedAt).getTime()).toBeGreaterThan(0);
  });

  it('gibt null zurück, wenn kein Snapshot existiert', () => {
    expect(loadSnapshot('missing', dir)).toBeNull();
  });

  it('bereinigt unsichere Zeichen im Key', () => {
    saveSnapshot('../weird/key!', { v: 1 }, dir);
    expect(loadSnapshot<{ v: number }>('../weird/key!', dir)?.data).toEqual({ v: 1 });
  });
});

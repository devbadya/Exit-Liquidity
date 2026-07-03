/**
 * Persistiert die zuletzt erfolgreichen API-Antworten auf Disk,
 * damit nach einem Neustart (Deploy) sofort Daten da sind statt 503.
 */
import { mkdirSync, readFileSync, renameSync, writeFileSync, readdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_DIR = path.resolve(__dirname, '../../.cache');

interface SnapshotFile<T> {
  savedAt: string;
  data: T;
}

export interface Snapshot<T> {
  savedAt: string;
  data: T;
}

function fileFor(dir: string, key: string): string {
  const safe = key.replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(dir, `${safe}.json`);
}

export function saveSnapshot<T>(key: string, data: T, dir: string = DEFAULT_DIR): void {
  try {
    mkdirSync(dir, { recursive: true });
    const file = fileFor(dir, key);
    const tmp = `${file}.tmp`;
    const payload: SnapshotFile<T> = { savedAt: new Date().toISOString(), data };
    writeFileSync(tmp, JSON.stringify(payload));
    renameSync(tmp, file);
  } catch (err) {
    console.warn(`Snapshot save failed (${key}):`, err instanceof Error ? err.message : err);
  }
}

export function loadSnapshot<T>(key: string, dir: string = DEFAULT_DIR): Snapshot<T> | null {
  try {
    const raw = readFileSync(fileFor(dir, key), 'utf8');
    const parsed = JSON.parse(raw) as SnapshotFile<T>;
    if (!parsed || typeof parsed.savedAt !== 'string' || parsed.data === undefined) return null;
    return { savedAt: parsed.savedAt, data: parsed.data };
  } catch {
    return null;
  }
}

export function listSnapshots(dir: string = DEFAULT_DIR): string[] {
  try {
    return readdirSync(dir).filter((f) => f.endsWith('.json'));
  } catch {
    return [];
  }
}

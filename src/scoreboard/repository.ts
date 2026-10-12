/**
 * Persistenz-Schicht (Repository-Pattern).
 *
 * Die UI spricht ausschliesslich mit dem asynchronen Interface
 * `ScoreboardRepository`. Heute steckt der Browser-Speicher (localStorage)
 * dahinter; für eine Datenbank wird nur eine weitere Implementierung
 * (z.B. `SupabaseScoreboardRepository`) geschrieben und in
 * `ScoreboardApp` übergeben – Logik und UI bleiben unverändert.
 */
import type { Match, MatchSide, Scoreboard, ScoreboardPlayer } from './types';
import { LIMITS, cleanText } from './logic';

export interface ScoreboardRepository {
  list(): Promise<Scoreboard[]>;
  get(id: string): Promise<Scoreboard | null>;
  save(board: Scoreboard): Promise<void>;
  remove(id: string): Promise<void>;
}

/** Minimales Storage-Interface (kompatibel mit window.localStorage). */
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export class MemoryStorage implements KeyValueStorage {
  private readonly data = new Map<string, string>();
  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.data.set(key, String(value));
  }
  removeItem(key: string): void {
    this.data.delete(key);
  }
}

export const STORAGE_KEY = 'scoreboard:data:v1';

/* ---------- Validierung / Sanitizing (Daten aus dem Speicher sind untrusted) ---------- */

const isObj = (x: unknown): x is Record<string, unknown> =>
  typeof x === 'object' && x !== null && !Array.isArray(x);
const str = (x: unknown): string | null => (typeof x === 'string' && x.length > 0 ? x : null);
const num = (x: unknown): number | null => (typeof x === 'number' && Number.isFinite(x) ? x : null);

const sanitizeSide = (raw: unknown, playerIds: Set<string>): MatchSide | null => {
  if (!isObj(raw) || !Array.isArray(raw.playerIds)) return null;
  const ids = raw.playerIds.filter((x): x is string => typeof x === 'string' && playerIds.has(x));
  const score = num(raw.score);
  if (ids.length === 0 || ids.length !== raw.playerIds.length || score === null || score < 0) return null;
  return { playerIds: Array.from(new Set(ids)), score };
};

export function sanitizeScoreboard(raw: unknown): Scoreboard | null {
  if (!isObj(raw) || raw.schemaVersion !== 1) return null;
  const id = str(raw.id);
  const name = cleanText(str(raw.name) ?? '', LIMITS.boardName);
  if (!id || !name) return null;

  const players: ScoreboardPlayer[] = [];
  const playerIds = new Set<string>();
  for (const p of Array.isArray(raw.players) ? raw.players : []) {
    if (!isObj(p)) continue;
    const pid = str(p.id);
    const pname = cleanText(str(p.name) ?? '', LIMITS.playerName);
    if (!pid || !pname || playerIds.has(pid)) continue;
    playerIds.add(pid);
    players.push({ id: pid, name: pname, active: p.active !== false, joinedAt: num(p.joinedAt) ?? 0 });
  }

  const matches: Match[] = [];
  const matchIds = new Set<string>();
  for (const m of Array.isArray(raw.matches) ? raw.matches : []) {
    if (!isObj(m) || !Array.isArray(m.sides) || m.sides.length !== 2) continue;
    const mid = str(m.id);
    const playedAt = num(m.playedAt);
    if (!mid || playedAt === null || matchIds.has(mid)) continue;
    const a = sanitizeSide(m.sides[0], playerIds);
    const b = sanitizeSide(m.sides[1], playerIds);
    if (!a || !b) continue;
    matchIds.add(mid);
    const note = cleanText(str(m.note) ?? '', LIMITS.note);
    matches.push({
      id: mid,
      playedAt,
      sides: [a, b],
      note: note || undefined,
      createdAt: num(m.createdAt) ?? playedAt,
    });
  }

  const discipline = cleanText(str(raw.discipline) ?? '', LIMITS.discipline);
  const createdAt = num(raw.createdAt) ?? 0;
  return {
    schemaVersion: 1,
    id,
    name,
    discipline: discipline || undefined,
    scoring: raw.scoring === 'lower-wins' ? 'lower-wins' : 'higher-wins',
    players,
    matches,
    createdAt,
    updatedAt: num(raw.updatedAt) ?? createdAt,
  };
}

export function parsePersisted(raw: string | null): Scoreboard[] {
  if (!raw) return [];
  try {
    const data: unknown = JSON.parse(raw);
    if (!isObj(data) || data.version !== 1 || !Array.isArray(data.boards)) return [];
    const seen = new Set<string>();
    const boards: Scoreboard[] = [];
    for (const b of data.boards) {
      const clean = sanitizeScoreboard(b);
      if (clean && !seen.has(clean.id)) {
        seen.add(clean.id);
        boards.push(clean);
      }
    }
    return boards;
  } catch {
    return [];
  }
}

/* ---------- localStorage-Implementierung ---------- */

const browserStorage = (): KeyValueStorage => {
  try {
    if (typeof localStorage !== 'undefined') return localStorage;
  } catch {
    /* z.B. blockierte Cookies/Storage */
  }
  return new MemoryStorage();
};

export class LocalStorageScoreboardRepository implements ScoreboardRepository {
  private readonly storage: KeyValueStorage;
  private readonly key: string;

  constructor(storage?: KeyValueStorage, key: string = STORAGE_KEY) {
    this.storage = storage ?? browserStorage();
    this.key = key;
  }

  private readAll(): Scoreboard[] {
    try {
      return parsePersisted(this.storage.getItem(this.key));
    } catch {
      return [];
    }
  }

  private writeAll(boards: Scoreboard[]): void {
    try {
      this.storage.setItem(this.key, JSON.stringify({ version: 1, boards }));
    } catch {
      throw new Error('Speichern im Browser fehlgeschlagen (Speicher voll oder blockiert).');
    }
  }

  async list(): Promise<Scoreboard[]> {
    return this.readAll().sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async get(id: string): Promise<Scoreboard | null> {
    return this.readAll().find((b) => b.id === id) ?? null;
  }

  async save(board: Scoreboard): Promise<void> {
    const clean = sanitizeScoreboard(board);
    if (!clean) throw new Error('Ungültiges Scoreboard – nicht gespeichert.');
    const all = this.readAll();
    const idx = all.findIndex((b) => b.id === clean.id);
    if (idx >= 0) all[idx] = clean;
    else all.push(clean);
    this.writeAll(all);
  }

  async remove(id: string): Promise<void> {
    this.writeAll(this.readAll().filter((b) => b.id !== id));
  }
}


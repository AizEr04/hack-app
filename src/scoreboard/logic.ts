/**
 * Scoreboard – reine Geschäftslogik.
 * Keine React-, Browser- oder Persistenz-Abhängigkeiten: alle Funktionen sind
 * pure (geben neue Objekte zurück) und dadurch einfach testbar und später auch
 * serverseitig wiederverwendbar.
 */
import type {
  Id,
  Match,
  PlayerStanding,
  Scoreboard,
  ScoreboardPlayer,
  ScoringMode,
} from './types';

export const LIMITS = {
  boardName: 60,
  discipline: 40,
  playerName: 40,
  note: 200,
  maxScore: 1_000_000,
  maxPlayersPerSide: 10,
  maxPlayers: 200,
} as const;

/** Erwartbarer Fachfehler (ungültige Eingabe) – Meldung ist für Benutzer gedacht. */
export class ScoreboardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ScoreboardError';
  }
}

export type IdFactory = () => Id;

export const createId: IdFactory = () => {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  // Fallback für unsichere Kontexte (http im LAN)
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
};

export interface MutationOptions {
  now?: number;
  createId?: IdFactory;
}

const resolve = (o: MutationOptions = {}) => ({
  now: o.now ?? Date.now(),
  id: o.createId ?? createId,
});

const round2 = (n: number): number => Math.round(n * 100) / 100;

/** Trimmt, reduziert Mehrfach-Leerzeichen und kürzt auf `max` Zeichen. */
export const cleanText = (raw: string, max: number): string =>
  String(raw ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);

const normName = (name: string): string =>
  cleanText(name, LIMITS.playerName).toLocaleLowerCase('de');

/** "Anna, Ben\nCarla" → ["Anna", "Ben", "Carla"] */
export const parseNameList = (raw: string): string[] =>
  raw
    .split(/[\n,;]/)
    .map((s) => s.trim())
    .filter(Boolean);

/* ---------- Scoreboard ---------- */

export interface NewScoreboardInput {
  name: string;
  discipline?: string;
  scoring?: ScoringMode;
  playerNames?: string[];
}

export function createScoreboard(input: NewScoreboardInput, options: MutationOptions = {}): Scoreboard {
  const { now, id } = resolve(options);
  const name = cleanText(input.name, LIMITS.boardName);
  if (!name) throw new ScoreboardError('Bitte einen Namen für das Scoreboard eingeben.');
  const discipline = cleanText(input.discipline ?? '', LIMITS.discipline);

  let board: Scoreboard = {
    schemaVersion: 1,
    id: id(),
    name,
    discipline: discipline || undefined,
    scoring: input.scoring === 'lower-wins' ? 'lower-wins' : 'higher-wins',
    players: [],
    matches: [],
    createdAt: now,
    updatedAt: now,
  };

  for (const raw of input.playerNames ?? []) {
    if (!cleanText(raw, LIMITS.playerName)) continue;
    if (findPlayerByName(board, raw)) continue; // Duplikate still ignorieren
    board = addPlayer(board, raw, { now, createId: id });
  }
  return board;
}

export function updateScoreboardDetails(
  board: Scoreboard,
  changes: { name?: string; discipline?: string; scoring?: ScoringMode },
  options: MutationOptions = {},
): Scoreboard {
  const { now } = resolve(options);
  const name = changes.name === undefined ? board.name : cleanText(changes.name, LIMITS.boardName);
  if (!name) throw new ScoreboardError('Der Name darf nicht leer sein.');
  const discipline =
    changes.discipline === undefined
      ? board.discipline
      : cleanText(changes.discipline, LIMITS.discipline) || undefined;
  const scoring = changes.scoring ?? board.scoring;
  return { ...board, name, discipline, scoring, updatedAt: now };
}

/* ---------- Spieler ---------- */

export function findPlayerByName(board: Scoreboard, name: string): ScoreboardPlayer | undefined {
  const n = normName(name);
  return board.players.find((p) => normName(p.name) === n);
}

export function activePlayers(board: Scoreboard): ScoreboardPlayer[] {
  return board.players.filter((p) => p.active);
}

/** Fügt einen Spieler hinzu. Ein früher entfernter Spieler mit gleichem Namen wird reaktiviert (gleiche ID, Statistik bleibt). */
export function addPlayer(board: Scoreboard, rawName: string, options: MutationOptions = {}): Scoreboard {
  const { now, id } = resolve(options);
  const name = cleanText(rawName, LIMITS.playerName);
  if (!name) throw new ScoreboardError('Bitte einen Spielernamen eingeben.');

  const existing = findPlayerByName(board, name);
  if (existing?.active) throw new ScoreboardError(`„${existing.name}“ ist bereits im Scoreboard.`);
  if (existing) {
    return {
      ...board,
      players: board.players.map((p) => (p.id === existing.id ? { ...p, active: true } : p)),
      updatedAt: now,
    };
  }
  if (board.players.length >= LIMITS.maxPlayers) {
    throw new ScoreboardError(`Maximal ${LIMITS.maxPlayers} Spieler pro Scoreboard.`);
  }
  const player: ScoreboardPlayer = { id: id(), name, active: true, joinedAt: now };
  return { ...board, players: [...board.players, player], updatedAt: now };
}

export function playerHasMatches(board: Scoreboard, playerId: Id): boolean {
  return board.matches.some((m) => m.sides.some((s) => s.playerIds.includes(playerId)));
}

/** Entfernt einen Spieler. Hat er Matches, wird er nur deaktiviert, damit die Historie konsistent bleibt. */
export function removePlayer(board: Scoreboard, playerId: Id, options: MutationOptions = {}): Scoreboard {
  const { now } = resolve(options);
  const player = board.players.find((p) => p.id === playerId);
  if (!player || !player.active) return board;
  const players = playerHasMatches(board, playerId)
    ? board.players.map((p) => (p.id === playerId ? { ...p, active: false } : p))
    : board.players.filter((p) => p.id !== playerId);
  return { ...board, players, updatedAt: now };
}

/* ---------- Matches ---------- */

export interface MatchInput {
  sideA: Id[];
  sideB: Id[];
  scoreA: number;
  scoreB: number;
  playedAt?: number;
  note?: string;
}

const validScore = (s: unknown): s is number =>
  typeof s === 'number' && Number.isFinite(s) && s >= 0 && s <= LIMITS.maxScore;

export function validateMatchInput(board: Scoreboard, input: MatchInput): string[] {
  const errors: string[] = [];
  const active = new Set(activePlayers(board).map((p) => p.id));
  const sides: [string, Id[]][] = [
    ['Seite A', input.sideA],
    ['Seite B', input.sideB],
  ];
  for (const [label, ids] of sides) {
    if (!Array.isArray(ids) || ids.length === 0) {
      errors.push(`${label}: mindestens einen Spieler wählen.`);
      continue;
    }
    if (ids.length > LIMITS.maxPlayersPerSide) {
      errors.push(`${label}: maximal ${LIMITS.maxPlayersPerSide} Spieler.`);
    }
    if (new Set(ids).size !== ids.length) errors.push(`${label}: Spieler doppelt gewählt.`);
    if (ids.some((pid) => !active.has(pid))) errors.push(`${label}: unbekannter oder entfernter Spieler.`);
  }
  if (Array.isArray(input.sideA) && Array.isArray(input.sideB) && input.sideA.some((pid) => input.sideB.includes(pid))) {
    errors.push('Ein Spieler kann nicht auf beiden Seiten spielen.');
  }
  if (!validScore(input.scoreA)) errors.push('Punkte von Seite A sind ungültig.');
  if (!validScore(input.scoreB)) errors.push('Punkte von Seite B sind ungültig.');
  if (input.playedAt !== undefined && !Number.isFinite(input.playedAt)) errors.push('Datum ist ungültig.');
  return errors;
}

export function addMatch(board: Scoreboard, input: MatchInput, options: MutationOptions = {}): Scoreboard {
  const errors = validateMatchInput(board, input);
  if (errors.length > 0) throw new ScoreboardError(errors.join(' '));
  const { now, id } = resolve(options);
  const note = cleanText(input.note ?? '', LIMITS.note);
  const match: Match = {
    id: id(),
    playedAt: input.playedAt ?? now,
    sides: [
      { playerIds: [...input.sideA], score: round2(input.scoreA) },
      { playerIds: [...input.sideB], score: round2(input.scoreB) },
    ],
    note: note || undefined,
    createdAt: now,
  };
  return { ...board, matches: [...board.matches, match], updatedAt: now };
}

export function removeMatch(board: Scoreboard, matchId: Id, options: MutationOptions = {}): Scoreboard {
  if (!board.matches.some((m) => m.id === matchId)) return board;
  const { now } = resolve(options);
  return { ...board, matches: board.matches.filter((m) => m.id !== matchId), updatedAt: now };
}

/** Index der Siegerseite (0 | 1) oder null bei Unentschieden. */
export function matchWinner(match: Match, scoring: ScoringMode): 0 | 1 | null {
  const [a, b] = [match.sides[0].score, match.sides[1].score];
  if (a === b) return null;
  const aWins = scoring === 'higher-wins' ? a > b : a < b;
  return aWins ? 0 : 1;
}

/** Neueste Matches zuerst. */
export function sortedMatches(board: Scoreboard): Match[] {
  return [...board.matches].sort((x, y) => y.playedAt - x.playedAt || y.createdAt - x.createdAt);
}

/* ---------- Rangliste ---------- */

/**
 * Rangliste: sortiert nach Siegen, dann Siegquote, dann Punktedifferenz
 * (bei "lower-wins" ist eine tiefere Differenz besser). Gleichstand → gleicher Rang.
 */
export function computeStandings(
  board: Scoreboard,
  options: { includeInactive?: boolean } = {},
): PlayerStanding[] {
  const rows = new Map<Id, Omit<PlayerStanding, 'rank'>>();
  for (const p of board.players) {
    rows.set(p.id, {
      playerId: p.id,
      name: p.name,
      active: p.active,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      pointDiff: 0,
      winRate: 0,
    });
  }

  for (const m of board.matches) {
    const winner = matchWinner(m, board.scoring);
    m.sides.forEach((side, idx) => {
      const other = m.sides[idx === 0 ? 1 : 0];
      for (const pid of side.playerIds) {
        const r = rows.get(pid);
        if (!r) continue;
        r.played += 1;
        r.pointsFor += side.score;
        r.pointsAgainst += other.score;
        if (winner === null) r.draws += 1;
        else if (winner === idx) r.wins += 1;
        else r.losses += 1;
      }
    });
  }

  const dir = board.scoring === 'higher-wins' ? 1 : -1;
  const list = [...rows.values()]
    .filter((r) => options.includeInactive || r.active)
    .map((r) => ({
      ...r,
      pointsFor: round2(r.pointsFor),
      pointsAgainst: round2(r.pointsAgainst),
      pointDiff: round2(r.pointsFor - r.pointsAgainst),
      winRate: r.played > 0 ? r.wins / r.played : 0,
    }));

  type Row = (typeof list)[number];
  const cmp = (a: Row, b: Row): number =>
    b.wins - a.wins || b.winRate - a.winRate || dir * (b.pointDiff - a.pointDiff);

  list.sort((a, b) => cmp(a, b) || a.name.localeCompare(b.name, 'de'));

  let rank = 0;
  return list.map((r, i) => {
    if (i === 0 || cmp(list[i - 1], r) !== 0) rank = i + 1;
    return { ...r, rank };
  });
}


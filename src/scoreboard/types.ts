/**
 * Scoreboard – Datenmodell.
 *
 * Bewusst flach und JSON-serialisierbar gehalten, damit es 1:1 in einer
 * Datenbank (Tabellen `scoreboards`, `players`, `matches` bzw. Dokumente)
 * abgelegt werden kann.
 */

export type Id = string;

/** Wertung: gewinnt die höhere oder die tiefere Punktzahl (z.B. Golf, Minigolf)? */
export type ScoringMode = 'higher-wins' | 'lower-wins';

export interface ScoreboardPlayer {
  id: Id;
  name: string;
  /** false = aus dem Scoreboard entfernt; bisherige Matches bleiben erhalten */
  active: boolean;
  joinedAt: number;
}

export interface MatchSide {
  /** Ein Spieler (Einzel) oder mehrere (Doppel/Team) */
  playerIds: Id[];
  /** Punkte, Sätze, Tore … (>= 0) */
  score: number;
}

export interface Match {
  id: Id;
  /** Zeitpunkt des Spiels (ms seit Epoch) */
  playedAt: number;
  sides: [MatchSide, MatchSide];
  note?: string;
  createdAt: number;
}

export interface Scoreboard {
  /** Schema-Version des Datensatzes (für Migrationen / DB) */
  schemaVersion: 1;
  id: Id;
  name: string;
  /** Sportart oder Spiel, frei wählbar (z.B. "Tischtennis") */
  discipline?: string;
  scoring: ScoringMode;
  players: ScoreboardPlayer[];
  matches: Match[];
  createdAt: number;
  /** Für Sortierung und später für Sync/Konflikterkennung */
  updatedAt: number;
}

export interface PlayerStanding {
  playerId: Id;
  name: string;
  active: boolean;
  rank: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  pointDiff: number;
  /** 0..1 */
  winRate: number;
}


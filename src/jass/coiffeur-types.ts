/** Coiffeur Jass Types */

export type CoiffeurTrumpf =
  | 'schaufel'
  | 'kreuz'
  | 'ecken'
  | 'herz'
  | 'undenufe'
  | 'obenabe'
  | 'slalom'
  | 'misere'
  | 'guschti'
  | 'dreimaldrei';

export interface CoiffeurTrumpfInfo {
  label: string;
  emoji: string;
}

export const TRUMPF_INFO: Record<CoiffeurTrumpf, CoiffeurTrumpfInfo> = {
  schaufel: { label: 'Schaufel', emoji: '♠' },
  kreuz: { label: 'Kreuz', emoji: '♣' },
  ecken: { label: 'Ecken', emoji: '♦' },
  herz: { label: 'Herz', emoji: '♥' },
  undenufe: { label: 'Undenufe', emoji: '⬇' },
  obenabe: { label: 'Obenabe', emoji: '⬆' },
  slalom: { label: 'Slalom', emoji: '↕' },
  misere: { label: 'Misère', emoji: '☹' },
  guschti: { label: 'Guschti', emoji: '🃏' },
  dreimaldrei: { label: '3x3', emoji: '③' },
};

/** Auswahl für frei wählbare Reihen: Trümpfe 1x–6x, Slalom, Misère, Guschti, 3x3 */
export const FREE_CHOICES: CoiffeurTrumpf[] = [
  'schaufel',
  'kreuz',
  'ecken',
  'herz',
  'undenufe',
  'obenabe',
  'slalom',
  'misere',
  'guschti',
  'dreimaldrei',
];

export const MIN_ROUNDS = 9;
export const MAX_ROUNDS = 12;

/**
 * Standardbelegung pro Reihe (Index 0 = 1x). `null` = frei wählbar.
 * 1x Schaufel, 2x Kreuz, 3x Ecken, 4x Herz, 5x Undenufe, 6x Obenabe,
 * 7x frei, 8x frei, 9x Slalom, 10x+ frei.
 */
const FIXED_ROWS: (CoiffeurTrumpf | null)[] = [
  'schaufel',
  'kreuz',
  'ecken',
  'herz',
  'undenufe',
  'obenabe',
  null,
  null,
  'slalom',
  null,
  null,
  null,
];

/** Vorbelegung der frei wählbaren Reihen (per Dropdown änderbar) */
const FREE_DEFAULTS: Record<number, CoiffeurTrumpf> = {
  6: 'guschti',
  7: 'misere',
  9: 'dreimaldrei',
  10: 'schaufel',
  11: 'kreuz',
};

export const isFreeRow = (rowIndex: number): boolean => FIXED_ROWS[rowIndex] === null;

export const defaultRowKinds = (rounds: number): CoiffeurTrumpf[] =>
  Array.from({ length: rounds }, (_, i) => FIXED_ROWS[i] ?? FREE_DEFAULTS[i] ?? 'schaufel');

export const rowMultiplier = (rowIndex: number): number => rowIndex + 1;

export interface CoiffeurCellValue {
  /** Rohpunkte (0-157) */
  points: number;
  /** Ob es ein Match war */
  isMatch: boolean;
}

export interface CoiffeurTeamState {
  /** Werte pro Reihe. null = noch nicht gespielt */
  cells: (CoiffeurCellValue | null)[];
}

export interface CoiffeurHistoryEntry {
  /** Welche Reihe */
  rowIndex: number;
  /** Welches Team hat die Runde angesagt */
  team: 0 | 1;
  /** Rohpunkte des ansagenden Teams */
  points: number;
  /** Ob Match */
  isMatch: boolean;
  timestamp: number;
}

export interface CoiffeurGameState {
  version: 3;
  teamNames: [string, string];
  /** Trumpf pro Reihe; Länge = Anzahl Runden, Multiplikator = Index + 1 */
  rowKinds: CoiffeurTrumpf[];
  teams: [CoiffeurTeamState, CoiffeurTeamState];
  /** Gesamtpunktzahl pro Team (mit Multiplikatoren) */
  totals: [number, number];
  history: CoiffeurHistoryEntry[];
  createdAt: number;
}



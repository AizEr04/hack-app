/** Coiffeur Jass Types */

export type CoiffeurTrumpf =
  | 'ecken'
  | 'herz'
  | 'schaufel'
  | 'kreuz'
  | 'obenabe'
  | 'undenufe'
  | 'slalom'
  | 'guschti';

export interface CoiffeurRow {
  trumpf: CoiffeurTrumpf;
  label: string;
  emoji: string;
  multiplier: number;
}

/** Die 8 Coiffeur-Reihen mit ihren Multiplikatoren */
export const COIFFEUR_ROWS: CoiffeurRow[] = [
  { trumpf: 'ecken', label: 'Ecken', emoji: '♦', multiplier: 1 },
  { trumpf: 'herz', label: 'Herz', emoji: '♥', multiplier: 2 },
  { trumpf: 'schaufel', label: 'Schaufel', emoji: '♠', multiplier: 3 },
  { trumpf: 'kreuz', label: 'Kreuz', emoji: '♣', multiplier: 4 },
  { trumpf: 'obenabe', label: 'Obenabe', emoji: '⬆', multiplier: 5 },
  { trumpf: 'undenufe', label: 'Undenufe', emoji: '⬇', multiplier: 6 },
  { trumpf: 'slalom', label: 'Slalom', emoji: '↕', multiplier: 7 },
  { trumpf: 'guschti', label: 'Guschti', emoji: '🃏', multiplier: 8 },
];

export interface CoiffeurCellValue {
  /** Rohpunkte (0-157) */
  points: number;
  /** Ob es ein Match war */
  isMatch: boolean;
}

export interface CoiffeurTeamState {
  /** Werte pro Reihe (Index = Reihenindex in COIFFEUR_ROWS). null = noch nicht gespielt */
  cells: (CoiffeurCellValue | null)[];
}

export interface CoiffeurHistoryEntry {
  /** Welche Reihe (Index in COIFFEUR_ROWS) */
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
  version: 1;
  teams: [CoiffeurTeamState, CoiffeurTeamState];
  /** Gesamtpunktzahl pro Team (mit Multiplikatoren) */
  totals: [number, number];
  history: CoiffeurHistoryEntry[];
  createdAt: number;
}

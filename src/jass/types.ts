/** Jasstafel Types */

export interface JassTeamState {
  /** Hundert-Striche (je 100 Punkte) */
  hundreds: number;
  /** Fünfzig-Striche (je 50 Punkte) */
  fifties: number;
  /** Zwanzig-Striche (je 20 Punkte) */
  twenties: number;
  /** Rest-Punkte (1-19) */
  rest: number;
}

export interface JassRoundEntry {
  /** Punkte für Team 0 (oben/links) */
  team0Points: number;
  /** Punkte für Team 1 (unten/rechts) */
  team1Points: number;
  /** Multiplikator (1-8) */
  multiplier: number;
  /** Ob es ein Match war (157 alle Stiche) */
  isMatch: boolean;
  /** Ob es ein Wyss-Eintrag ist (durch Klicken der roten Linien) */
  isWyss: boolean;
  /** Timestamp */
  timestamp: number;
}

export interface JassGameState {
  version: 1;
  /** Tally-Striche und Rest pro Team */
  teams: [JassTeamState, JassTeamState];
  /** Gesamtpunktzahl pro Team */
  totals: [number, number];
  /** Wyss-Punkte pro Team (durch Klicken der roten Linien) */
  wyss: [number, number];
  /** Runden-Verlauf für Undo */
  history: JassRoundEntry[];
  /** Erstellungszeitpunkt */
  createdAt: number;
}

export type TeamIndex = 0 | 1;

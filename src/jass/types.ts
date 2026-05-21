/** Jasstafel Types */

export interface JassTeamState {
  /** Anzahl Striche auf der 100er-Linie (obere Linie) */
  hundreds: number;
  /** Anzahl Striche auf der 50er-Linie (Diagonale) */
  fifties: number;
  /** Anzahl Striche auf der 20er-Linie (untere Linie) */
  twenties: number;
  /** Rest-Punkte (1-19), angezeigt als Zahl auf der 20er-Linie */
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
  /** Welche Linie beim Wyss geklickt wurde (0=100, 1=50, 2=20) */
  wyssLine?: 0 | 1 | 2;
  /** Für welches Team der Wyss-Eintrag ist */
  wyssTeam?: TeamIndex;
  /** Timestamp */
  timestamp: number;
}

export interface JassGameState {
  version: 1;
  /** Tally-Striche pro Team – werden NICHT aus Total berechnet, sondern direkt geschrieben */
  teams: [JassTeamState, JassTeamState];
  /** Gesamtpunktzahl pro Team (Summe aller Punkte) */
  totals: [number, number];
  /** Runden-Verlauf für Undo */
  history: JassRoundEntry[];
  /** Erstellungszeitpunkt */
  createdAt: number;
}

export type TeamIndex = 0 | 1;

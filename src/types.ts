export type PlayerId = string;

export interface Player {
  id: PlayerId;
  name: string;
}

export interface GameConfig {
  baseBet: number; // CHF
}

/** Pot = Beiträge je Spieler. Schlüssel = PlayerId, Wert = einbezahlter Betrag. */
export type Pot = Record<PlayerId, number>;

export interface ResolvedTransfer {
  from: PlayerId;
  to: PlayerId;
  amount: number;
}

export type RoundOutcome =
  | { kind: 'no-going-along' } // Hacker erhält ganzen Pot, Grundpot Reset
  | { kind: 'all-won' } // Hacker + alle Mitgehenden gewinnen → 2/3 + 1/3, Grundpot Reset
  | { kind: 'mixed' }; // mind. ein Spieler verliert → Verlierer zahlen in nächsten Pot

export interface RoundRecord {
  index: number;
  hackerId: PlayerId;
  goingAlong: PlayerId[];
  tricks: Record<PlayerId, number>; // für aktive Spieler
  potBefore: Pot;
  potTotalBefore: number;
  transfers: ResolvedTransfer[]; // Geldfluss zwischen Spielern (aufgelöst)
  loserPayments: { playerId: PlayerId; amount: number }[]; // Einzahlungen in nächsten Pot
  potAfter: Pot;
  outcome: RoundOutcome;
  winners: PlayerId[];
  losers: PlayerId[];
  /** Anteil aus dem aktuellen Pot, den jeder Gewinner erhalten hat. */
  winnerShares: Record<PlayerId, number>;
}

export interface GameState {
  version: 1;
  players: Player[];
  config: GameConfig;
  pot: Pot;
  rounds: RoundRecord[];
  createdAt: number;
}



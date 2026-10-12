import type {
  GameConfig,
  GameState,
  GrundpotPayment,
  Player,
  PlayerId,
  Pot,
  ResolvedTransfer,
  RoundRecord,
} from './types';
const CENT = 100;
const round2 = (n: number): number => Math.round(n * CENT) / CENT;
export const sumPot = (pot: Pot): number =>
  round2(Object.values(pot).reduce((a, b) => a + b, 0));
export const snapshotPot = (pot: Pot): Pot => ({ ...pot });
export const buildGrundpot = (players: Player[], config: GameConfig): Pot => {
  const pot: Pot = {};
  for (const p of players) pot[p.id] = round2(config.baseBet);
  return pot;
};

/**
 * Liegt im aktuellen Pot eine neutrale Grundpot-Schicht?
 * Deterministisch aus der Historie abgeleitet (nicht aus Beträgen geraten):
 * - Spielstart oder letzte Runde war "alle gewinnen" / "niemand mit" → Grundpot-Reset
 * - letzte Runde "gemischt" → Pot besteht nur aus Verlierer-Einzahlungen
 */
export const hasNeutralGrundpotLayer = (state: GameState): boolean => {
  const last = state.rounds[state.rounds.length - 1];
  if (!last) return true;
  return last.outcome.kind !== 'mixed';
};

/** Prüft ob der aktuelle Pot ein reiner Grundpot ist (jeder Spieler hat genau baseBet) */
export const isGrundpot = (state: GameState): boolean => {
  if (!hasNeutralGrundpotLayer(state)) return false;
  const { players, pot, config } = state;
  const entries = Object.entries(pot).filter(([, amt]) => amt > 0);
  if (entries.length !== players.length) return false;
  const expected = round2(config.baseBet);
  return entries.every(
    ([pid, amt]) =>
      players.some((p) => p.id === pid) && round2(amt) === expected,
  );
};
export const createInitialState = (
  players: Player[],
  config: GameConfig,
): GameState => ({
  version: 1,
  players,
  config,
  pot: buildGrundpot(players, config),
  rounds: [],
  createdAt: Date.now(),
});
const distributeShareFromPot = (
  pot: Pot,
  share: number,
  winnerId: PlayerId,
): ResolvedTransfer[] => {
  const transfers: ResolvedTransfer[] = [];
  const total = sumPot(pot);
  if (share <= 0 || total <= 0) return transfers;
  const factor = Math.min(1, share / total);
  let remaining = share;
  const contributors = Object.keys(pot);
  contributors.forEach((cid, idx) => {
    const amt = pot[cid];
    if (amt <= 0) return;
    const isLast = idx === contributors.length - 1;
    const portion = isLast ? round2(remaining) : round2(amt * factor);
    const take = Math.min(portion, round2(amt));
    if (take <= 0) return;
    pot[cid] = round2(amt - take);
    remaining = round2(remaining - take);
    if (cid !== winnerId) {
      transfers.push({ from: cid, to: winnerId, amount: take });
    }
  });
  return transfers;
};
export interface RoundInput {
  hackerId: PlayerId;
  goingAlong: PlayerId[];
  tricks: Record<PlayerId, number>;
}
export interface ValidationError {
  field: string;
  message: string;
}
export const validateRoundInput = (
  state: GameState,
  input: RoundInput,
): ValidationError[] => {
  const errs: ValidationError[] = [];
  const ids = new Set(state.players.map((p) => p.id));
  if (!ids.has(input.hackerId)) {
    errs.push({ field: 'hackerId', message: 'Hacker nicht in Spielerliste.' });
  }
  for (const id of input.goingAlong) {
    if (!ids.has(id))
      errs.push({ field: 'goingAlong', message: 'Ungueltiger Mitspieler.' });
    if (id === input.hackerId)
      errs.push({ field: 'goingAlong', message: 'Hacker kann nicht zusaetzlich mitgehen.' });
  }
  if (new Set(input.goingAlong).size !== input.goingAlong.length) {
    errs.push({ field: 'goingAlong', message: 'Doppelte Mitspieler.' });
  }
  if (input.goingAlong.length === 0) return errs;
  const active = [input.hackerId, ...input.goingAlong];
  let total = 0;
  for (const pid of active) {
    const t = input.tricks[pid];
    if (typeof t !== 'number' || !Number.isInteger(t) || t < 0 || t > 4) {
      errs.push({ field: `tricks.${pid}`, message: 'Stiche muessen 0-4 sein.' });
    } else {
      total += t;
    }
  }
  if (total > 4) {
    errs.push({
      field: 'tricks',
      message: `Es wurden ${total} Stiche verteilt - maximal 4 erlaubt.`,
    });
  } else if (total !== 4) {
    errs.push({
      field: 'tricks',
      message: `Es wurden ${total} von 4 Stichen verteilt.`,
    });
  }
  return errs;
};
export const applyRound = (
  state: GameState,
  input: RoundInput,
): { state: GameState; record: RoundRecord } => {
  const errs = validateRoundInput(state, input);
  if (errs.length > 0) throw new Error(errs.map((e) => e.message).join(' '));
  const potBefore = snapshotPot(state.pot);
  const potTotalBefore = sumPot(potBefore);
  const workingPot = snapshotPot(potBefore);
  const transfers: ResolvedTransfer[] = [];
  const loserPayments: { playerId: PlayerId; amount: number }[] = [];
  const winnerShares: Record<PlayerId, number> = {};
  if (input.goingAlong.length === 0) {
    transfers.push(...distributeShareFromPot(workingPot, potTotalBefore, input.hackerId));
    winnerShares[input.hackerId] = potTotalBefore;
    // Grundpot-Reset: pending player changes anwenden
    const stateWithChanges = applyPendingPlayerChanges(state);
    const potAfter = buildGrundpot(stateWithChanges.players, state.config);
    const record: RoundRecord = {
      index: state.rounds.length,
      hackerId: input.hackerId,
      goingAlong: [],
      tricks: {},
      potBefore,
      potTotalBefore,
      transfers,
      loserPayments: [],
      potAfter,
      outcome: { kind: 'no-going-along' },
      winners: [input.hackerId],
      losers: [],
      winnerShares,
    };
    return {
      state: { ...stateWithChanges, pot: potAfter, rounds: [...state.rounds, record] },
      record,
    };
  }
  const hackerTricks = input.tricks[input.hackerId] ?? 0;
  const hackerWon = hackerTricks >= 2;
  const goingAlongWon = input.goingAlong.filter((p) => (input.tricks[p] ?? 0) >= 1);
  const goingAlongLost = input.goingAlong.filter((p) => (input.tricks[p] ?? 0) < 1);
  const allActiveWon = hackerWon && goingAlongLost.length === 0;
  let outcome: RoundRecord['outcome'];
  let winners: PlayerId[];
  let losers: PlayerId[];
  if (allActiveWon) {
    outcome = { kind: 'all-won' };
    winners = [input.hackerId, ...input.goingAlong];
    losers = [];
    const hackerShare = round2((potTotalBefore * 2) / 3);
    const restTotal = round2(potTotalBefore - hackerShare);
    const perGoer = round2(restTotal / input.goingAlong.length);
    winnerShares[input.hackerId] = hackerShare;
    transfers.push(...distributeShareFromPot(workingPot, hackerShare, input.hackerId));
    let distributed = 0;
    input.goingAlong.forEach((wid, i) => {
      const share = i === input.goingAlong.length - 1 ? round2(restTotal - distributed) : perGoer;
      winnerShares[wid] = share;
      transfers.push(...distributeShareFromPot(workingPot, share, wid));
      distributed = round2(distributed + share);
    });
  } else {
    outcome = { kind: 'mixed' };
    winners = [...(hackerWon ? [input.hackerId] : []), ...goingAlongWon];
    losers = [...(hackerWon ? [] : [input.hackerId]), ...goingAlongLost];
    if (winners.length > 0 && potTotalBefore > 0) {
      if (hackerWon && goingAlongWon.length > 0) {
        // Hacker gewinnt + einige Mitspieler gewinnen: 2/3 für Hacker, 1/3 für gewinnende Mitspieler
        const hackerShare = round2((potTotalBefore * 2) / 3);
        const restTotal = round2(potTotalBefore - hackerShare);
        const perGoer = round2(restTotal / goingAlongWon.length);
        winnerShares[input.hackerId] = hackerShare;
        transfers.push(...distributeShareFromPot(workingPot, hackerShare, input.hackerId));
        let distributed = 0;
        goingAlongWon.forEach((wid, i) => {
          const share = i === goingAlongWon.length - 1 ? round2(restTotal - distributed) : perGoer;
          winnerShares[wid] = share;
          transfers.push(...distributeShareFromPot(workingPot, share, wid));
          distributed = round2(distributed + share);
        });
      } else if (hackerWon) {
        // Nur Hacker gewinnt, alle Mitspieler verlieren: Hacker erhält ganzen Pot
        winnerShares[input.hackerId] = potTotalBefore;
        transfers.push(...distributeShareFromPot(workingPot, potTotalBefore, input.hackerId));
      } else {
        // Hacker verliert, gewinnende Mitspieler teilen den Pot gleichmässig
        const per = round2(potTotalBefore / goingAlongWon.length);
        let distributed = 0;
        goingAlongWon.forEach((wid, i) => {
          const share = i === goingAlongWon.length - 1 ? round2(potTotalBefore - distributed) : per;
          winnerShares[wid] = share;
          transfers.push(...distributeShareFromPot(workingPot, share, wid));
          distributed = round2(distributed + share);
        });
      }
    }
  }
  let potAfter: Pot;
  if (allActiveWon) {
    // Grundpot-Reset: pending player changes anwenden
    const stateWithChanges = applyPendingPlayerChanges(state);
    potAfter = buildGrundpot(stateWithChanges.players, state.config);
    const record: RoundRecord = {
      index: state.rounds.length,
      hackerId: input.hackerId,
      goingAlong: input.goingAlong,
      tricks: { ...input.tricks },
      potBefore,
      potTotalBefore,
      transfers,
      loserPayments,
      potAfter,
      outcome,
      winners,
      losers,
      winnerShares,
    };
    return {
      state: { ...stateWithChanges, pot: potAfter, rounds: [...state.rounds, record] },
      record,
    };
  } else {
    potAfter = {};
    if (!hackerWon) {
      const amt = round2(potTotalBefore * 2);
      potAfter[input.hackerId] = (potAfter[input.hackerId] ?? 0) + amt;
      loserPayments.push({ playerId: input.hackerId, amount: amt });
    }
    for (const lid of goingAlongLost) {
      const amt = round2(potTotalBefore);
      potAfter[lid] = (potAfter[lid] ?? 0) + amt;
      loserPayments.push({ playerId: lid, amount: amt });
    }
    if (Object.keys(potAfter).length === 0) {
      // Grundpot-Reset: pending player changes anwenden
      const stateWithChanges = applyPendingPlayerChanges(state);
      potAfter = buildGrundpot(stateWithChanges.players, state.config);
      const record: RoundRecord = {
        index: state.rounds.length,
        hackerId: input.hackerId,
        goingAlong: input.goingAlong,
        tricks: { ...input.tricks },
        potBefore,
        potTotalBefore,
        transfers,
        loserPayments,
        potAfter,
        outcome,
        winners,
        losers,
        winnerShares,
      };
      return {
        state: { ...stateWithChanges, pot: potAfter, rounds: [...state.rounds, record] },
        record,
      };
    }
  }
  const record: RoundRecord = {
    index: state.rounds.length,
    hackerId: input.hackerId,
    goingAlong: input.goingAlong,
    tricks: { ...input.tricks },
    potBefore,
    potTotalBefore,
    transfers,
    loserPayments,
    potAfter,
    outcome,
    winners,
    losers,
    winnerShares,
  };
  return {
    state: { ...state, pot: potAfter, rounds: [...state.rounds, record] },
    record,
  };
};

const createBalanceMap = (state: GameState): Record<PlayerId, number> => {
  const balances: Record<PlayerId, number> = {};
  for (const p of state.players) balances[p.id] = 0;
  for (const p of state.removedPlayers ?? []) balances[p.id] = 0;
  return balances;
};

const computeSettledBalances = (state: GameState): Record<PlayerId, number> => {
  const balances = createBalanceMap(state);
  for (const r of state.rounds) {
    for (const t of r.transfers) {
      balances[t.from] = round2((balances[t.from] ?? 0) - t.amount);
      balances[t.to] = round2((balances[t.to] ?? 0) + t.amount);
    }
  }
  return balances;
};

export const computeBalances = (state: GameState): Record<PlayerId, number> => {
  // Geld im Pot gilt als "investiert" und beeinflusst den Spielstand erst,
  // wenn der neue Besitzer feststeht (also über die Transfers einer Runde).
  return computeSettledBalances(state);
};
export const computeNetFlows = (
  state: GameState,
): { from: PlayerId; to: PlayerId; amount: number }[] => {
  // Netto-Geldflüsse zeigen nur bereits aufgelöste Transfers zwischen Spielern,
  // nicht den noch offenen Pot.
  const balance = computeSettledBalances(state);

  // Separiere Debtors (schulden) und Creditors (erhalten)
  const debtors: Array<{ id: PlayerId; amount: number }> = [];
  const creditors: Array<{ id: PlayerId; amount: number }> = [];

  for (const [pid, amt] of Object.entries(balance)) {
    if (amt < -1e-10) debtors.push({ id: pid, amount: -amt });
    else if (amt > 1e-10) creditors.push({ id: pid, amount: amt });
  }

  // Greedy Matching: Matche größte Debtors mit größten Creditors
  const transfers: Array<{ from: PlayerId; to: PlayerId; amount: number }> = [];
  let di = 0;
  let ci = 0;

  while (di < debtors.length && ci < creditors.length) {
    const debtor = debtors[di];
    const creditor = creditors[ci];
    const transfer = Math.min(debtor.amount, creditor.amount);

    if (transfer > 1e-10) {
      transfers.push({
        from: debtor.id,
        to: creditor.id,
        amount: round2(transfer),
      });

      debtor.amount = round2(debtor.amount - transfer);
      creditor.amount = round2(creditor.amount - transfer);
    }

    if (debtor.amount <= 1e-10) di++;
    if (creditor.amount <= 1e-10) ci++;
  }

  transfers.sort((x, y) => y.amount - x.amount);
  return transfers;
};
export const formatCHF = (n: number): string =>
  new Intl.NumberFormat('de-CH', {
    style: 'currency',
    currency: 'CHF',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);

/* ---- Grundpot zahlen (falsch austeilen) ---- */

export const payGrundpot = (
  state: GameState,
  playerId: PlayerId,
): GameState => {
  const amount = round2(state.config.baseBet * state.players.length);
  const newPot = { ...state.pot };
  newPot[playerId] = round2((newPot[playerId] ?? 0) + amount);
  const payment: GrundpotPayment = {
    playerId,
    amount,
    timestamp: Date.now(),
  };
  return {
    ...state,
    pot: newPot,
    grundpotPayments: [...(state.grundpotPayments ?? []), payment],
  };
};

/* ---- Spieler hinzufügen / entfernen (pending) ---- */

export const addPendingPlayer = (
  state: GameState,
  player: Player,
): GameState => {
  const existing = state.pendingAdditions ?? [];
  if (existing.some((p) => p.id === player.id)) return state;
  return { ...state, pendingAdditions: [...existing, player] };
};

export const removePendingPlayer = (
  state: GameState,
  playerId: PlayerId,
): GameState => {
  const existing = state.pendingRemovals ?? [];
  if (existing.includes(playerId)) return state;
  return { ...state, pendingRemovals: [...existing, playerId] };
};

/** Spieler direkt hinzufügen (bei Grundpot) – Pot wird neu berechnet.
 *  Ein früher ausgestiegener Spieler (gleiche ID) wird reaktiviert, nicht dupliziert. */
export const addPlayerImmediate = (
  state: GameState,
  player: Player,
): GameState => {
  if (state.players.some((p) => p.id === player.id)) return state;
  const players = [...state.players, player];
  const pot = buildGrundpot(players, state.config);
  const removedPlayers = (state.removedPlayers ?? []).filter((p) => p.id !== player.id);
  return { ...state, players, pot, removedPlayers };
};

/** Spieler direkt entfernen (bei Grundpot) – Pot wird neu berechnet */
export const removePlayerImmediate = (
  state: GameState,
  playerId: PlayerId,
): GameState => {
  const removed = state.players.find((p) => p.id === playerId);
  const players = state.players.filter((p) => p.id !== playerId);
  const pot = buildGrundpot(players, state.config);
  const removedPlayers = removed
    ? [...(state.removedPlayers ?? []), removed]
    : (state.removedPlayers ?? []);
  return { ...state, players, pot, removedPlayers };
};

export const cancelPendingAddition = (
  state: GameState,
  playerId: PlayerId,
): GameState => ({
  ...state,
  pendingAdditions: (state.pendingAdditions ?? []).filter((p) => p.id !== playerId),
});

export const cancelPendingRemoval = (
  state: GameState,
  playerId: PlayerId,
): GameState => ({
  ...state,
  pendingRemovals: (state.pendingRemovals ?? []).filter((id) => id !== playerId),
});

/** Wendet pending additions/removals an – wird beim nächsten Grundpot aufgerufen */
export const applyPendingPlayerChanges = (
  state: GameState,
): GameState => {
  let players = [...state.players];
  const removals = state.pendingRemovals ?? [];
  const additions = state.pendingAdditions ?? [];

  // Entferne Spieler und merke sie in removedPlayers
  let removedPlayers = [...(state.removedPlayers ?? [])];
  if (removals.length > 0) {
    const removedNow = players.filter((p) => removals.includes(p.id));
    removedPlayers = [...removedPlayers, ...removedNow];
    players = players.filter((p) => !removals.includes(p.id));
  }

  // Füge neue Spieler hinzu (ohne Duplikate; reaktivierte Spieler verlassen removedPlayers)
  if (additions.length > 0) {
    const have = new Set(players.map((p) => p.id));
    const fresh = additions.filter((p) => !have.has(p.id));
    players = [...players, ...fresh];
    const addedIds = new Set(fresh.map((p) => p.id));
    removedPlayers = removedPlayers.filter((p) => !addedIds.has(p.id));
  }

  return {
    ...state,
    players,
    removedPlayers,
    pendingAdditions: [],
    pendingRemovals: [],
  };
};
/* ---- Zustands-Normalisierung (Konsistenz-Garantie) ---- */
const uniqueById = (list: Player[] | undefined, exclude: Set<PlayerId>): Player[] => {
  const seen = new Set<PlayerId>(exclude);
  const out: Player[] = [];
  for (const p of list ?? []) {
    if (!p || typeof p.id !== 'string' || seen.has(p.id)) continue;
    seen.add(p.id);
    out.push(p);
  }
  return out;
};
/**
 * Stellt Invarianten sicher (idempotent, auch für ältere gespeicherte Stände):
 * - jede Spieler-ID kommt in genau einer Liste vor (aktiv / ausgestiegen)
 * - keine doppelten ausstehenden Hinzufügungen/Entfernungen
 * - ausstehende Entfernungen verweisen nur auf aktive Spieler
 */
export const normalizeState = (state: GameState): GameState => {
  const players = uniqueById(state.players, new Set());
  const active = new Set(players.map((p) => p.id));
  const removedPlayers = uniqueById(state.removedPlayers, active);
  const pendingAdditions = uniqueById(state.pendingAdditions, active);
  const pendingRemovals = Array.from(new Set(state.pendingRemovals ?? [])).filter((id) =>
    active.has(id),
  );
  return { ...state, players, removedPlayers, pendingAdditions, pendingRemovals };
};

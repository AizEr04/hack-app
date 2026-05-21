import type {
  GameConfig,
  GameState,
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
    const potAfter = buildGrundpot(state.players, state.config);
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
      state: { ...state, pot: potAfter, rounds: [...state.rounds, record] },
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
      const per = round2(potTotalBefore / winners.length);
      let distributed = 0;
      winners.forEach((wid, i) => {
        const share = i === winners.length - 1 ? round2(potTotalBefore - distributed) : per;
        winnerShares[wid] = share;
        transfers.push(...distributeShareFromPot(workingPot, share, wid));
        distributed = round2(distributed + share);
      });
    }
  }
  let potAfter: Pot;
  if (allActiveWon) {
    potAfter = buildGrundpot(state.players, state.config);
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
      potAfter = buildGrundpot(state.players, state.config);
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
export const computeBalances = (state: GameState): Record<PlayerId, number> => {
  const b: Record<PlayerId, number> = {};
  for (const p of state.players) b[p.id] = 0;

   // Spielstand basiert ausschliesslich auf effektiven Geldflüssen zwischen Spielern.
  // Pot-Beiträge und Pot-Zustand beeinflussen den Spielstand nicht direkt.
  for (const r of state.rounds) {
    for (const t of r.transfers) {
      b[t.from] = round2((b[t.from] ?? 0) - t.amount);
      b[t.to] = round2((b[t.to] ?? 0) + t.amount);
    }
  }

  return b;
};
export const computeNetFlows = (
  state: GameState,
): { from: PlayerId; to: PlayerId; amount: number }[] => {
  // Berechne Gesamtbalance je Spieler: positive = erhält, negative = schuldet
  const balance: Record<PlayerId, number> = {};
  for (const p of state.players) balance[p.id] = 0;

  for (const r of state.rounds) {
    for (const t of r.transfers) {
      balance[t.from] = round2((balance[t.from] ?? 0) - t.amount);
      balance[t.to] = round2((balance[t.to] ?? 0) + t.amount);
    }
  }

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

import type {
  CoiffeurCellValue,
  CoiffeurGameState,
  CoiffeurHistoryEntry,
  CoiffeurTrumpf,
} from './coiffeur-types';
import { defaultRowKinds, rowMultiplier } from './coiffeur-types';

const MAX_ROUND_POINTS = 157;
const MATCH_POINTS = 257;

export function createInitialCoiffeurState(
  teamNames: [string, string],
  rounds: number,
): CoiffeurGameState {
  return {
    version: 3,
    teamNames,
    rowKinds: defaultRowKinds(rounds),
    teams: [{ cells: Array(rounds).fill(null) }, { cells: Array(rounds).fill(null) }],
    totals: [0, 0],
    history: [],
    createdAt: Date.now(),
  };
}

/** Rohpunkte, die ein Team in einer Reihe erhält: eigene Ansage + Gegenpunkte der gegnerischen Ansage. */
export function getRowRawPoints(state: CoiffeurGameState, team: 0 | 1, rowIndex: number): number | null {
  const own: CoiffeurCellValue | null = state.teams[team].cells[rowIndex];
  const opp: CoiffeurCellValue | null = state.teams[team === 0 ? 1 : 0].cells[rowIndex];
  if (!own && !opp) return null;
  const ownPts = own ? (own.isMatch ? MATCH_POINTS : own.points) : 0;
  const oppPts = opp ? (opp.isMatch ? 0 : MAX_ROUND_POINTS - opp.points) : 0;
  return ownPts + oppPts;
}

/** Multiplizierte Punktzahl eines Teams in einer Reihe (Multiplikator = Reihenindex + 1). */
export function getCellScore(state: CoiffeurGameState, team: 0 | 1, rowIndex: number): number {
  return (getRowRawPoints(state, team, rowIndex) ?? 0) * rowMultiplier(rowIndex);
}

export function getCoiffeurTotal(state: CoiffeurGameState, team: 0 | 1): number {
  return state.rowKinds.reduce((sum, _k, idx) => sum + getCellScore(state, team, idx), 0);
}

const withTotals = (state: CoiffeurGameState): CoiffeurGameState => ({
  ...state,
  totals: [getCoiffeurTotal(state, 0), getCoiffeurTotal(state, 1)],
});

const applyEntry = (state: CoiffeurGameState, entry: CoiffeurHistoryEntry): CoiffeurGameState => {
  // Nur die Ansage des ansagenden Teams wird gespeichert; die Gegenpunkte
  // werden in getRowRawPoints berechnet. Die Reihe des Gegners bleibt offen.
  const teams: CoiffeurGameState['teams'] = [
    { cells: [...state.teams[0].cells] },
    { cells: [...state.teams[1].cells] },
  ];
  teams[entry.team].cells[entry.rowIndex] = { points: entry.points, isMatch: entry.isMatch };
  return withTotals({ ...state, teams });
};

/** Schreibt Punkte für ein Team; Gegner bekommt 157 − Punkte (Match: 0). */
export function writeCoiffeurPoints(
  state: CoiffeurGameState,
  rowIndex: number,
  team: 0 | 1,
  points: number,
  isMatch: boolean,
): CoiffeurGameState {
  if (rowIndex < 0 || rowIndex >= state.rowKinds.length) return state;
  if (state.teams[team].cells[rowIndex] !== null) return state;
  const entry: CoiffeurHistoryEntry = {
    rowIndex,
    team,
    points: isMatch ? MAX_ROUND_POINTS : Math.max(0, Math.min(MAX_ROUND_POINTS, points)),
    isMatch,
    timestamp: Date.now(),
  };
  const next = applyEntry(state, entry);
  return { ...next, history: [...state.history, entry] };
}

/** Trumpf einer Reihe ändern – nur solange noch kein Team sie gespielt hat. */
export function setRowKind(
  state: CoiffeurGameState,
  rowIndex: number,
  kind: CoiffeurTrumpf,
): CoiffeurGameState {
  if (rowIndex < 0 || rowIndex >= state.rowKinds.length) return state;
  if (state.teams[0].cells[rowIndex] !== null || state.teams[1].cells[rowIndex] !== null) return state;
  const rowKinds = [...state.rowKinds];
  rowKinds[rowIndex] = kind;
  return { ...state, rowKinds };
}

/** Letzte Eingabe rückgängig machen (Einstellungen bleiben erhalten). */
export function undoCoiffeurLast(state: CoiffeurGameState): CoiffeurGameState {
  if (state.history.length === 0) return state;
  const history = state.history.slice(0, -1);
  const rounds = state.rowKinds.length;
  let next: CoiffeurGameState = withTotals({
    ...state,
    teams: [{ cells: Array(rounds).fill(null) }, { cells: Array(rounds).fill(null) }],
    history: [],
  });
  for (const entry of history) next = applyEntry(next, entry);
  return { ...next, history };
}








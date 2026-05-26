import type { CoiffeurCellValue, CoiffeurGameState, CoiffeurHistoryEntry } from './coiffeur-types';
import { COIFFEUR_ROWS } from './coiffeur-types';

const MAX_ROUND_POINTS = 157;
const MATCH_POINTS = 257;

export function createInitialCoiffeurState(): CoiffeurGameState {
  return {
    version: 1,
    teams: [
      { cells: Array(COIFFEUR_ROWS.length).fill(null) },
      { cells: Array(COIFFEUR_ROWS.length).fill(null) },
    ],
    totals: [0, 0],
    history: [],
    createdAt: Date.now(),
  };
}

/**
 * Berechnet die multiplizierte Punktzahl für eine Zelle.
 */
export function getCellScore(cell: CoiffeurCellValue | null, rowIndex: number): number {
  if (!cell) return 0;
  const multiplier = COIFFEUR_ROWS[rowIndex].multiplier;
  if (cell.isMatch) return MATCH_POINTS * multiplier;
  return cell.points * multiplier;
}

/**
 * Berechnet die Gesamtpunktzahl eines Teams.
 */
export function getCoiffeurTotal(state: CoiffeurGameState, team: 0 | 1): number {
  return state.teams[team].cells.reduce((sum, cell, idx) => sum + getCellScore(cell, idx), 0);
}

/**
 * Schreibt Punkte für ein Team in eine bestimmte Reihe.
 * Berechnet automatisch die Gegner-Punkte (157 - Punkte).
 */
export function writeCoiffeurPoints(
  state: CoiffeurGameState,
  rowIndex: number,
  team: 0 | 1,
  points: number,
  isMatch: boolean,
): CoiffeurGameState {
  const otherTeam = team === 0 ? 1 : 0;

  const newTeams: [typeof state.teams[0], typeof state.teams[1]] = [
    { cells: [...state.teams[0].cells] },
    { cells: [...state.teams[1].cells] },
  ];

  // Ansagendes Team bekommt seine Punkte
  const teamCell: CoiffeurCellValue = { points: isMatch ? MAX_ROUND_POINTS : points, isMatch };
  newTeams[team].cells[rowIndex] = teamCell;

  // Gegner bekommt die Restpunkte (bei Match = 0)
  const otherPoints = isMatch ? 0 : MAX_ROUND_POINTS - points;
  const otherCell: CoiffeurCellValue = { points: otherPoints, isMatch: false };
  newTeams[otherTeam].cells[rowIndex] = otherCell;

  const entry: CoiffeurHistoryEntry = {
    rowIndex,
    team,
    points: isMatch ? MAX_ROUND_POINTS : points,
    isMatch,
    timestamp: Date.now(),
  };

  const newState: CoiffeurGameState = {
    ...state,
    teams: newTeams,
    history: [...state.history, entry],
    totals: [0, 0], // wird unten berechnet
  };

  newState.totals = [getCoiffeurTotal(newState, 0), getCoiffeurTotal(newState, 1)];
  return newState;
}

/**
 * Letzte Eingabe rückgängig machen.
 */
export function undoCoiffeurLast(state: CoiffeurGameState): CoiffeurGameState {
  if (state.history.length === 0) return state;
  const newHistory = state.history.slice(0, -1);
  return rebuildCoiffeurFromHistory(newHistory, state.createdAt);
}

/**
 * Baut den State aus der History neu auf.
 */
function rebuildCoiffeurFromHistory(history: CoiffeurHistoryEntry[], createdAt: number): CoiffeurGameState {
  let state = createInitialCoiffeurState();
  state.createdAt = createdAt;

  for (const entry of history) {
    const otherTeam = entry.team === 0 ? 1 : 0;
    const teamCell: CoiffeurCellValue = { points: entry.points, isMatch: entry.isMatch };
    const otherPoints = entry.isMatch ? 0 : MAX_ROUND_POINTS - entry.points;
    const otherCell: CoiffeurCellValue = { points: otherPoints, isMatch: false };

    state.teams[entry.team].cells[entry.rowIndex] = teamCell;
    state.teams[otherTeam].cells[entry.rowIndex] = otherCell;
  }

  state.history = history;
  state.totals = [getCoiffeurTotal(state, 0), getCoiffeurTotal(state, 1)];
  return state;
}

/**
 * Tafel komplett zurücksetzen.
 */
export function clearCoiffeurTafel(): CoiffeurGameState {
  return createInitialCoiffeurState();
}

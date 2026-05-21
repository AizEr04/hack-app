import type { JassGameState, JassRoundEntry, JassTeamState, TeamIndex } from './types';

const MAX_ROUND_POINTS = 157;
const MATCH_POINTS = 257;

export function createInitialJassState(): JassGameState {
  return {
    version: 1,
    teams: [
      { hundreds: 0, fifties: 0, twenties: 0, rest: 0 },
      { hundreds: 0, fifties: 0, twenties: 0, rest: 0 },
    ],
    totals: [0, 0],
    wyss: [0, 0],
    history: [],
    createdAt: Date.now(),
  };
}

/**
 * Berechnet die Tally-Darstellung aus einer Gesamtpunktzahl.
 * Hundert → Fünfzig → Zwanzig → Rest
 */
export function computeTallyFromTotal(total: number): JassTeamState {
  let remaining = total;
  const hundreds = Math.floor(remaining / 100);
  remaining -= hundreds * 100;
  const fifties = Math.floor(remaining / 50);
  remaining -= fifties * 50;
  const twenties = Math.floor(remaining / 20);
  remaining -= twenties * 20;
  return { hundreds, fifties, twenties, rest: remaining };
}

/**
 * Schreibt Punkte für ein Team. Berechnet automatisch die Gegner-Punkte.
 * Bei Match: 257 für das Team, 0 für Gegner.
 */
export function writePoints(
  state: JassGameState,
  scoringTeam: TeamIndex,
  points: number,
  multiplier: number,
  isMatch: boolean,
): JassGameState {
  let team0Points: number;
  let team1Points: number;

  if (isMatch) {
    const matchPoints = MATCH_POINTS * multiplier;
    if (scoringTeam === 0) {
      team0Points = matchPoints;
      team1Points = 0;
    } else {
      team0Points = 0;
      team1Points = matchPoints;
    }
  } else {
    const scoringPoints = points * multiplier;
    const otherPoints = (MAX_ROUND_POINTS - points) * multiplier;
    if (scoringTeam === 0) {
      team0Points = scoringPoints;
      team1Points = otherPoints;
    } else {
      team0Points = otherPoints;
      team1Points = scoringPoints;
    }
  }

  const entry: JassRoundEntry = {
    team0Points,
    team1Points,
    multiplier,
    isMatch,
    isWyss: false,
    timestamp: Date.now(),
  };

  const newTotals: [number, number] = [
    state.totals[0] + team0Points,
    state.totals[1] + team1Points,
  ];

  const newTeams: [JassTeamState, JassTeamState] = [
    computeTallyFromTotal(newTotals[0] + state.wyss[0]),
    computeTallyFromTotal(newTotals[1] + state.wyss[1]),
  ];

  return {
    ...state,
    teams: newTeams,
    totals: newTotals,
    history: [...state.history, entry],
  };
}

/**
 * Wyss hinzufügen (durch Klicken der roten Linien).
 * lineIndex: 0 = obere Linie (100), 1 = diagonale (50), 2 = untere Linie (20)
 */
export function addWyss(
  state: JassGameState,
  team: TeamIndex,
  lineIndex: 0 | 1 | 2,
): JassGameState {
  const points = lineIndex === 0 ? 100 : lineIndex === 1 ? 50 : 20;

  const newWyss: [number, number] = [...state.wyss];
  newWyss[team] += points;

  const newTeams: [JassTeamState, JassTeamState] = [
    computeTallyFromTotal(state.totals[0] + newWyss[0]),
    computeTallyFromTotal(state.totals[1] + newWyss[1]),
  ];

  const entry: JassRoundEntry = {
    team0Points: team === 0 ? points : 0,
    team1Points: team === 1 ? points : 0,
    multiplier: 1,
    isMatch: false,
    isWyss: true,
    timestamp: Date.now(),
  };

  return {
    ...state,
    teams: newTeams,
    wyss: newWyss,
    history: [...state.history, entry],
  };
}

/**
 * Letzte Eingabe rückgängig machen.
 */
export function undoLast(state: JassGameState): JassGameState {
  if (state.history.length === 0) return state;

  const newHistory = state.history.slice(0, -1);

  // Alles neu berechnen aus der History
  let totals: [number, number] = [0, 0];
  let wyss: [number, number] = [0, 0];

  for (const entry of newHistory) {
    if (entry.isWyss) {
      wyss[0] += entry.team0Points;
      wyss[1] += entry.team1Points;
    } else {
      totals[0] += entry.team0Points;
      totals[1] += entry.team1Points;
    }
  }

  const teams: [JassTeamState, JassTeamState] = [
    computeTallyFromTotal(totals[0] + wyss[0]),
    computeTallyFromTotal(totals[1] + wyss[1]),
  ];

  return {
    ...state,
    teams,
    totals,
    wyss,
    history: newHistory,
  };
}

/**
 * Tafel komplett zurücksetzen.
 */
export function clearTafel(): JassGameState {
  return createInitialJassState();
}

/**
 * Gesamtpunktzahl eines Teams (inkl. Wyss).
 */
export function getTeamTotal(state: JassGameState, team: TeamIndex): number {
  return state.totals[team] + state.wyss[team];
}

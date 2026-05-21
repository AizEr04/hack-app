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
    history: [],
    createdAt: Date.now(),
  };
}

/**
 * Verteilt Punkte sinnvoll auf die Striche einer Teamseite.
 * Punkte werden aufgeteilt in:
 * - 100er-Striche (obere Linie)
 * - 50er-Striche (diagonale Linie)
 * - 20er-Striche (untere Linie)
 * - Rest (1-19, als Zahl auf der unteren Linie)
 *
 * WICHTIG: Bestehende Striche werden NICHT zusammengefasst.
 * 5 bestehende 20er-Striche bleiben 5 Striche, werden nicht zu einem 100er.
 * Nur die neuen Punkte werden sinnvoll verteilt.
 */
function distributePointsToTally(
  current: JassTeamState,
  points: number,
): JassTeamState {
  // Neuen Rest mit den neuen Punkten zusammenrechnen
  let remaining = current.rest + points;

  // Neue 100er aus den neuen Punkten + altem Rest
  const newHundreds = Math.floor(remaining / 100);
  remaining -= newHundreds * 100;

  // Neue 50er
  const newFifties = Math.floor(remaining / 50);
  remaining -= newFifties * 50;

  // Neue 20er
  const newTwenties = Math.floor(remaining / 20);
  remaining -= newTwenties * 20;

  return {
    hundreds: current.hundreds + newHundreds,
    fifties: current.fifties + newFifties,
    twenties: current.twenties + newTwenties,
    rest: remaining,
  };
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
    team0Points > 0 ? distributePointsToTally(state.teams[0], team0Points) : state.teams[0],
    team1Points > 0 ? distributePointsToTally(state.teams[1], team1Points) : state.teams[1],
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
 * Striche bleiben auf der Linie wo sie geschrieben wurden.
 */
export function addWyss(
  state: JassGameState,
  team: TeamIndex,
  lineIndex: 0 | 1 | 2,
): JassGameState {
  const points = lineIndex === 0 ? 100 : lineIndex === 1 ? 50 : 20;

  const newTeams: [JassTeamState, JassTeamState] = [
    { ...state.teams[0] },
    { ...state.teams[1] },
  ];

  if (lineIndex === 0) {
    newTeams[team].hundreds += 1;
  } else if (lineIndex === 1) {
    newTeams[team].fifties += 1;
  } else {
    newTeams[team].twenties += 1;
  }

  const newTotals: [number, number] = [
    state.totals[0] + (team === 0 ? points : 0),
    state.totals[1] + (team === 1 ? points : 0),
  ];

  const entry: JassRoundEntry = {
    team0Points: team === 0 ? points : 0,
    team1Points: team === 1 ? points : 0,
    multiplier: 1,
    isMatch: false,
    isWyss: true,
    wyssLine: lineIndex,
    wyssTeam: team,
    timestamp: Date.now(),
  };

  return {
    ...state,
    teams: newTeams,
    totals: newTotals,
    history: [...state.history, entry],
  };
}

/**
 * Letzte Eingabe rückgängig machen.
 * Berechnet den gesamten State aus der History neu.
 */
export function undoLast(state: JassGameState): JassGameState {
  if (state.history.length === 0) return state;

  const newHistory = state.history.slice(0, -1);
  return rebuildFromHistory(newHistory, state.createdAt);
}

/**
 * Baut den gesamten State aus der History neu auf.
 */
function rebuildFromHistory(history: JassRoundEntry[], createdAt: number): JassGameState {
  let totals: [number, number] = [0, 0];
  const teams: [JassTeamState, JassTeamState] = [
    { hundreds: 0, fifties: 0, twenties: 0, rest: 0 },
    { hundreds: 0, fifties: 0, twenties: 0, rest: 0 },
  ];

  for (const entry of history) {
    if (entry.isWyss) {
      // Wyss: Strich direkt auf die entsprechende Linie
      const team = entry.wyssTeam ?? (entry.team0Points > 0 ? 0 : 1);
      const line = entry.wyssLine ?? (entry.team0Points === 100 || entry.team1Points === 100 ? 0 : entry.team0Points === 50 || entry.team1Points === 50 ? 1 : 2);
      if (line === 0) teams[team].hundreds += 1;
      else if (line === 1) teams[team].fifties += 1;
      else teams[team].twenties += 1;
      totals[0] += entry.team0Points;
      totals[1] += entry.team1Points;
    } else {
      // Normale Runde: Punkte sinnvoll verteilen (100er, 50er, 20er, Rest)
      if (entry.team0Points > 0) {
        let remaining = teams[0].rest + entry.team0Points;
        const newH = Math.floor(remaining / 100);
        remaining -= newH * 100;
        const newF = Math.floor(remaining / 50);
        remaining -= newF * 50;
        const newT = Math.floor(remaining / 20);
        remaining -= newT * 20;
        teams[0].hundreds += newH;
        teams[0].fifties += newF;
        teams[0].twenties += newT;
        teams[0].rest = remaining;
      }
      if (entry.team1Points > 0) {
        let remaining = teams[1].rest + entry.team1Points;
        const newH = Math.floor(remaining / 100);
        remaining -= newH * 100;
        const newF = Math.floor(remaining / 50);
        remaining -= newF * 50;
        const newT = Math.floor(remaining / 20);
        remaining -= newT * 20;
        teams[1].hundreds += newH;
        teams[1].fifties += newF;
        teams[1].twenties += newT;
        teams[1].rest = remaining;
      }
      totals[0] += entry.team0Points;
      totals[1] += entry.team1Points;
    }
  }

  return {
    version: 1,
    teams,
    totals,
    history,
    createdAt,
  };
}

/**
 * Tafel komplett zurücksetzen.
 */
export function clearTafel(): JassGameState {
  return createInitialJassState();
}

/**
 * Gesamtpunktzahl eines Teams.
 */
export function getTeamTotal(state: JassGameState, team: TeamIndex): number {
  return state.totals[team];
}

import type { CoiffeurGameState } from './coiffeur-types';
import { MAX_ROUNDS, MIN_ROUNDS, TRUMPF_INFO } from './coiffeur-types';

const KEY = 'jass-coiffeur:state:v3';

const isValid = (s: unknown): s is CoiffeurGameState => {
  const p = s as CoiffeurGameState | null;
  if (!p || p.version !== 3) return false;
  if (!Array.isArray(p.rowKinds) || p.rowKinds.length < MIN_ROUNDS || p.rowKinds.length > MAX_ROUNDS) {
    return false;
  }
  if (!p.rowKinds.every((k) => k in TRUMPF_INFO)) return false;
  if (!Array.isArray(p.teamNames) || p.teamNames.length !== 2) return false;
  if (!Array.isArray(p.teams) || p.teams.length !== 2) return false;
  if (!p.teams.every((t) => Array.isArray(t?.cells) && t.cells.length === p.rowKinds.length)) return false;
  return Array.isArray(p.history) && Array.isArray(p.totals);
};

export const loadCoiffeurState = (): CoiffeurGameState | null => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isValid(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

export const saveCoiffeurState = (state: CoiffeurGameState | null): void => {
  try {
    if (state == null) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* Quota – stillschweigend ignorieren */
  }
};




import type { CoiffeurGameState } from './coiffeur-types';

const KEY = 'jass-coiffeur:state:v1';

export const loadCoiffeurState = (): CoiffeurGameState | null => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CoiffeurGameState;
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.teams)) return null;
    return parsed;
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

import type { JassGameState } from './types';

const KEY = 'jass-tafel:state:v1';

export const loadJassState = (): JassGameState | null => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as JassGameState;
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.teams)) return null;
    return parsed;
  } catch {
    return null;
  }
};

export const saveJassState = (state: JassGameState | null): void => {
  try {
    if (state == null) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* Quota – stillschweigend ignorieren */
  }
};

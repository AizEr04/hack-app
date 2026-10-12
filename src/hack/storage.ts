import type { GameState } from './types';
import { normalizeState } from './game';

const KEY = 'hack-app:state:v1';

export const loadState = (): GameState | null => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GameState;
    if (
      !parsed ||
      parsed.version !== 1 ||
      !Array.isArray(parsed.players) ||
      !Array.isArray(parsed.rounds) ||
      typeof parsed.pot !== 'object' ||
      parsed.pot === null ||
      typeof parsed.config?.baseBet !== 'number'
    ) {
      return null;
    }
    return normalizeState(parsed);
  } catch {
    return null;
  }
};

export const saveState = (state: GameState | null): void => {
  try {
    if (state == null) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* Quota o.ä. – stillschweigend ignorieren */
  }
};


import type { ScoringMode } from './types';

export const SCORING_LABEL: Record<ScoringMode, string> = {
  'higher-wins': 'Höhere Punktzahl gewinnt',
  'lower-wins': 'Tiefere Punktzahl gewinnt (z.B. Golf)',
};

export const formatDate = (ts: number): string =>
  new Date(ts).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' });

/** 3 → "3", 1.5 → "1.5", 2.25 → "2.25" */
export const formatScore = (n: number): string =>
  Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');

export const formatPercent = (ratio: number): string => `${Math.round(ratio * 100)}%`;

/** Zeitstempel → "YYYY-MM-DD" (lokale Zeit, für <input type="date">) */
export const toDateInput = (ts: number): string => {
  const d = new Date(ts);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
};

/** "YYYY-MM-DD" → Zeitstempel (12:00 lokale Zeit, robust gegen Zeitzonen) oder null */
export const fromDateInput = (value: string): number | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(y, mo - 1, d, 12);
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return null;
  return date.getTime();
};

/** Akzeptiert "21", "1,5", "1.5"; leer/ungültig → NaN */
export const parseScore = (value: string): number => {
  const t = value.trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(t)) return Number.NaN;
  return Number(t);
};


import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultRowKinds, isFreeRow } from '../src/jass/coiffeur/coiffeur-types.ts';
import {
  createInitialCoiffeurState,
  getCellScore,
  setRowKind,
  undoCoiffeurLast,
  writeCoiffeurPoints,
} from '../src/jass/coiffeur/coiffeur-logic.ts';

const names: [string, string] = ['A', 'B'];

test('Standardreihenfolge 1x–9x', () => {
  const k = defaultRowKinds(9);
  assert.deepEqual(
    [k[0], k[1], k[2], k[3], k[4], k[5], k[8]],
    ['schaufel', 'kreuz', 'ecken', 'herz', 'undenufe', 'obenabe', 'slalom'],
  );
  assert.deepEqual([6, 7, 9].map(isFreeRow), [true, true, true]);
  assert.equal(defaultRowKinds(12).length, 12);
});

test('Ansage zählt mit Multiplikator, Gegner bekommt 157 − Punkte, Total pro Team', () => {
  let s = createInitialCoiffeurState(names, 9);
  s = writeCoiffeurPoints(s, 2, 0, 100, false); // A sagt 3x an
  assert.deepEqual(s.totals, [300, 57 * 3]);
  s = writeCoiffeurPoints(s, 0, 1, 157, true); // B macht 1x mit Match
  assert.deepEqual(s.totals, [300, 171 + 257]);
});

test('Jedes Team kann jeden Trumpf einmal ansagen (Reihe bleibt für Gegner offen)', () => {
  let s = createInitialCoiffeurState(names, 9);
  s = writeCoiffeurPoints(s, 0, 0, 100, false); // A: 100, B erhält 57
  s = writeCoiffeurPoints(s, 0, 1, 80, false); // B sagt dieselbe Reihe an: B 80, A erhält 77
  assert.equal(getCellScore(s, 0, 0), 100 + 77);
  assert.equal(getCellScore(s, 1, 0), 57 + 80);
  // dasselbe Team nicht zweimal
  assert.equal(writeCoiffeurPoints(s, 0, 0, 10, false), s);
});

test('Undo stellt vorherigen Stand her', () => {
  let s = createInitialCoiffeurState(names, 10);
  s = writeCoiffeurPoints(s, 0, 0, 80, false);
  s = writeCoiffeurPoints(s, 1, 1, 100, false);
  s = undoCoiffeurLast(s);
  assert.deepEqual(s.totals, [80, 77]);
  assert.equal(s.rowKinds.length, 10);
  assert.deepEqual(s.teamNames, names);
});

test('Frei wählbare Reihe nur ändern, solange kein Team sie gespielt hat', () => {
  let s = createInitialCoiffeurState(names, 9);
  s = setRowKind(s, 6, 'dreimaldrei');
  assert.equal(s.rowKinds[6], 'dreimaldrei');
  s = writeCoiffeurPoints(s, 6, 1, 90, false);
  assert.equal(setRowKind(s, 6, 'herz').rowKinds[6], 'dreimaldrei');
});


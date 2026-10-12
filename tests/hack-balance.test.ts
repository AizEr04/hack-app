import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  addPlayerImmediate,
  applyRound,
  computeBalances,
  computeNetFlows,
  createInitialState,
  isGrundpot,
  normalizeState,
  payGrundpot,
  removePlayerImmediate,
} from '../src/hack/game.ts';

const players = [
  { id: 'a', name: 'A' },
  { id: 'b', name: 'B' },
  { id: 'c', name: 'C' },
];

test('Initialer Grundpot ist neutral', () => {
  const state = createInitialState(players, { baseBet: 1 });
  assert.deepEqual(computeBalances(state), { a: 0, b: 0, c: 0 });
});

test('Grundpot zahlen (falsch austeilen) ändert den Spielstand nicht (Geld gilt als investiert)', () => {
  const state = payGrundpot(createInitialState(players, { baseBet: 1 }), 'b');
  assert.deepEqual(computeBalances(state), { a: 0, b: 0, c: 0 });
});

test('Gemischte Runde: Spielstand nur aus aufgelösten Transfers, Pot bleibt investiert', () => {
  let state = createInitialState(players, { baseBet: 1 });
  ({ state } = applyRound(state, { hackerId: 'a', goingAlong: ['b'], tricks: { a: 4, b: 0 } }));
  assert.deepEqual(computeBalances(state), { a: 2, b: -1, c: -1 });
  assert.deepEqual(computeNetFlows(state), [
    { from: 'b', to: 'a', amount: 1 },
    { from: 'c', to: 'a', amount: 1 },
  ]);

  // Offener Pot (b: 3) wird aufgelöst: erst jetzt wirkt er sich aus
  ({ state } = applyRound(state, { hackerId: 'c', goingAlong: [], tricks: {} }));
  assert.deepEqual(computeBalances(state), { a: 2, b: -4, c: 2 });
});

test('Verlierer-Pot + Grundpot zahlen: weder Spielstand noch Grundpot-Erkennung verfälscht', () => {
  const two = [
    { id: 'x', name: 'X' },
    { id: 'y', name: 'Y' },
  ];
  let s = createInitialState(two, { baseBet: 1 });
  ({ state: s } = applyRound(s, { hackerId: 'x', goingAlong: ['y'], tricks: { x: 0, y: 4 } }));
  s = payGrundpot(s, 'y');
  assert.deepEqual(computeBalances(s), { x: -1, y: 1 });
  assert.equal(isGrundpot(s), false);
});

test('Spieler entfernen und wieder hinzufügen: keine Duplikate, Spielstand bleibt', () => {
  let s = createInitialState(players, { baseBet: 1 });
  ({ state: s } = applyRound(s, { hackerId: 'a', goingAlong: [], tricks: {} }));
  const before = computeBalances(s);
  s = removePlayerImmediate(s, 'c');
  s = addPlayerImmediate(s, { id: 'c', name: 'C' });
  s = normalizeState(s);
  assert.deepEqual(s.players.map((p) => p.id), ['a', 'b', 'c']);
  assert.deepEqual(s.removedPlayers, []);
  assert.deepEqual(computeBalances(s), before);
});

test('normalizeState entfernt Duplikate und ungültige Verweise', () => {
  const s = createInitialState(players, { baseBet: 1 });
  const dirty = normalizeState({
    ...s,
    removedPlayers: [{ id: 'a', name: 'A' }],
    pendingRemovals: ['a', 'a', 'zzz'],
  });
  assert.deepEqual(dirty.removedPlayers, []);
  assert.deepEqual(dirty.pendingRemovals, ['a']);
});

test('Viele Spieler, viele Runden: Salden summieren sich zu 0 und Geldflüsse gleichen sie aus', () => {
  const many = Array.from({ length: 12 }, (_, i) => ({ id: `p${i}`, name: `P${i}` }));
  let s = createInitialState(many, { baseBet: 0.2 });
  for (let r = 0; r < 20; r++) {
    const h = `p${r % 12}`;
    const g = [`p${(r + 1) % 12}`, `p${(r + 5) % 12}`];
    const tricks =
      r % 3 === 0
        ? { [h]: 4, [g[0]]: 0, [g[1]]: 0 }
        : r % 3 === 1
          ? { [h]: 1, [g[0]]: 3, [g[1]]: 0 }
          : { [h]: 2, [g[0]]: 1, [g[1]]: 1 };
    ({ state: s } = applyRound(s, { hackerId: h, goingAlong: g, tricks }));
  }
  const balances = computeBalances(s);
  const sum = Object.values(balances).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(sum) < 0.011, `Summe der Salden: ${sum}`);

  const applied: Record<string, number> = { ...balances };
  for (const f of computeNetFlows(s)) {
    applied[f.from] += f.amount;
    applied[f.to] -= f.amount;
  }
  for (const v of Object.values(applied)) assert.ok(Math.abs(v) < 0.011);
});


import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ScoreboardError,
  addMatch,
  addPlayer,
  computeStandings,
  createScoreboard,
  matchWinner,
  parseNameList,
  removeMatch,
  removePlayer,
  sortedMatches,
  updateScoreboardDetails,
  validateMatchInput,
} from '../src/scoreboard/logic.ts';
import {
  LocalStorageScoreboardRepository,
  MemoryStorage,
  STORAGE_KEY,
  parsePersisted,
  sanitizeScoreboard,
} from '../src/scoreboard/repository.ts';
import { formatScore, fromDateInput, parseScore, toDateInput } from '../src/scoreboard/format.ts';
import type { Scoreboard } from '../src/scoreboard/types.ts';

const ids = () => {
  let n = 0;
  return () => `id${++n}`;
};
const opts = () => ({ now: 1000, createId: ids() });

const pidOf = (b: Scoreboard, name: string): string => {
  const p = b.players.find((x) => x.name === name);
  if (!p) throw new Error(`Spieler ${name} fehlt`);
  return p.id;
};

const tableTennis = (): Scoreboard => createScoreboard({ name: 'Tischtennis', playerNames: ['Anna', 'Ben'] }, opts());

/* ---------- Scoreboard & Spieler ---------- */

test('createScoreboard: Name erforderlich, Text wird bereinigt, Duplikate ignoriert', () => {
  assert.throws(() => createScoreboard({ name: '   ' }), ScoreboardError);
  const b = createScoreboard(
    { name: '  Tisch   tennis ', discipline: ' Sport ', playerNames: ['Anna', 'anna', ' ', 'Ben'] },
    opts(),
  );
  assert.equal(b.name, 'Tisch tennis');
  assert.equal(b.discipline, 'Sport');
  assert.equal(b.scoring, 'higher-wins');
  assert.deepEqual(b.players.map((p) => p.name), ['Anna', 'Ben']);
});

test('addPlayer: leer und doppelt (case-insensitive) wird abgelehnt', () => {
  const b = tableTennis();
  assert.throws(() => addPlayer(b, ''), ScoreboardError);
  assert.throws(() => addPlayer(b, 'ANNA'), /bereits/);
  assert.equal(addPlayer(b, 'Carla').players.length, 3);
});

test('removePlayer: ohne Matches gelöscht, mit Matches deaktiviert; Wiederaufnahme behält ID', () => {
  let b = createScoreboard({ name: 'X', playerNames: ['Anna', 'Ben', 'Carla'] }, opts());
  const [anna, ben, carla] = b.players.map((p) => p.id);
  b = addMatch(b, { sideA: [anna], sideB: [ben], scoreA: 3, scoreB: 1 });

  b = removePlayer(b, carla);
  assert.equal(b.players.some((p) => p.id === carla), false);

  b = removePlayer(b, ben);
  assert.equal(b.players.find((p) => p.id === ben)?.active, false);
  assert.equal(b.matches.length, 1, 'Historie bleibt');
  assert.deepEqual(computeStandings(b).map((r) => r.name), ['Anna']);

  b = addPlayer(b, 'ben');
  assert.equal(b.players.find((p) => p.id === ben)?.active, true);
  assert.equal(computeStandings(b).find((r) => r.playerId === ben)?.losses, 1);
});

test('updateScoreboardDetails ändert Name/Wertung, leerer Name verboten', () => {
  const b = tableTennis();
  assert.throws(() => updateScoreboardDetails(b, { name: ' ' }), ScoreboardError);
  const u = updateScoreboardDetails(b, { name: 'Neu', discipline: '', scoring: 'lower-wins' }, { now: 5 });
  assert.equal(u.name, 'Neu');
  assert.equal(u.discipline, undefined);
  assert.equal(u.scoring, 'lower-wins');
  assert.equal(u.updatedAt, 5);
});

/* ---------- Matches ---------- */

test('validateMatchInput: leere Seiten, gleiche Spieler, ungültige Punkte', () => {
  const b = tableTennis();
  const [a, c] = b.players.map((p) => p.id);
  assert.ok(validateMatchInput(b, { sideA: [], sideB: [c], scoreA: 1, scoreB: 2 }).length > 0);
  assert.ok(validateMatchInput(b, { sideA: [a], sideB: [a], scoreA: 1, scoreB: 2 }).some((e) => e.includes('beiden')));
  assert.ok(validateMatchInput(b, { sideA: [a], sideB: [c], scoreA: Number.NaN, scoreB: 2 }).length > 0);
  assert.ok(validateMatchInput(b, { sideA: [a], sideB: [c], scoreA: -1, scoreB: 2 }).length > 0);
  assert.ok(validateMatchInput(b, { sideA: [a], sideB: ['fremd'], scoreA: 1, scoreB: 2 }).length > 0);
  assert.deepEqual(validateMatchInput(b, { sideA: [a], sideB: [c], scoreA: 11, scoreB: 9 }), []);
  assert.throws(() => addMatch(b, { sideA: [a], sideB: [a], scoreA: 1, scoreB: 0 }), ScoreboardError);
});

test('matchWinner berücksichtigt Wertung und Unentschieden', () => {
  const match = (a: number, b: number): Scoreboard['matches'][number] => ({
    id: 'm',
    playedAt: 0,
    createdAt: 0,
    sides: [
      { playerIds: ['a'], score: a },
      { playerIds: ['b'], score: b },
    ],
  });
  assert.equal(matchWinner(match(3, 1), 'higher-wins'), 0);
  assert.equal(matchWinner(match(3, 1), 'lower-wins'), 1);
  assert.equal(matchWinner(match(2, 2), 'higher-wins'), null);
});

test('Rangliste Tischtennis: Siege, Niederlagen, Punkteverhältnis, Quote', () => {
  let b = tableTennis();
  const anna = pidOf(b, 'Anna');
  const ben = pidOf(b, 'Ben');
  b = addMatch(b, { sideA: [anna], sideB: [ben], scoreA: 3, scoreB: 1 }, { now: 1 });
  b = addMatch(b, { sideA: [ben], sideB: [anna], scoreA: 3, scoreB: 2 }, { now: 2 });
  b = addMatch(b, { sideA: [anna], sideB: [ben], scoreA: 3, scoreB: 0 }, { now: 3 });

  const [first, second] = computeStandings(b);
  assert.equal(first.name, 'Anna');
  assert.deepEqual(
    [first.rank, first.played, first.wins, first.losses, first.pointsFor, first.pointsAgainst, first.pointDiff],
    [1, 3, 2, 1, 8, 4, 4],
  );
  assert.equal(Math.round(first.winRate * 100), 67);
  assert.deepEqual([second.rank, second.wins, second.losses, second.pointDiff], [2, 1, 2, -4]);
});

test('Rangliste: Unentschieden, Doppel und gleicher Rang bei Gleichstand', () => {
  let b = createScoreboard({ name: 'Doppel', playerNames: ['A', 'B', 'C', 'D'] }, opts());
  const [a, bb, c, d] = b.players.map((p) => p.id);
  b = addMatch(b, { sideA: [a, bb], sideB: [c, d], scoreA: 21, scoreB: 15 });
  b = addMatch(b, { sideA: [a, c], sideB: [bb, d], scoreA: 10, scoreB: 10 });

  const s = computeStandings(b);
  const byName = Object.fromEntries(s.map((r) => [r.name, r]));
  assert.deepEqual([byName.A.wins, byName.A.draws, byName.A.played], [1, 1, 2]);
  assert.deepEqual([byName.D.losses, byName.D.draws], [1, 1]);
  assert.equal(byName.A.rank, 1);
  assert.equal(byName.B.rank, 1, 'A und B sind punktgleich');
  assert.equal(byName.C.rank, 3);
});

test('Rangliste "lower-wins": tiefere Punktzahl gewinnt, tiefere Differenz ist besser', () => {
  let b = createScoreboard({ name: 'Minigolf', scoring: 'lower-wins', playerNames: ['A', 'B', 'C'] }, opts());
  const [a, bb, c] = b.players.map((p) => p.id);
  b = addMatch(b, { sideA: [a], sideB: [bb], scoreA: 30, scoreB: 35 });
  b = addMatch(b, { sideA: [c], sideB: [bb], scoreA: 40, scoreB: 41 });
  const s = computeStandings(b);
  assert.deepEqual(s.map((r) => r.name), ['A', 'C', 'B']);
  assert.equal(s[0].wins, 1);
});

test('removeMatch und sortedMatches', () => {
  let b = tableTennis();
  const [a, c] = b.players.map((p) => p.id);
  b = addMatch(b, { sideA: [a], sideB: [c], scoreA: 1, scoreB: 0, playedAt: 100 }, { now: 1, createId: () => 'm1' });
  b = addMatch(b, { sideA: [a], sideB: [c], scoreA: 0, scoreB: 1, playedAt: 200 }, { now: 2, createId: () => 'm2' });
  assert.deepEqual(sortedMatches(b).map((m) => m.id), ['m2', 'm1']);
  b = removeMatch(b, 'm2');
  assert.deepEqual(b.matches.map((m) => m.id), ['m1']);
  assert.equal(removeMatch(b, 'gibts-nicht'), b);
});

test('Viele Spieler & Matches: Summe Siege = Summe Niederlagen (ohne Unentschieden)', () => {
  const names = Array.from({ length: 30 }, (_, i) => `P${i}`);
  let b = createScoreboard({ name: 'Liga', playerNames: names }, opts());
  const pids = b.players.map((p) => p.id);
  for (let i = 0; i < 500; i++) {
    const x = pids[i % 30];
    const y = pids[(i * 7 + 1) % 30];
    if (x === y) continue;
    b = addMatch(b, { sideA: [x], sideB: [y], scoreA: (i % 5) + 1, scoreB: (i % 3) + 2 });
  }
  const s = computeStandings(b);
  const sum = (k: 'wins' | 'losses' | 'draws' | 'pointDiff') => s.reduce((acc, r) => acc + r[k], 0);
  assert.equal(sum('wins'), sum('losses'));
  assert.equal(Math.round(sum('pointDiff')), 0);
  assert.equal(s.length, 30);
});

test('parseNameList', () => {
  assert.deepEqual(parseNameList('Anna, Ben\nCarla;  ;Dora'), ['Anna', 'Ben', 'Carla', 'Dora']);
});

/* ---------- Repository ---------- */

test('LocalStorageScoreboardRepository: speichern, laden, aktualisieren, löschen', async () => {
  const storage = new MemoryStorage();
  const repo = new LocalStorageScoreboardRepository(storage);
  assert.deepEqual(await repo.list(), []);

  let b = tableTennis();
  await repo.save(b);
  const [a, c] = b.players.map((p) => p.id);
  b = addMatch(b, { sideA: [a], sideB: [c], scoreA: 3, scoreB: 2 }, { now: 2000 });
  await repo.save(b);

  const other = createScoreboard({ name: 'Schach' }, { now: 500, createId: () => 'other' });
  await repo.save(other);

  const list = await repo.list();
  assert.deepEqual(list.map((x) => x.name), ['Tischtennis', 'Schach'], 'nach updatedAt sortiert');
  assert.deepEqual(await repo.get(b.id), b);

  await repo.remove(b.id);
  assert.equal(await repo.get(b.id), null);
  assert.equal((await repo.list()).length, 1);
});

test('Repository: korrupte/manipulierte Daten werden verworfen bzw. bereinigt', async () => {
  const storage = new MemoryStorage();
  storage.setItem(STORAGE_KEY, '{kaputt');
  assert.deepEqual(await new LocalStorageScoreboardRepository(storage).list(), []);

  const good = tableTennis();
  const [a, c] = good.players.map((p) => p.id);
  const withMatch = addMatch(good, { sideA: [a], sideB: [c], scoreA: 1, scoreB: 0 });
  const tampered = {
    ...withMatch,
    name: 'x'.repeat(500),
    matches: [
      ...withMatch.matches,
      { id: 'bad1', playedAt: 1, sides: [{ playerIds: ['unbekannt'], score: 1 }, { playerIds: [c], score: 0 }] },
      { id: 'bad2', playedAt: 1, sides: [{ playerIds: [a], score: -5 }, { playerIds: [c], score: 0 }] },
      { id: 'bad3', playedAt: 'gestern', sides: [] },
    ],
  };
  storage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, boards: [tampered, { foo: 1 }, null] }));
  const [loaded, ...rest] = await new LocalStorageScoreboardRepository(storage).list();
  assert.equal(rest.length, 0);
  assert.equal(loaded.name.length, 60);
  assert.deepEqual(loaded.matches.map((m) => m.id), [withMatch.matches[0].id]);

  assert.equal(sanitizeScoreboard({ schemaVersion: 2 }), null);
  assert.deepEqual(parsePersisted(JSON.stringify({ version: 99, boards: [] })), []);
});

test('Repository: Speicherfehler wird als verständlicher Fehler gemeldet', async () => {
  const failing = {
    getItem: () => null,
    setItem: () => {
      throw new Error('QuotaExceededError');
    },
    removeItem: () => undefined,
  };
  await assert.rejects(new LocalStorageScoreboardRepository(failing).save(tableTennis()), /Speichern im Browser fehlgeschlagen/);
});

/* ---------- Formatierung ---------- */

test('format: Punkte, Datum', () => {
  assert.equal(formatScore(3), '3');
  assert.equal(formatScore(1.5), '1.5');
  assert.equal(formatScore(-2.25), '-2.25');
  assert.equal(parseScore('1,5'), 1.5);
  assert.equal(parseScore('21'), 21);
  assert.ok(Number.isNaN(parseScore('')));
  assert.ok(Number.isNaN(parseScore('-3')));
  assert.ok(Number.isNaN(parseScore('3a')));
  const ts = fromDateInput('2026-10-13');
  assert.ok(ts !== null);
  assert.equal(toDateInput(ts), '2026-10-13');
  assert.equal(fromDateInput('2026-02-30'), null);
  assert.equal(fromDateInput('13.10.2026'), null);
});



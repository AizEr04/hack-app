import { useMemo, useState } from 'react';
import type { Id, Scoreboard } from '../types';
import { LIMITS, activePlayers, addMatch } from '../logic';
import { fromDateInput, parseScore, toDateInput } from '../format';
import type { ApplyChange } from './BoardDetail';

interface Props {
  board: Scoreboard;
  onApply: ApplyChange;
}

export default function MatchForm({ board, onApply }: Props) {
  const active = useMemo(() => activePlayers(board), [board]);
  const activeIds = useMemo(() => new Set(active.map((p) => p.id)), [active]);

  // Komfort: bei zwei Spielern (z.B. Tischtennis 1:1) sind die Seiten vorausgewählt
  const [sideA, setSideA] = useState<Id[]>(() => (active[0] ? [active[0].id] : []));
  const [sideB, setSideB] = useState<Id[]>(() => (active[1] ? [active[1].id] : []));
  const [scoreA, setScoreA] = useState('');
  const [scoreB, setScoreB] = useState('');
  const [date, setDate] = useState(() => toDateInput(Date.now()));
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const a = sideA.filter((id) => activeIds.has(id));
  const b = sideB.filter((id) => activeIds.has(id));

  const toggle = (side: 'A' | 'B', id: Id) => {
    setSuccess(null);
    const mine = side === 'A' ? a : b;
    const setMine = side === 'A' ? setSideA : setSideB;
    const setOther = side === 'A' ? setSideB : setSideA;
    if (mine.includes(id)) {
      setMine(mine.filter((x) => x !== id));
    } else {
      setMine([...mine, id]);
      setOther((prev) => prev.filter((x) => x !== id));
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(null);
    const day = fromDateInput(date);
    if (day === null) {
      setError('Bitte ein gültiges Datum wählen.');
      return;
    }
    const playedAt = date === toDateInput(Date.now()) ? Date.now() : day;
    const err = onApply((current) =>
      addMatch(current, {
        sideA: a,
        sideB: b,
        scoreA: parseScore(scoreA),
        scoreB: parseScore(scoreB),
        playedAt,
        note,
      }),
    );
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setScoreA('');
    setScoreB('');
    setNote('');
    setSuccess('Match gespeichert.');
  };

  if (active.length < 2) {
    return (
      <div className="card text-white/70">
        Für ein Match braucht es mindestens 2 Spieler. Füge sie unter „Spieler“ hinzu.
      </div>
    );
  }

  const sideBlock = (
    label: string,
    side: 'A' | 'B',
    selected: Id[],
    score: string,
    setScore: (v: string) => void,
  ) => (
    <fieldset className="space-y-2 min-w-0">
      <legend className="label">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {active.map((p) => {
          const on = selected.includes(p.id);
          return (
            <button
              type="button"
              key={p.id}
              aria-pressed={on}
              onClick={() => toggle(side, p.id)}
              className={`chip text-sm transition ${
                on ? 'bg-sky-500 text-white' : 'bg-white/10 text-white/80 hover:bg-white/20'
              }`}
            >
              {p.name}
            </button>
          );
        })}
      </div>
      <input
        className="input text-2xl font-bold text-center"
        inputMode="decimal"
        placeholder="Punkte"
        aria-label={`Punkte ${label}`}
        value={score}
        onChange={(e) => {
          setScore(e.target.value);
          setSuccess(null);
        }}
      />
    </fieldset>
  );

  return (
    <form onSubmit={submit} className="card space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {sideBlock('Seite A', 'A', a, scoreA, setScoreA)}
        {sideBlock('Seite B', 'B', b, scoreB, setScoreB)}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="label">Datum</span>
          <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className="block">
          <span className="label">Notiz (optional)</span>
          <input
            className="input"
            maxLength={LIMITS.note}
            value={note}
            placeholder="z.B. Best of 5"
            onChange={(e) => setNote(e.target.value)}
          />
        </label>
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-300">
          {error}
        </p>
      )}
      {success && (
        <p role="status" className="text-sm text-emerald-300">
          {success}
        </p>
      )}
      <button type="submit" className="btn w-full bg-sky-500 text-white hover:bg-sky-400">
        Match speichern
      </button>
      <p className="text-xs text-white/50">
        Punkte z.B. Sätze (3:1), Punkte (21:17) oder Tore. Gleiche Punktzahl = Unentschieden.
      </p>
    </form>
  );
}


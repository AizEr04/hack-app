import { useState } from 'react';
import type { Scoreboard, ScoreboardPlayer } from '../types';
import { LIMITS, addPlayer, playerHasMatches, removePlayer } from '../logic';
import type { ApplyChange } from './BoardDetail';

export default function PlayerManager({ board, onApply }: { board: Scoreboard; onApply: ApplyChange }) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const active = board.players.filter((p) => p.active);
  const inactive = board.players.filter((p) => !p.active);

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    const err = onApply((b) => addPlayer(b, name));
    if (err) {
      setError(err);
    } else {
      setName('');
      setError(null);
    }
  };

  const remove = (p: ScoreboardPlayer) => {
    const msg = playerHasMatches(board, p.id)
      ? `${p.name} entfernen? Bisherige Matches bleiben im Verlauf und in der Statistik der Gegner erhalten.`
      : `${p.name} entfernen?`;
    if (window.confirm(msg)) onApply((b) => removePlayer(b, p.id));
  };

  const restore = (p: ScoreboardPlayer) => {
    const err = onApply((b) => addPlayer(b, p.name));
    setError(err);
  };

  return (
    <div className="space-y-4">
      <form onSubmit={add} className="card flex gap-2">
        <input
          className="input"
          value={name}
          maxLength={LIMITS.playerName}
          placeholder="Name des Spielers"
          aria-label="Name des Spielers"
          onChange={(e) => setName(e.target.value)}
        />
        <button type="submit" className="btn bg-sky-500 text-white hover:bg-sky-400 shrink-0">
          Hinzufügen
        </button>
      </form>
      {error && (
        <p role="alert" className="text-sm text-red-300">
          {error}
        </p>
      )}

      <div className="card space-y-2">
        <h3 className="font-semibold text-white/80">Spieler ({active.length})</h3>
        {active.length === 0 && <p className="text-sm text-white/60">Noch keine Spieler.</p>}
        <ul className="divide-y divide-white/10">
          {active.map((p) => (
            <li key={p.id} className="flex items-center justify-between py-2">
              <span>{p.name}</span>
              <button type="button" className="btn-secondary px-3 py-1 text-xs" onClick={() => remove(p)}>
                Entfernen
              </button>
            </li>
          ))}
        </ul>
      </div>

      {inactive.length > 0 && (
        <div className="card space-y-2">
          <h3 className="font-semibold text-white/60">Entfernte Spieler</h3>
          <p className="text-xs text-white/50">Ihre Matches bleiben erhalten. Beim Wiederaufnehmen zählt die alte Statistik weiter.</p>
          <ul className="divide-y divide-white/10">
            {inactive.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-2 text-white/70">
                <span>{p.name}</span>
                <button type="button" className="btn-secondary px-3 py-1 text-xs" onClick={() => restore(p)}>
                  Wieder aufnehmen
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}


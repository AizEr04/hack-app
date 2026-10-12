import { useMemo, useState } from 'react';
import type { Id, Scoreboard } from '../types';
import { matchWinner, removeMatch, sortedMatches } from '../logic';
import { formatDate, formatScore } from '../format';
import type { ApplyChange } from './BoardDetail';

const PAGE = 30;

export default function MatchHistory({ board, onApply }: { board: Scoreboard; onApply: ApplyChange }) {
  const [limit, setLimit] = useState(PAGE);
  const names = useMemo(() => new Map(board.players.map((p) => [p.id, p.name])), [board.players]);
  const matches = useMemo(() => sortedMatches(board), [board]);

  if (matches.length === 0) {
    return <div className="card text-center text-white/70">Noch keine Matches.</div>;
  }

  const label = (ids: Id[]) => ids.map((id) => names.get(id) ?? 'Unbekannt').join(' & ');

  const del = (id: Id) => {
    if (window.confirm('Dieses Match löschen? Die Rangliste wird neu berechnet.')) {
      onApply((b) => removeMatch(b, id));
    }
  };

  return (
    <div className="space-y-2">
      <ul className="space-y-2">
        {matches.slice(0, limit).map((m) => {
          const w = matchWinner(m, board.scoring);
          return (
            <li key={m.id} className="card p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-xs text-white/50 truncate">
                  {formatDate(m.playedAt)}
                  {m.note ? ` · ${m.note}` : ''}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={w === 0 ? 'font-bold text-emerald-300' : 'text-white/80'}>
                    {label(m.sides[0].playerIds)}
                  </span>
                  <span className="font-mono tabular-nums font-bold">
                    {formatScore(m.sides[0].score)} : {formatScore(m.sides[1].score)}
                  </span>
                  <span className={w === 1 ? 'font-bold text-emerald-300' : 'text-white/80'}>
                    {label(m.sides[1].playerIds)}
                  </span>
                  {w === null && <span className="chip bg-white/10 text-white/70">Unentschieden</span>}
                </div>
              </div>
              <button
                type="button"
                onClick={() => del(m.id)}
                className="btn-secondary px-2 py-1 text-xs"
                aria-label="Match löschen"
                title="Match löschen"
              >
                🗑
              </button>
            </li>
          );
        })}
      </ul>
      {matches.length > limit && (
        <button type="button" className="btn-secondary w-full" onClick={() => setLimit((l) => l + PAGE)}>
          Mehr anzeigen ({matches.length - limit})
        </button>
      )}
    </div>
  );
}


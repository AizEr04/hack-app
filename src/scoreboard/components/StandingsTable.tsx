import { useMemo, useState } from 'react';
import type { Scoreboard } from '../types';
import { computeStandings } from '../logic';
import { formatPercent, formatScore } from '../format';

export default function StandingsTable({ board }: { board: Scoreboard }) {
  const [showInactive, setShowInactive] = useState(false);
  const hasInactive = board.players.some((p) => !p.active);
  const rows = useMemo(
    () => computeStandings(board, { includeInactive: showInactive }),
    [board, showInactive],
  );

  if (board.matches.length === 0) {
    return (
      <div className="card text-center text-white/70">
        Noch keine Matches erfasst. Trage unter „Match erfassen“ das erste Resultat ein.
      </div>
    );
  }

  return (
    <div className="card p-0 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-white/70">
            <tr>
              <th className="px-3 py-2 text-left">#</th>
              <th className="px-3 py-2 text-left">Spieler</th>
              <th className="px-2 py-2 text-right" title="Gespielt">Sp</th>
              <th className="px-2 py-2 text-right" title="Siege">S</th>
              <th className="px-2 py-2 text-right" title="Unentschieden">U</th>
              <th className="px-2 py-2 text-right" title="Niederlagen">N</th>
              <th className="px-2 py-2 text-right" title="Punkte erzielt : erhalten">Punkte</th>
              <th className="px-2 py-2 text-right" title="Punktedifferenz">Diff</th>
              <th className="px-3 py-2 text-right" title="Siegquote">Quote</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.playerId} className={`border-t border-white/10 ${r.active ? '' : 'opacity-60'}`}>
                <td className="px-3 py-2 font-semibold">{r.rank === 1 && r.wins > 0 ? '🏆' : r.rank}</td>
                <td className="px-3 py-2 font-medium">
                  {r.name}
                  {!r.active && <span className="ml-1 text-xs text-white/50">(entfernt)</span>}
                </td>
                <td className="px-2 py-2 text-right tabular-nums">{r.played}</td>
                <td className="px-2 py-2 text-right tabular-nums text-emerald-300 font-semibold">{r.wins}</td>
                <td className="px-2 py-2 text-right tabular-nums">{r.draws}</td>
                <td className="px-2 py-2 text-right tabular-nums text-red-300">{r.losses}</td>
                <td className="px-2 py-2 text-right tabular-nums whitespace-nowrap">
                  {formatScore(r.pointsFor)}:{formatScore(r.pointsAgainst)}
                </td>
                <td className="px-2 py-2 text-right tabular-nums">
                  {r.pointDiff > 0 ? '+' : ''}
                  {formatScore(r.pointDiff)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{formatPercent(r.winRate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-xs text-white/50 border-t border-white/10">
        <span>
          Sortierung: Siege, Siegquote, Punktedifferenz
          {board.scoring === 'lower-wins' ? ' (tiefer ist besser)' : ''}
        </span>
        {hasInactive && (
          <label className="flex items-center gap-1 cursor-pointer">
            <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
            Entfernte anzeigen
          </label>
        )}
      </div>
    </div>
  );
}


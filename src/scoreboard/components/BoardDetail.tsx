import { useCallback, useState } from 'react';
import type { Scoreboard } from '../types';
import { ScoreboardError, activePlayers } from '../logic';
import { SCORING_LABEL } from '../format';
import StandingsTable from './StandingsTable';
import MatchForm from './MatchForm';
import MatchHistory from './MatchHistory';
import PlayerManager from './PlayerManager';
import BoardSettings from './BoardSettings';

/** Wendet eine Änderung an; gibt eine Fehlermeldung zurück oder null bei Erfolg. */
export type ApplyChange = (change: (board: Scoreboard) => Scoreboard) => string | null;

type Tab = 'ranking' | 'match' | 'history' | 'players' | 'settings';

const TABS: { id: Tab; label: string }[] = [
  { id: 'ranking', label: 'Rangliste' },
  { id: 'match', label: 'Match erfassen' },
  { id: 'history', label: 'Verlauf' },
  { id: 'players', label: 'Spieler' },
  { id: 'settings', label: '⚙' },
];

interface Props {
  board: Scoreboard;
  onBack: () => void;
  onUpdate: (change: (board: Scoreboard) => Scoreboard) => void;
  onDelete: () => void;
}

export default function BoardDetail({ board, onBack, onUpdate, onDelete }: Props) {
  const [tab, setTab] = useState<Tab>(() => (activePlayers(board).length < 2 ? 'players' : 'ranking'));

  const apply = useCallback<ApplyChange>(
    (change) => {
      try {
        onUpdate(change);
        return null;
      } catch (e) {
        return e instanceof ScoreboardError ? e.message : 'Unerwarteter Fehler.';
      }
    },
    [onUpdate],
  );

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <button type="button" onClick={onBack} className="text-sky-300 text-sm font-medium">
          ← Scoreboards
        </button>
        <h1 className="font-display text-3xl text-sky-300 break-words">{board.name}</h1>
        <p className="text-sm text-white/60">
          {board.discipline ? `${board.discipline} · ` : ''}
          {SCORING_LABEL[board.scoring]}
        </p>
      </header>

      <nav className="flex gap-1 overflow-x-auto rounded-xl bg-black/30 p-1" aria-label="Bereiche">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            aria-current={tab === t.id ? 'page' : undefined}
            className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition ${
              tab === t.id ? 'bg-sky-500 text-white' : 'text-white/70 hover:bg-white/10'
            }`}
            title={t.id === 'settings' ? 'Einstellungen' : undefined}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === 'ranking' && <StandingsTable board={board} />}
      {tab === 'match' && <MatchForm board={board} onApply={apply} />}
      {tab === 'history' && <MatchHistory board={board} onApply={apply} />}
      {tab === 'players' && <PlayerManager board={board} onApply={apply} />}
      {tab === 'settings' && <BoardSettings board={board} onApply={apply} onDelete={onDelete} />}
    </div>
  );
}


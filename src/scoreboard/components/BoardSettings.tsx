import { useState } from 'react';
import type { Scoreboard, ScoringMode } from '../types';
import { LIMITS, updateScoreboardDetails } from '../logic';
import { SCORING_LABEL } from '../format';
import type { ApplyChange } from './BoardDetail';

interface Props {
  board: Scoreboard;
  onApply: ApplyChange;
  onDelete: () => void;
}

export default function BoardSettings({ board, onApply, onDelete }: Props) {
  const [name, setName] = useState(board.name);
  const [discipline, setDiscipline] = useState(board.discipline ?? '');
  const [scoring, setScoring] = useState<ScoringMode>(board.scoring);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const err = onApply((b) => updateScoreboardDetails(b, { name, discipline, scoring }));
    setError(err);
    setSaved(!err);
  };

  const del = () => {
    const msg = `Scoreboard „${board.name}“ mit ${board.matches.length} Matches endgültig löschen?`;
    if (window.confirm(msg)) onDelete();
  };

  return (
    <div className="space-y-4">
      <form onSubmit={save} className="card space-y-3">
        <label className="block">
          <span className="label">Name</span>
          <input className="input" value={name} maxLength={LIMITS.boardName} onChange={(e) => { setName(e.target.value); setSaved(false); }} />
        </label>
        <label className="block">
          <span className="label">Sportart / Spiel</span>
          <input className="input" value={discipline} maxLength={LIMITS.discipline} onChange={(e) => { setDiscipline(e.target.value); setSaved(false); }} />
        </label>
        <label className="block">
          <span className="label">Wertung</span>
          <select className="input" value={scoring} onChange={(e) => { setScoring(e.target.value as ScoringMode); setSaved(false); }}>
            {(Object.keys(SCORING_LABEL) as ScoringMode[]).map((m) => (
              <option key={m} value={m}>
                {SCORING_LABEL[m]}
              </option>
            ))}
          </select>
        </label>
        {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
        {saved && <p role="status" className="text-sm text-emerald-300">Gespeichert.</p>}
        <button type="submit" className="btn w-full bg-sky-500 text-white hover:bg-sky-400">
          Speichern
        </button>
      </form>

      <div className="card space-y-2 border-red-500/30">
        <h3 className="font-semibold text-red-300">Scoreboard löschen</h3>
        <p className="text-sm text-white/60">Löscht das Scoreboard inklusive aller Spieler und Matches. Nicht rückgängig zu machen.</p>
        <button type="button" className="btn-danger w-full" onClick={del}>
          Endgültig löschen
        </button>
      </div>
    </div>
  );
}


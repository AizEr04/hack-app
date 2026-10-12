import { useMemo, useState } from 'react';
import type { Scoreboard, ScoringMode } from '../types';
import { LIMITS, ScoreboardError, activePlayers, computeStandings, parseNameList } from '../logic';
import type { NewScoreboardInput } from '../logic';
import { SCORING_LABEL } from '../format';

interface Props {
  boards: Scoreboard[];
  loading: boolean;
  onBack: () => void;
  onOpen: (id: string) => void;
  onCreate: (input: NewScoreboardInput) => void;
}

export default function BoardList({ boards, loading, onBack, onOpen, onCreate }: Props) {
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState('');
  const [discipline, setDiscipline] = useState('');
  const [scoring, setScoring] = useState<ScoringMode>('higher-wins');
  const [players, setPlayers] = useState('');
  const [error, setError] = useState<string | null>(null);

  const sorted = useMemo(() => [...boards].sort((a, b) => b.updatedAt - a.updatedAt), [boards]);
  const showForm = formOpen || (!loading && boards.length === 0);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      onCreate({ name, discipline, scoring, playerNames: parseNameList(players) });
    } catch (err) {
      setError(err instanceof ScoreboardError ? err.message : 'Unerwarteter Fehler.');
    }
  };

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <button type="button" onClick={onBack} className="text-sky-300 text-sm font-medium">
          ← Menü
        </button>
        <h1 className="font-display text-4xl text-sky-300 drop-shadow">Scoreboard</h1>
        <p className="text-white/70">Siege, Niederlagen und Punkte für jede Sportart und jedes Spiel.</p>
      </header>

      {loading && <div className="card text-white/70">Lädt …</div>}

      {!loading && sorted.length > 0 && (
        <ul className="space-y-3">
          {sorted.map((b) => {
            const leader = computeStandings(b)[0];
            return (
              <li key={b.id}>
                <button
                  type="button"
                  onClick={() => onOpen(b.id)}
                  className="card w-full text-left hover:border-sky-400/50 transition active:scale-[0.99]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-lg truncate">{b.name}</div>
                      <div className="text-sm text-white/60">
                        {b.discipline ? `${b.discipline} · ` : ''}
                        {activePlayers(b).length} Spieler · {b.matches.length} Matches
                      </div>
                    </div>
                    {leader && leader.wins > 0 && (
                      <span className="chip bg-sky-500/20 text-sky-200 shrink-0">🏆 {leader.name}</span>
                    )}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {!loading && !showForm && (
        <button type="button" className="btn w-full bg-sky-500 text-white hover:bg-sky-400" onClick={() => setFormOpen(true)}>
          ＋ Neues Scoreboard
        </button>
      )}

      {showForm && (
        <form onSubmit={submit} className="card space-y-3">
          <h2 className="font-semibold text-lg">Neues Scoreboard</h2>
          <label className="block">
            <span className="label">Name *</span>
            <input className="input" value={name} maxLength={LIMITS.boardName} placeholder="z.B. Tischtennis Büro" onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="block">
            <span className="label">Sportart / Spiel</span>
            <input className="input" value={discipline} maxLength={LIMITS.discipline} placeholder="z.B. Tischtennis" onChange={(e) => setDiscipline(e.target.value)} />
          </label>
          <label className="block">
            <span className="label">Wertung</span>
            <select className="input" value={scoring} onChange={(e) => setScoring(e.target.value as ScoringMode)}>
              {(Object.keys(SCORING_LABEL) as ScoringMode[]).map((m) => (
                <option key={m} value={m}>
                  {SCORING_LABEL[m]}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="label">Spieler (optional)</span>
            <textarea className="input min-h-[80px]" value={players} placeholder={'Ein Name pro Zeile oder mit Komma getrennt'} onChange={(e) => setPlayers(e.target.value)} />
          </label>
          {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
          <div className="flex gap-2">
            {boards.length > 0 && (
              <button type="button" className="btn-secondary flex-1" onClick={() => { setFormOpen(false); setError(null); }}>
                Abbrechen
              </button>
            )}
            <button type="submit" className="btn flex-1 bg-sky-500 text-white hover:bg-sky-400">
              Erstellen
            </button>
          </div>
        </form>
      )}

      <p className="text-center text-xs text-white/40">Daten werden nur lokal in deinem Browser gespeichert.</p>
    </div>
  );
}


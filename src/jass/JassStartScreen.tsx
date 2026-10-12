import { useState } from 'react';
import { MAX_ROUNDS, MIN_ROUNDS } from './coiffeur-types';
import './jass-start.css';

export interface JassStartConfig {
  teamNames: [string, string];
  /** nur bei Coiffeur: Anzahl Runden/Trümpfe (9–12) */
  rounds: number;
}

interface Props {
  title: string;
  /** Anzahl-Runden-Auswahl anzeigen (Coiffeur) */
  askRounds?: boolean;
  initialNames?: [string, string];
  onStart: (config: JassStartConfig) => void;
  onBack: () => void;
}

const MAX_NAME = 20;

const clean = (raw: string, fallback: string): string => {
  const t = raw.trim().slice(0, MAX_NAME);
  return t.length > 0 ? t : fallback;
};

export function JassStartScreen({ title, askRounds = false, initialNames, onStart, onBack }: Props) {
  const [name0, setName0] = useState(initialNames?.[0] ?? '');
  const [name1, setName1] = useState(initialNames?.[1] ?? '');
  const [rounds, setRounds] = useState(MAX_ROUNDS - 3);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onStart({
      teamNames: [clean(name0, 'Team 1'), clean(name1, 'Team 2')],
      rounds,
    });
  };

  return (
    <div className="jass-start">
      <form className="jass-start-card" onSubmit={submit}>
        <button type="button" className="jass-start-back" onClick={onBack}>
          ← Zurück
        </button>
        <h1 className="jass-start-title">{title}</h1>

        <label className="jass-start-label">
          Team 1
          <input
            className="jass-start-input"
            value={name0}
            maxLength={MAX_NAME}
            placeholder="Team 1"
            onChange={(e) => setName0(e.target.value)}
          />
        </label>
        <label className="jass-start-label">
          Team 2
          <input
            className="jass-start-input"
            value={name1}
            maxLength={MAX_NAME}
            placeholder="Team 2"
            onChange={(e) => setName1(e.target.value)}
          />
        </label>

        {askRounds && (
          <div className="jass-start-label">
            Anzahl Trümpfe
            <div className="jass-start-rounds">
              {Array.from({ length: MAX_ROUNDS - MIN_ROUNDS + 1 }, (_, i) => MIN_ROUNDS + i).map((n) => (
                <button
                  type="button"
                  key={n}
                  className={`jass-start-round ${rounds === n ? 'jass-start-round-active' : ''}`}
                  onClick={() => setRounds(n)}
                >
                  {n}x
                </button>
              ))}
            </div>
          </div>
        )}

        <button type="submit" className="jass-start-go">
          Spiel starten
        </button>
      </form>
    </div>
  );
}



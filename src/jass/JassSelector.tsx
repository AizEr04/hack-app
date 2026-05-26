import { useState } from 'react';
import SchieberTafel from './SchieberTafel';
import CoiffeurTafel from './CoiffeurTafel';

type JassMode = 'selector' | 'schieber' | 'coiffeur';

const STORAGE_KEY = 'jass:last-mode';

function getInitialMode(): JassMode {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'schieber' || saved === 'coiffeur') return saved;
  } catch {
    /* ignore */
  }
  return 'selector';
}

function saveMode(mode: JassMode): void {
  try {
    if (mode === 'selector') localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
}

export default function JassSelector({ onBack }: { onBack: () => void }) {
  const [mode, setMode] = useState<JassMode>(getInitialMode);

  const navigate = (m: JassMode) => {
    setMode(m);
    saveMode(m);
  };

  if (mode === 'schieber') {
    return <SchieberTafel onBack={() => navigate('selector')} />;
  }
  if (mode === 'coiffeur') {
    return <CoiffeurTafel onBack={() => navigate('selector')} />;
  }

  return (
    <div className="mx-auto max-w-xl p-4 sm:p-8 min-h-screen flex flex-col items-center justify-center space-y-8">
      <header className="text-center space-y-2">
        <div className="flex items-center justify-between w-full max-w-md">
          <button onClick={onBack} className="text-red-500 text-sm font-medium">← Zurück</button>
          <div />
        </div>
        <h1 className="font-display text-4xl sm:text-5xl text-red-500 drop-shadow">Jasstafel</h1>
        <p className="text-white/70">Welche Variante?</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-md">
        <button
          onClick={() => navigate('schieber')}
          className="card hover:border-red-500/50 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer text-center space-y-3 p-8"
        >
          <div className="text-4xl">📋</div>
          <div className="font-display text-xl text-red-500">Schieber</div>
          <p className="text-sm text-white/60">Klassische Z-Tafel</p>
        </button>

        <button
          onClick={() => navigate('coiffeur')}
          className="card hover:border-red-500/50 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer text-center space-y-3 p-8"
        >
          <div className="text-4xl">💇</div>
          <div className="font-display text-xl text-red-500">Coiffeur</div>
          <p className="text-sm text-white/60">8 Trumpfarten mit Multiplikator</p>
        </button>
      </div>
    </div>
  );
}

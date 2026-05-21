interface AppSelectorProps {
  onSelect: (app: 'hack' | 'jass') => void;
}

export default function AppSelector({ onSelect }: AppSelectorProps) {
  return (
    <div className="mx-auto max-w-xl p-4 sm:p-8 min-h-screen flex flex-col items-center justify-center space-y-8">
      <header className="text-center space-y-2">
        <h1 className="font-display text-4xl sm:text-5xl text-gold drop-shadow">Spielabend</h1>
        <p className="text-white/70">Was möchtest du spielen?</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-md">
        <button
          onClick={() => onSelect('hack')}
          className="card hover:border-gold/50 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer text-center space-y-3 p-8"
        >
          <div className="text-4xl">🃏</div>
          <div className="font-display text-xl text-gold">Hack</div>
          <p className="text-sm text-white/60">Spielstand-Tracker</p>
        </button>

        <button
          onClick={() => onSelect('jass')}
          className="card hover:border-red-500/50 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer text-center space-y-3 p-8"
        >
          <div className="text-4xl">📋</div>
          <div className="font-display text-xl text-red-500">Jasstafel</div>
          <p className="text-sm text-white/60">Schieber-Tafel</p>
        </button>
      </div>

      <p className="text-center text-xs text-white/40">
        Daten werden nur lokal in deinem Browser gespeichert.
      </p>
    </div>
  );
}

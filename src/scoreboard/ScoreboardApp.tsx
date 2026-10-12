import { useMemo, useState } from 'react';
import { LocalStorageScoreboardRepository } from './repository';
import type { ScoreboardRepository } from './repository';
import { useScoreboards } from './useScoreboards';
import BoardList from './components/BoardList';
import BoardDetail from './components/BoardDetail';

interface Props {
  onBack: () => void;
  /** Austauschbare Persistenz (Default: Browser-Speicher). Hier später die DB-Implementierung übergeben. */
  repository?: ScoreboardRepository;
}

export default function ScoreboardApp({ onBack, repository }: Props) {
  const repo = useMemo(() => repository ?? new LocalStorageScoreboardRepository(), [repository]);
  const { boards, loading, error, clearError, create, update, remove } = useScoreboards(repo);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = boards.find((b) => b.id === selectedId) ?? null;

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-8 min-h-screen space-y-4">
      {error && (
        <div role="alert" className="card border-red-500/50 text-red-200 flex items-center justify-between gap-3">
          <span>{error}</span>
          <button type="button" onClick={clearError} aria-label="Meldung schliessen">
            ✕
          </button>
        </div>
      )}
      {selected ? (
        <BoardDetail
          key={selected.id}
          board={selected}
          onBack={() => setSelectedId(null)}
          onUpdate={(change) => update(selected.id, change)}
          onDelete={() => {
            remove(selected.id);
            setSelectedId(null);
          }}
        />
      ) : (
        <BoardList
          boards={boards}
          loading={loading}
          onBack={onBack}
          onOpen={setSelectedId}
          onCreate={(input) => setSelectedId(create(input).id)}
        />
      )}
    </div>
  );
}


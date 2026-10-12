import { useCallback, useEffect, useRef, useState } from 'react';
import type { Scoreboard } from './types';
import type { ScoreboardRepository } from './repository';
import { createScoreboard } from './logic';
import type { NewScoreboardInput } from './logic';

const message = (e: unknown): string => (e instanceof Error ? e.message : 'Unbekannter Fehler.');

/**
 * State-Management für Scoreboards über ein (asynchrones) Repository.
 * Änderungen werden optimistisch angezeigt und im Hintergrund gespeichert.
 */
export function useScoreboards(repo: ScoreboardRepository) {
  const [boards, setBoardsState] = useState<Scoreboard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<Scoreboard[]>([]);

  const setBoards = useCallback((next: Scoreboard[]) => {
    ref.current = next;
    setBoardsState(next);
  }, []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    repo
      .list()
      .then((list) => {
        if (alive) setBoards(list);
      })
      .catch((e: unknown) => {
        if (alive) setError(message(e));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [repo, setBoards]);

  const persist = useCallback(
    (next: Scoreboard) => {
      const exists = ref.current.some((b) => b.id === next.id);
      setBoards(exists ? ref.current.map((b) => (b.id === next.id ? next : b)) : [next, ...ref.current]);
      repo.save(next).catch((e: unknown) => setError(message(e)));
    },
    [repo, setBoards],
  );

  /** Wirft ScoreboardError bei ungültiger Eingabe. */
  const create = useCallback(
    (input: NewScoreboardInput): Scoreboard => {
      const board = createScoreboard(input);
      persist(board);
      return board;
    },
    [persist],
  );

  /** Wendet eine reine Änderungsfunktion an. Wirft ScoreboardError bei ungültiger Eingabe. */
  const update = useCallback(
    (id: string, change: (board: Scoreboard) => Scoreboard): void => {
      const current = ref.current.find((b) => b.id === id);
      if (!current) return;
      const next = change(current);
      if (next !== current) persist(next);
    },
    [persist],
  );

  const remove = useCallback(
    (id: string): void => {
      setBoards(ref.current.filter((b) => b.id !== id));
      repo.remove(id).catch((e: unknown) => setError(message(e)));
    },
    [repo, setBoards],
  );

  const clearError = useCallback(() => setError(null), []);

  return { boards, loading, error, clearError, create, update, remove };
}


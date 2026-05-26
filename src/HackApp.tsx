import { useEffect, useMemo, useState } from 'react';
import type { GameState, Player, PlayerId, RoundRecord } from './types';
import {
  applyRound,
  computeBalances,
  computeNetFlows,
  createInitialState,
  formatCHF,
  isGrundpot,
  payGrundpot,
  addPendingPlayer,
  removePendingPlayer,
  addPlayerImmediate,
  removePlayerImmediate,
  cancelPendingAddition,
  cancelPendingRemoval,
  sumPot,
  validateRoundInput,
} from './game';
import { loadState, saveState } from './storage';

const uid = (): string =>
  (crypto?.randomUUID?.() ??
    Math.random().toString(36).slice(2) + Date.now().toString(36));

export default function HackApp({ onBack }: { onBack: () => void }) {
  const [state, setState] = useState<GameState | null>(() => loadState());

  useEffect(() => {
    saveState(state);
  }, [state]);

  if (!state) {
    return <Setup onStart={(s) => setState(s)} onBack={onBack} />;
  }
  return (
    <GameView
      state={state}
      onChange={setState}
      onReset={() => {
        if (confirm('Neues Spiel starten? Aktueller Spielstand wird gelöscht.')) setState(null);
      }}
      onBack={onBack}
    />
  );
}

/* ---------------- Setup ---------------- */

function Setup({ onStart, onBack }: { onStart: (s: GameState) => void; onBack: () => void }) {
  const [names, setNames] = useState<string[]>(['', '']);
  const [baseBet, setBaseBet] = useState<string>('1.00');

  const addPlayer = () => names.length < 7 && setNames([...names, '']);
  const removePlayer = (i: number) =>
    names.length > 2 && setNames(names.filter((_, idx) => idx !== i));

  const trimmed = names.map((n) => n.trim());
  const validNames =
    trimmed.every((n) => n.length > 0 && n.length <= 20) &&
    new Set(trimmed.map((n) => n.toLowerCase())).size === trimmed.length;

  const bet = Number(baseBet.replace(',', '.'));
  const validBet = Number.isFinite(bet) && bet >= 0.2 && bet <= 5;

  const canStart = validNames && validBet;

  const start = () => {
    if (!canStart) return;
    const players: Player[] = trimmed.map((name) => ({ id: uid(), name }));
    onStart(createInitialState(players, { baseBet: Math.round(bet * 100) / 100 }));
  };

  return (
    <div className="mx-auto max-w-xl p-4 sm:p-8 space-y-6">
      <header className="text-center space-y-2">
        <div className="flex items-center justify-between">
          <button onClick={onBack} className="btn-secondary text-sm">← Zurück</button>
          <div />
        </div>
        <h1 className="font-display text-4xl sm:text-5xl text-gold drop-shadow">Hack</h1>
        <p className="text-white/70">Spielstand-Tracker</p>
      </header>

      <section className="card space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="label mb-0">Spieler ({names.length}/7)</label>
            <button
              type="button"
              onClick={addPlayer}
              disabled={names.length >= 7}
              className="btn-secondary text-sm"
            >
              + Spieler
            </button>
          </div>
          <div className="space-y-2">
            {names.map((n, i) => (
              <div key={i} className="flex gap-2">
                <input
                  className="input"
                  placeholder={`Spieler ${i + 1}`}
                  value={n}
                  maxLength={20}
                  onChange={(e) =>
                    setNames(names.map((x, idx) => (idx === i ? e.target.value : x)))
                  }
                />
                <button
                  type="button"
                  onClick={() => removePlayer(i)}
                  disabled={names.length <= 2}
                  className="btn-danger px-3"
                  aria-label="Entfernen"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          {!validNames && (
            <p className="mt-2 text-sm text-red-300">
              Bitte eindeutige Namen (1–20 Zeichen) eingeben.
            </p>
          )}
        </div>

        <div>
          <label className="label">Grundeinsatz (CHF, 0.20 – 5.00)</label>
          <input
            className="input"
            type="number"
            step="0.10"
            min="0.20"
            max="5"
            value={baseBet}
            onChange={(e) => setBaseBet(e.target.value)}
          />
          {!validBet && (
            <p className="mt-2 text-sm text-red-300">Grundeinsatz muss zwischen 0.20 und 5 CHF sein.</p>
          )}
        </div>

        <button onClick={start} disabled={!canStart} className="btn-primary w-full text-lg">
          Spiel starten
        </button>
      </section>

      <p className="text-center text-xs text-white/40">
        Spielgeld – kein Glücksspiel. Daten werden nur lokal in deinem Browser gespeichert.
      </p>
    </div>
  );
}

/* ---------------- GameView ---------------- */

function GameView({
  state,
  onChange,
  onReset,
  onBack,
}: {
  state: GameState;
  onChange: (s: GameState) => void;
  onReset: () => void;
  onBack: () => void;
}) {
  const [showRound, setShowRound] = useState(false);
  const [showGrundpot, setShowGrundpot] = useState(false);
  const [showPlayerMgmt, setShowPlayerMgmt] = useState(false);
  const balances = useMemo(() => computeBalances(state), [state]);
  const netFlows = useMemo(() => computeNetFlows(state), [state]);
  const potTotal = sumPot(state.pot);
  const playerById = useMemo(
    () => Object.fromEntries([
      ...state.players.map((p) => [p.id, p]),
      ...(state.removedPlayers ?? []).map((p) => [p.id, p]),
    ]),
    [state.players, state.removedPlayers],
  );

  const pendingAdditions = state.pendingAdditions ?? [];
  const pendingRemovals = state.pendingRemovals ?? [];
  const removedPlayerIds = new Set((state.removedPlayers ?? []).map((p) => p.id));
  const allPlayersForDisplay = [...state.players, ...(state.removedPlayers ?? [])];

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6 space-y-5">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-gold">Hack</h1>
          <p className="text-xs text-white/60">
            Grundeinsatz: {formatCHF(state.config.baseBet)} · {state.players.length} Spieler · Runde {state.rounds.length + 1}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={onBack} className="btn-secondary text-sm">← Menü</button>
          <button onClick={onReset} className="btn-secondary text-sm">Neues Spiel</button>
        </div>
      </header>

      {/* Pot */}
      <section className="card border-gold/30">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="font-display text-xl text-gold-light">Aktueller Pot</h2>
          <div className="text-3xl font-bold tabular-nums">{formatCHF(potTotal)}</div>
        </div>
        <div className="space-y-1">
          {Object.entries(state.pot).filter(([, a]) => a > 0).length === 0 ? (
            <p className="text-sm text-white/50">Pot ist leer.</p>
          ) : (
            Object.entries(state.pot)
              .filter(([, a]) => a > 0)
              .sort((a, b) => b[1] - a[1])
              .map(([pid, amt]) => (
                <div key={pid} className="flex justify-between text-sm">
                  <span>{playerById[pid]?.name ?? '?'}</span>
                  <span className="tabular-nums text-white/80">{formatCHF(amt)}</span>
                </div>
              ))
          )}
        </div>
      </section>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button onClick={() => setShowGrundpot(true)} className="btn-secondary flex-1 text-sm">
          💰 Grundpot zahlen
        </button>
        <button onClick={() => setShowPlayerMgmt(true)} className="btn-secondary flex-1 text-sm">
          👥 Spieler verwalten
        </button>
      </div>

      {/* Pending changes info */}
      {(pendingAdditions.length > 0 || pendingRemovals.length > 0) && (
        <section className="card border-amber-500/30 bg-amber-900/10">
          <h3 className="text-sm font-semibold text-amber-300 mb-2">Ausstehende Änderungen (ab nächstem Grundpot)</h3>
          {pendingAdditions.length > 0 && (
            <div className="text-sm text-white/70 mb-1">
              <span className="text-emerald-300">+ Neu:</span>{' '}
              {pendingAdditions.map((p) => p.name).join(', ')}
            </div>
          )}
          {pendingRemovals.length > 0 && (
            <div className="text-sm text-white/70">
              <span className="text-red-300">− Entfernt:</span>{' '}
              {pendingRemovals.map((id) => playerById[id]?.name ?? '?').join(', ')}
            </div>
          )}
        </section>
      )}

      {/* Balances */}
      <section className="card">
        <h2 className="font-display text-xl text-gold-light mb-3">Spielstand</h2>
        <div className="space-y-2">
          {allPlayersForDisplay
            .filter((p) => {
              // Entfernte Spieler nur anzeigen wenn Balance != 0
              if (removedPlayerIds.has(p.id)) {
                return Math.abs(balances[p.id] ?? 0) > 0.001;
              }
              return true;
            })
            .sort((a, b) => (balances[b.id] ?? 0) - (balances[a.id] ?? 0))
            .map((p, idx) => {
              const bal = balances[p.id] ?? 0;
              const positive = bal > 0;
              const isRemoved = removedPlayerIds.has(p.id);
              return (
                <div
                  key={p.id}
                  className={`flex items-center justify-between rounded-lg px-3 py-2 ${
                    isRemoved ? 'bg-black/10 border border-white/5' : 'bg-black/20'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-6 text-center text-white/40 tabular-nums">{idx + 1}.</span>
                    <span className={`font-medium ${isRemoved ? 'text-white/50' : ''}`}>{p.name}</span>
                    {isRemoved && (
                      <span className="chip bg-white/10 text-white/40 text-xs">ausgestiegen</span>
                    )}
                    {!isRemoved && idx === 0 && state.rounds.length > 0 && (
                      <span className="chip bg-gold/20 text-gold-light">👑</span>
                    )}
                  </div>
                  <span
                    className={`tabular-nums font-semibold ${
                      positive ? 'text-emerald-300' : bal < 0 ? 'text-red-300' : 'text-white/60'
                    }`}
                  >
                    {positive ? '+' : ''}
                    {formatCHF(bal)}
                  </span>
                </div>
              );
            })}
        </div>
      </section>

      {/* Net flows */}
      <section className="card">
        <h2 className="font-display text-xl text-gold-light mb-3">Geldflüsse (netto)</h2>
        {netFlows.length === 0 ? (
          <p className="text-sm text-white/50">Noch keine Geldflüsse zwischen Spielern.</p>
        ) : (
          <ul className="space-y-1.5">
            {netFlows.map((f, i) => (
              <li
                key={i}
                className="flex items-center justify-between rounded-lg bg-black/20 px-3 py-2 text-sm"
              >
                <span>
                  <span className="font-semibold">{playerById[f.from]?.name}</span>
                  <span className="text-white/50"> → </span>
                  <span className="font-semibold">{playerById[f.to]?.name}</span>
                </span>
                <span className="tabular-nums text-gold-light font-semibold">
                  {formatCHF(f.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Round history */}
      {state.rounds.length > 0 && (
        <section className="card">
          <h2 className="font-display text-xl text-gold-light mb-3">Runden-Verlauf</h2>
          <div className="space-y-2">
            {[...state.rounds].reverse().map((r) => (
              <RoundSummary key={r.index} record={r} playerById={playerById} />
            ))}
          </div>
        </section>
      )}

      <div className="sticky bottom-3 z-10">
        <button onClick={() => setShowRound(true)} className="btn-primary w-full text-lg shadow-2xl">
          ➕ Neue Runde
        </button>
      </div>

      {showRound && (
        <RoundModal
          state={state}
          onClose={() => setShowRound(false)}
          onSubmit={(input) => {
            try {
              const { state: next } = applyRound(state, input);
              onChange(next);
              setShowRound(false);
            } catch (e) {
              alert((e as Error).message);
            }
          }}
        />
      )}

      {showGrundpot && (
        <GrundpotModal
          state={state}
          onClose={() => setShowGrundpot(false)}
          onConfirm={(playerId) => {
            onChange(payGrundpot(state, playerId));
            setShowGrundpot(false);
          }}
        />
      )}

      {showPlayerMgmt && (
        <PlayerManagementModal
          state={state}
          onClose={() => setShowPlayerMgmt(false)}
          onChange={(next) => onChange(next)}
        />
      )}

      <footer className="text-center text-xs text-white/30 pt-4">
        Lokaler Spielstand · {new Date(state.createdAt).toLocaleDateString('de-CH')}
      </footer>
    </div>
  );
}

/* ---------------- Round Modal ---------------- */

function RoundModal({
  state,
  onClose,
  onSubmit,
}: {
  state: GameState;
  onClose: () => void;
  onSubmit: (input: { hackerId: PlayerId; goingAlong: PlayerId[]; tricks: Record<PlayerId, number> }) => void;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [hackerId, setHackerId] = useState<PlayerId>(state.players[0].id);
  const [goingAlong, setGoingAlong] = useState<Set<PlayerId>>(new Set());
  const [tricks, setTricks] = useState<Record<PlayerId, number>>({});

  const others = state.players.filter((p) => p.id !== hackerId);
  const active = [hackerId, ...Array.from(goingAlong)];
  const tricksSum = active.reduce((s, id) => s + (tricks[id] ?? 0), 0);

  const toggleGoing = (id: PlayerId) => {
    const next = new Set(goingAlong);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setGoingAlong(next);
  };

  const goNext = () => {
    const t: Record<PlayerId, number> = {};
    for (const id of active) t[id] = 0;
    setTricks(t);
    setStep(2);
  };

  const submit = () => {
    const input = {
      hackerId,
      goingAlong: Array.from(goingAlong),
      tricks,
    };
    const errs = validateRoundInput(state, input);
    if (errs.length > 0) {
      alert(errs.map((e) => e.message).join('\n'));
      return;
    }
    onSubmit(input);
  };

  const previewPot = state.pot;
  const previewTotal = sumPot(previewPot);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-2 sm:p-6 overflow-y-auto">
      <div className="card w-full max-w-lg max-h-[95vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl text-gold-light">
            Neue Runde – Schritt {step}/2
          </h2>
          <button onClick={onClose} className="btn-secondary px-3" aria-label="Schliessen">✕</button>
        </div>

        <div className="rounded-lg bg-black/30 px-3 py-2 mb-4 text-sm flex justify-between">
          <span className="text-white/60">Pot:</span>
          <span className="font-semibold tabular-nums">{formatCHF(previewTotal)}</span>
        </div>

        {step === 1 ? (
          <div className="space-y-5">
            <div>
              <label className="label">Wer hackt?</label>
              <div className="grid grid-cols-2 gap-2">
                {state.players.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setHackerId(p.id);
                      const next = new Set(goingAlong);
                      next.delete(p.id);
                      setGoingAlong(next);
                    }}
                    className={`rounded-lg px-3 py-2 text-left border transition ${
                      hackerId === p.id
                        ? 'bg-gold text-felt-dark border-gold font-semibold'
                        : 'bg-black/30 border-white/10 hover:border-gold/50'
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="label">Wer geht mit?</label>
              <div className="grid grid-cols-2 gap-2">
                {others.map((p) => {
                  const on = goingAlong.has(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => toggleGoing(p.id)}
                      className={`rounded-lg px-3 py-2 text-left border transition ${
                        on
                          ? 'bg-emerald-500/30 border-emerald-400 font-semibold'
                          : 'bg-black/30 border-white/10 hover:border-emerald-400/50'
                      }`}
                    >
                      <span className={on ? '' : 'text-white/70'}>
                        {on ? '✓ ' : ''}
                        {p.name}
                      </span>
                    </button>
                  );
                })}
              </div>
              {goingAlong.size === 0 && (
                <p className="mt-2 text-xs text-amber-300">
                  Niemand geht mit – {state.players.find((p) => p.id === hackerId)?.name} erhält den ganzen Pot.
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <button onClick={onClose} className="btn-secondary flex-1">Abbrechen</button>
              {goingAlong.size === 0 ? (
                <button
                  onClick={() =>
                    onSubmit({ hackerId, goingAlong: [], tricks: {} })
                  }
                  className="btn-primary flex-1"
                >
                  Pot kassieren
                </button>
              ) : (
                <button onClick={goNext} className="btn-primary flex-1">Weiter</button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <label className="label">Stiche (Summe = 4)</label>
              <div className="space-y-2">
                {active.map((id) => {
                  const p = state.players.find((x) => x.id === id)!;
                  const isHacker = id === hackerId;
                  return (
                    <div key={id} className="flex items-center gap-3 rounded-lg bg-black/30 px-3 py-2">
                      <div className="flex-1">
                        <div className="font-medium flex items-center gap-2">
                          {p.name}
                          {isHacker ? (
                            <span className="chip bg-gold/30 text-gold-light">Hacker</span>
                          ) : (
                            <span className="chip bg-emerald-500/30 text-emerald-200">mit</span>
                          )}
                        </div>
                        <div className="text-xs text-white/50">
                          braucht ≥ {isHacker ? 2 : 1} Stiche zum Gewinnen
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {[0, 1, 2, 3, 4].map((n) => {
                          const sel = (tricks[id] ?? 0) === n;
                          return (
                            <button
                              key={n}
                              type="button"
                              onClick={() => setTricks({ ...tricks, [id]: n })}
                              className={`w-8 h-8 rounded text-sm font-semibold transition ${
                                sel
                                  ? 'bg-gold text-felt-dark'
                                  : 'bg-black/40 text-white/70 hover:bg-white/10'
                              }`}
                            >
                              {n}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
              <p
                className={`mt-2 text-sm ${
                  tricksSum === 4 ? 'text-emerald-300' : tricksSum > 4 ? 'text-red-300' : 'text-amber-300'
                }`}
              >
                Verteilte Stiche: {tricksSum} / 4
              </p>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setStep(1)} className="btn-secondary flex-1">Zurück</button>
              <button onClick={submit} disabled={tricksSum !== 4} className="btn-primary flex-1">
                Runde bestätigen
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- Grundpot Modal ---------------- */

function GrundpotModal({
  state,
  onClose,
  onConfirm,
}: {
  state: GameState;
  onClose: () => void;
  onConfirm: (playerId: PlayerId) => void;
}) {
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerId>(state.players[0]?.id ?? '');
  const grundpotAmount = state.config.baseBet * state.players.length;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-2 sm:p-6 overflow-y-auto">
      <div className="card w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl text-gold-light">Grundpot zahlen</h2>
          <button onClick={onClose} className="btn-secondary px-3" aria-label="Schliessen">✕</button>
        </div>

        <p className="text-sm text-white/70 mb-4">
          Wer hat falsch ausgeteilt? Der Spieler zahlt den Grundpot ({formatCHF(grundpotAmount)}) in den aktuellen Pot ein.
        </p>

        <div className="space-y-4">
          <div>
            <label className="label">Spieler auswählen</label>
            <div className="grid grid-cols-2 gap-2">
              {state.players.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedPlayer(p.id)}
                  className={`rounded-lg px-3 py-2 text-left border transition ${
                    selectedPlayer === p.id
                      ? 'bg-gold text-felt-dark border-gold font-semibold'
                      : 'bg-black/30 border-white/10 hover:border-gold/50'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-lg bg-black/30 px-3 py-2 text-sm flex justify-between">
            <span className="text-white/60">Betrag:</span>
            <span className="font-semibold tabular-nums">{formatCHF(grundpotAmount)}</span>
          </div>

          <div className="flex gap-2">
            <button onClick={onClose} className="btn-secondary flex-1">Abbrechen</button>
            <button
              onClick={() => onConfirm(selectedPlayer)}
              className="btn-primary flex-1"
            >
              Bestätigen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Player Management Modal ---------------- */

function PlayerManagementModal({
  state,
  onClose,
  onChange,
}: {
  state: GameState;
  onClose: () => void;
  onChange: (s: GameState) => void;
}) {
  const [newName, setNewName] = useState('');
  const grundpotActive = isGrundpot(state);
  const pendingAdditions = state.pendingAdditions ?? [];
  const pendingRemovals = state.pendingRemovals ?? [];

  const allCurrentNames = [
    ...state.players.map((p) => p.name.toLowerCase()),
    ...pendingAdditions.map((p) => p.name.toLowerCase()),
  ];

  const trimmedName = newName.trim();
  const nameValid =
    trimmedName.length > 0 &&
    trimmedName.length <= 20 &&
    !allCurrentNames.includes(trimmedName.toLowerCase());

  const totalPlayersAfter = grundpotActive
    ? state.players.length
    : state.players.length + pendingAdditions.length - pendingRemovals.length;

  const canAdd = nameValid && totalPlayersAfter < 7;
  const canRemove = (playerId: PlayerId) => {
    if (grundpotActive) return state.players.length > 2;
    return !pendingRemovals.includes(playerId) && totalPlayersAfter > 2;
  };

  const handleAdd = () => {
    if (!canAdd) return;
    const player = { id: uid(), name: trimmedName };
    if (grundpotActive) {
      onChange(addPlayerImmediate(state, player));
    } else {
      onChange(addPendingPlayer(state, player));
    }
    setNewName('');
  };

  const handleRemove = (playerId: PlayerId) => {
    if (!canRemove(playerId)) return;
    if (grundpotActive) {
      onChange(removePlayerImmediate(state, playerId));
    } else {
      onChange(removePendingPlayer(state, playerId));
    }
  };

  const handleCancelAddition = (playerId: PlayerId) => {
    onChange(cancelPendingAddition(state, playerId));
  };

  const handleCancelRemoval = (playerId: PlayerId) => {
    onChange(cancelPendingRemoval(state, playerId));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-2 sm:p-6 overflow-y-auto">
      <div className="card w-full max-w-md max-h-[95vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl text-gold-light">Spieler verwalten</h2>
          <button onClick={onClose} className="btn-secondary px-3" aria-label="Schliessen">✕</button>
        </div>

        {grundpotActive ? (
          <p className="text-sm text-emerald-300 mb-4">
            ✓ Grundpot aktiv – Änderungen werden sofort wirksam.
          </p>
        ) : (
          <p className="text-sm text-amber-300 mb-4">
            ⏳ Kein Grundpot – Änderungen werden ab dem nächsten Grundpot-Reset wirksam.
          </p>
        )}

        {/* Current players */}
        <div className="space-y-4">
          <div>
            <label className="label">Aktuelle Spieler ({state.players.length})</label>
            <div className="space-y-2">
              {state.players.map((p) => {
                const isPendingRemoval = pendingRemovals.includes(p.id);
                return (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between rounded-lg px-3 py-2 ${
                      isPendingRemoval ? 'bg-red-900/20 border border-red-500/30' : 'bg-black/20'
                    }`}
                  >
                    <span className={isPendingRemoval ? 'line-through text-white/40' : ''}>
                      {p.name}
                    </span>
                    {isPendingRemoval ? (
                      <button
                        onClick={() => handleCancelRemoval(p.id)}
                        className="text-xs btn-secondary px-2 py-1"
                      >
                        Rückgängig
                      </button>
                    ) : (
                      <button
                        onClick={() => handleRemove(p.id)}
                        disabled={!canRemove(p.id)}
                        className="btn-danger px-2 py-1 text-xs"
                      >
                        Entfernen
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pending additions (nur wenn kein Grundpot) */}
          {!grundpotActive && pendingAdditions.length > 0 && (
            <div>
              <label className="label">Wird hinzugefügt (ab nächstem Grundpot)</label>
              <div className="space-y-2">
                {pendingAdditions.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-lg bg-emerald-900/20 border border-emerald-500/30 px-3 py-2"
                  >
                    <span className="text-emerald-300">{p.name}</span>
                    <button
                      onClick={() => handleCancelAddition(p.id)}
                      className="text-xs btn-secondary px-2 py-1"
                    >
                      Rückgängig
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add new player */}
          <div>
            <label className="label">Neuen Spieler hinzufügen</label>
            <div className="flex gap-2">
              <input
                className="input flex-1"
                placeholder="Name"
                value={newName}
                maxLength={20}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              />
              <button
                onClick={handleAdd}
                disabled={!canAdd}
                className="btn-primary px-4"
              >
                +
              </button>
            </div>
            {totalPlayersAfter >= 7 && (
              <p className="mt-1 text-xs text-amber-300">Maximum 7 Spieler erreicht.</p>
            )}
            {trimmedName.length > 0 && !nameValid && totalPlayersAfter < 7 && (
              <p className="mt-1 text-xs text-red-300">Name muss eindeutig sein (1–20 Zeichen).</p>
            )}
          </div>

          <button onClick={onClose} className="btn-secondary w-full">Schliessen</button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Round Summary ---------------- */

function RoundSummary({
  record,
  playerById,
}: {
  record: RoundRecord;
  playerById: Record<PlayerId, Player>;
}) {
  const r = record;
  const hackerName = playerById[r.hackerId]?.name ?? '?';
  const label =
    r.outcome.kind === 'no-going-along'
      ? 'Niemand mit'
      : r.outcome.kind === 'all-won'
      ? 'Alle gewinnen'
      : 'Gemischt';

  return (
    <details className="rounded-lg bg-black/20 px-3 py-2 text-sm">
      <summary className="cursor-pointer flex items-center justify-between gap-2">
        <span>
          <span className="text-white/40">#{r.index + 1}</span>{' '}
          <span className="font-semibold">{hackerName}</span> hackt ·{' '}
          <span className="text-white/60">{label}</span>
        </span>
        <span className="tabular-nums text-white/60">Pot {formatCHF(r.potTotalBefore)}</span>
      </summary>
      <div className="mt-2 space-y-1.5 text-xs">
        {r.goingAlong.length > 0 && (
          <div>
            <span className="text-white/50">Mit:</span>{' '}
            {r.goingAlong.map((id) => playerById[id]?.name).join(', ')}
          </div>
        )}
        {Object.keys(r.tricks).length > 0 && (
          <div>
            <span className="text-white/50">Stiche:</span>{' '}
            {Object.entries(r.tricks)
              .map(([id, t]) => `${playerById[id]?.name} ${t}`)
              .join(' · ')}
          </div>
        )}
        {r.winners.length > 0 && (
          <div className="text-emerald-300">
            Gewinner: {r.winners.map((id) => playerById[id]?.name).join(', ')}
          </div>
        )}
        {r.losers.length > 0 && (
          <div className="text-red-300">
            Verlierer: {r.losers.map((id) => playerById[id]?.name).join(', ')}
          </div>
        )}
        {r.transfers.length > 0 && (
          <div className="pt-1">
            <div className="text-white/50 mb-1">Geldfluss:</div>
            <ul className="space-y-0.5">
              {r.transfers.map((t, i) => (
                <li key={i}>
                  {playerById[t.from]?.name} → {playerById[t.to]?.name}:{' '}
                  <span className="tabular-nums">{formatCHF(t.amount)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {r.loserPayments.length > 0 && (
          <div className="pt-1">
            <div className="text-white/50 mb-1">Einzahlung in nächsten Pot:</div>
            <ul className="space-y-0.5">
              {r.loserPayments.map((lp, i) => (
                <li key={i}>
                  {playerById[lp.playerId]?.name}:{' '}
                  <span className="tabular-nums">{formatCHF(lp.amount)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </details>
  );
}

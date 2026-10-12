import { useCallback, useEffect, useState } from 'react';
import type { CoiffeurGameState, CoiffeurTrumpf } from './coiffeur-types';
import { FREE_CHOICES, TRUMPF_INFO, isFreeRow, rowMultiplier } from './coiffeur-types';
import {
  createInitialCoiffeurState,
  getCellScore,
  getRowRawPoints,
  setRowKind,
  undoCoiffeurLast,
  writeCoiffeurPoints,
} from './coiffeur-logic';
import { loadCoiffeurState, saveCoiffeurState } from './coiffeur-storage';
import { CoiffeurScoreInput } from './CoiffeurScoreInput';
import { JassStartScreen } from './JassStartScreen';
import './coiffeur.css';

export default function CoiffeurTafel({ onBack }: { onBack: () => void }) {
  const [state, setState] = useState<CoiffeurGameState | null>(loadCoiffeurState);
  const [lastNames, setLastNames] = useState<[string, string] | undefined>(undefined);
  const [scoreInput, setScoreInput] = useState<{ rowIndex: number; team: 0 | 1 } | null>(null);

  useEffect(() => {
    saveCoiffeurState(state);
  }, [state]);

  const handleScoreSubmit = useCallback((rowIndex: number, team: 0 | 1, points: number, isMatch: boolean) => {
    setState((prev) => (prev ? writeCoiffeurPoints(prev, rowIndex, team, points, isMatch) : prev));
    setScoreInput(null);
  }, []);

  if (!state) {
    return (
      <JassStartScreen
        title="Coiffeur"
        askRounds
        initialNames={lastNames}
        onBack={onBack}
        onStart={({ teamNames, rounds }) => setState(createInitialCoiffeurState(teamNames, rounds))}
      />
    );
  }

  const handleUndo = () => setState((prev) => (prev ? undoCoiffeurLast(prev) : prev));

  const handleClear = () => {
    if (confirm('Tafel wirklich leeren und neu starten?')) {
      setLastNames(state.teamNames);
      setState(null);
    }
  };

  const [total0, total1] = state.totals;
  const [name0, name1] = state.teamNames;

  return (
    <div className="coiffeur-container">
      <div className="coiffeur-header">
        <button onClick={onBack} className="coiffeur-back-btn" aria-label="Zurück">
          ←
        </button>
        <h1 className="coiffeur-title">Coiffeur</h1>
        <div className="coiffeur-header-actions">
          <button onClick={handleUndo} disabled={state.history.length === 0} className="coiffeur-action-btn" aria-label="Undo">
            ↩
          </button>
          <button onClick={handleClear} className="coiffeur-action-btn" aria-label="Tafel leeren">
            ✕
          </button>
        </div>
      </div>

      <div className="coiffeur-table-wrapper">
        <table className="coiffeur-table">
          <thead>
            <tr>
              <th className="coiffeur-th coiffeur-th-team">{name0}</th>
              <th className="coiffeur-th coiffeur-th-trumpf">Trumpf</th>
              <th className="coiffeur-th coiffeur-th-team">{name1}</th>
            </tr>
          </thead>
          <tbody>
            {state.rowKinds.map((kind, idx) => {
              const played = state.teams[0].cells[idx] !== null || state.teams[1].cells[idx] !== null;
              const info = TRUMPF_INFO[kind];

              const scoreCell = (team: 0 | 1) => {
                const own = state.teams[team].cells[idx];
                const raw = getRowRawPoints(state, team, idx);
                return (
                  <td
                    className={`coiffeur-td coiffeur-td-score ${own ? 'coiffeur-cell-done' : 'coiffeur-cell-open coiffeur-td-clickable'}`}
                    onClick={() => !own && setScoreInput({ rowIndex: idx, team })}
                    aria-label={own ? 'Trumpf gespielt' : 'Trumpf noch offen'}
                  >
                    <span className={own ? 'coiffeur-check' : 'coiffeur-open-mark'}>{own ? '✓' : '○'}</span>
                    {raw === null ? (
                      <span className="coiffeur-empty">–</span>
                    ) : (
                      <span
                        className={`${own?.isMatch ? 'coiffeur-match' : ''} ${own ? 'coiffeur-announced' : 'coiffeur-gained'}`}
                      >
                        {getCellScore(state, team, idx)}
                      </span>
                    )}
                  </td>
                );
              };

              return (
                <tr key={idx} className={state.teams[0].cells[idx] && state.teams[1].cells[idx] ? 'coiffeur-row-played' : ''}>
                  {scoreCell(0)}
                  <td className="coiffeur-td coiffeur-td-trumpf">
                    <span className="coiffeur-mult">{rowMultiplier(idx)}x</span>
                    {isFreeRow(idx) && !played ? (
                      <div className="coiffeur-free">
                        <span className="coiffeur-trumpf-emoji">{info.emoji}</span>
                        <select
                          className="coiffeur-select"
                          value={kind}
                          aria-label={`Trumpf für ${rowMultiplier(idx)}x`}
                          onChange={(e) =>
                            setState((prev) =>
                              prev ? setRowKind(prev, idx, e.target.value as CoiffeurTrumpf) : prev,
                            )
                          }
                        >
                          {FREE_CHOICES.map((k) => (
                            <option key={k} value={k}>
                              {TRUMPF_INFO[k].emoji} {TRUMPF_INFO[k].label}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <>
                        <span className="coiffeur-trumpf-emoji">{info.emoji}</span>
                        <span className="coiffeur-trumpf-label">{info.label}</span>
                      </>
                    )}
                  </td>
                  {scoreCell(1)}
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="coiffeur-total-row">
              <td className="coiffeur-td coiffeur-td-total">
                <span className={total0 > total1 ? 'coiffeur-winning' : ''}>{total0}</span>
              </td>
              <td className="coiffeur-td coiffeur-td-trumpf">Total</td>
              <td className="coiffeur-td coiffeur-td-total">
                <span className={total1 > total0 ? 'coiffeur-winning' : ''}>{total1}</span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {scoreInput && (
        <CoiffeurScoreInput
          rowIndex={scoreInput.rowIndex}
          kind={state.rowKinds[scoreInput.rowIndex]}
          team={scoreInput.team}
          teamName={state.teamNames[scoreInput.team]}
          onSubmit={handleScoreSubmit}
          onClose={() => setScoreInput(null)}
        />
      )}
    </div>
  );
}











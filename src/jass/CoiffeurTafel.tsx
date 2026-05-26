import { useCallback, useEffect, useState } from 'react';
import type { CoiffeurGameState } from './coiffeur-types';
import { COIFFEUR_ROWS } from './coiffeur-types';
import { clearCoiffeurTafel, createInitialCoiffeurState, getCellScore, undoCoiffeurLast, writeCoiffeurPoints } from './coiffeur-logic';
import { loadCoiffeurState, saveCoiffeurState } from './coiffeur-storage';
import { CoiffeurScoreInput } from './CoiffeurScoreInput';
import './coiffeur.css';

export default function CoiffeurTafel({ onBack }: { onBack: () => void }) {
  const [state, setState] = useState<CoiffeurGameState>(() => loadCoiffeurState() ?? createInitialCoiffeurState());
  const [scoreInput, setScoreInput] = useState<{ rowIndex: number; team: 0 | 1 } | null>(null);

  useEffect(() => {
    saveCoiffeurState(state);
  }, [state]);

  const handleCellClick = useCallback((rowIndex: number, team: 0 | 1) => {
    // Nur klickbar wenn die Reihe noch nicht gespielt wurde
    if (state.teams[0].cells[rowIndex] !== null) return;
    setScoreInput({ rowIndex, team });
  }, [state]);

  const handleScoreSubmit = useCallback((rowIndex: number, team: 0 | 1, points: number, isMatch: boolean) => {
    setState(prev => writeCoiffeurPoints(prev, rowIndex, team, points, isMatch));
    setScoreInput(null);
  }, []);

  const handleUndo = useCallback(() => {
    setState(prev => undoCoiffeurLast(prev));
  }, []);

  const handleClear = useCallback(() => {
    if (confirm('Tafel wirklich leeren?')) {
      setState(clearCoiffeurTafel());
    }
  }, []);

  const total0 = state.totals[0];
  const total1 = state.totals[1];

  return (
    <div className="coiffeur-container">
      {/* Header */}
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

      {/* Table */}
      <div className="coiffeur-table-wrapper">
        <table className="coiffeur-table">
          <thead>
            <tr>
              <th className="coiffeur-th coiffeur-th-team">Team 1</th>
              <th className="coiffeur-th coiffeur-th-trumpf">Trumpf</th>
              <th className="coiffeur-th coiffeur-th-mult">×</th>
              <th className="coiffeur-th coiffeur-th-team">Team 2</th>
            </tr>
          </thead>
          <tbody>
            {COIFFEUR_ROWS.map((row, idx) => {
              const cell0 = state.teams[0].cells[idx];
              const cell1 = state.teams[1].cells[idx];
              const score0 = getCellScore(cell0, idx);
              const score1 = getCellScore(cell1, idx);
              const played = cell0 !== null;

              return (
                <tr key={row.trumpf} className={played ? 'coiffeur-row-played' : ''}>
                  <td
                    className={`coiffeur-td coiffeur-td-score ${!played ? 'coiffeur-td-clickable' : ''}`}
                    onClick={() => !played && handleCellClick(idx, 0)}
                  >
                    {played ? (
                      <span className={cell0?.isMatch ? 'coiffeur-match' : ''}>
                        {score0}
                      </span>
                    ) : (
                      <span className="coiffeur-empty">–</span>
                    )}
                  </td>
                  <td className="coiffeur-td coiffeur-td-trumpf">
                    <span className="coiffeur-trumpf-emoji">{row.emoji}</span>
                    <span className="coiffeur-trumpf-label">{row.label}</span>
                  </td>
                  <td className="coiffeur-td coiffeur-td-mult">
                    {row.multiplier}×
                  </td>
                  <td
                    className={`coiffeur-td coiffeur-td-score ${!played ? 'coiffeur-td-clickable' : ''}`}
                    onClick={() => !played && handleCellClick(idx, 1)}
                  >
                    {played ? (
                      <span className={cell1?.isMatch ? 'coiffeur-match' : ''}>
                        {score1}
                      </span>
                    ) : (
                      <span className="coiffeur-empty">–</span>
                    )}
                  </td>
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
              <td className="coiffeur-td coiffeur-td-mult"></td>
              <td className="coiffeur-td coiffeur-td-total">
                <span className={total1 > total0 ? 'coiffeur-winning' : ''}>{total1}</span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Score Input Modal */}
      {scoreInput && (
        <CoiffeurScoreInput
          rowIndex={scoreInput.rowIndex}
          team={scoreInput.team}
          onSubmit={handleScoreSubmit}
          onClose={() => setScoreInput(null)}
        />
      )}
    </div>
  );
}

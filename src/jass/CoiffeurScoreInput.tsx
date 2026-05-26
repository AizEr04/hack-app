import { useState } from 'react';
import { COIFFEUR_ROWS } from './coiffeur-types';

const MAX_POINTS = 157;

interface CoiffeurScoreInputProps {
  rowIndex: number;
  team: 0 | 1;
  onSubmit: (rowIndex: number, team: 0 | 1, points: number, isMatch: boolean) => void;
  onClose: () => void;
}

export function CoiffeurScoreInput({ rowIndex, team, onSubmit, onClose }: CoiffeurScoreInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [isMatch, setIsMatch] = useState(false);

  const row = COIFFEUR_ROWS[rowIndex];
  const points = parseInt(inputValue, 10);
  const isValid = isMatch || (Number.isFinite(points) && points >= 0 && points <= MAX_POINTS);
  const otherPoints = isMatch ? 0 : (MAX_POINTS - (points || 0));

  const handleDigit = (digit: string) => {
    if (inputValue.length >= 3) return;
    const newValue = inputValue + digit;
    const num = parseInt(newValue, 10);
    if (num > MAX_POINTS) return;
    setInputValue(newValue);
  };

  const handleBackspace = () => {
    setInputValue(inputValue.slice(0, -1));
  };

  const handleMatchToggle = () => {
    setIsMatch(!isMatch);
    if (!isMatch) {
      setInputValue('157');
    } else {
      setInputValue('');
    }
  };

  const handleSubmit = () => {
    if (isMatch) {
      onSubmit(rowIndex, team, MAX_POINTS, true);
    } else if (isValid && points >= 0) {
      onSubmit(rowIndex, team, points, false);
    }
  };

  return (
    <div className="jass-score-overlay">
      <div className="jass-score-modal">
        <h2 className="jass-score-title">
          {row.emoji} {row.label} ({row.multiplier}×)
        </h2>
        <p className="coiffeur-input-team">Team {team + 1} sagt an</p>

        {/* Close button */}
        <button className="jass-score-swap" onClick={onClose} aria-label="Schliessen">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {/* Score display */}
        <div className="jass-score-display">
          <div className="jass-score-box">
            <div className="jass-score-value jass-score-active">
              {isMatch ? '257' : (inputValue || '0')}
            </div>
            <div className="jass-score-value jass-score-other">
              {isMatch ? '0' : otherPoints}
            </div>
          </div>
          <button
            className={`jass-match-btn ${isMatch ? 'jass-match-active' : ''}`}
            onClick={handleMatchToggle}
          >
            ⇐ Match
          </button>
        </div>

        {/* Numpad */}
        <div className="jass-numpad">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
            <button key={d} className="jass-numpad-btn" onClick={() => handleDigit(d)} disabled={isMatch}>
              {d}
            </button>
          ))}
          <div className="jass-numpad-btn jass-numpad-empty" />
          <button className="jass-numpad-btn" onClick={() => handleDigit('0')} disabled={isMatch}>
            0
          </button>
          <button className="jass-numpad-btn" onClick={handleBackspace} disabled={isMatch} aria-label="Löschen">
            ⌫
          </button>
        </div>

        {/* Action buttons */}
        <div className="jass-score-actions">
          <button className="jass-action-btn jass-action-cancel" onClick={onClose}>
            Abbrechen
          </button>
          <button
            className="jass-action-btn jass-action-ok"
            onClick={handleSubmit}
            disabled={!isMatch && !isValid}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

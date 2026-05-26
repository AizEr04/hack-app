import { useCallback, useEffect, useRef, useState } from 'react';
import type { JassGameState, TeamIndex } from './types';
import { addWyss, clearTafel, createInitialJassState, getTeamTotal, undoLast, writePoints } from './logic';
import { loadJassState, saveJassState } from './storage';
import { ScoreInput } from './ScoreInput';
import { ZShapeSVG } from './ZShapeSVG';
import './jass.css';

export default function SchieberTafel({ onBack }: { onBack: () => void }) {
  const [state, setState] = useState<JassGameState>(() => loadJassState() ?? createInitialJassState());
  const [menuOpen, setMenuOpen] = useState(false);
  const [scoreInput, setScoreInput] = useState<{ team: TeamIndex } | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartY = useRef<number | null>(null);
  const swipeHandled = useRef(false);

  useEffect(() => {
    saveJassState(state);
  }, [state]);

  // Keyboard shortcut: Escape or 'm' to open/close menu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (scoreInput) return; // Don't interfere with score input
      if (e.key === 'Escape' || e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        setMenuOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [scoreInput]);

  const handleLongPressStart = useCallback((team: TeamIndex) => {
    longPressTimer.current = setTimeout(() => {
      setScoreInput({ team });
      longPressTimer.current = null;
    }, 500);
  }, []);

  const handleLongPressEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleTouchStartSwipe = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    swipeHandled.current = false;
  }, []);

  const handleTouchMoveSwipe = useCallback((e: React.TouchEvent) => {
    if (touchStartY.current === null || swipeHandled.current) return;
    const deltaY = e.touches[0].clientY - touchStartY.current;
    if (Math.abs(deltaY) > 60) {
      setMenuOpen(true);
      swipeHandled.current = true;
    }
  }, []);

  const handleWyss = useCallback((team: TeamIndex, lineIndex: 0 | 1 | 2) => {
    setState(prev => addWyss(prev, team, lineIndex));
  }, []);

  const handleScoreSubmit = useCallback((team: TeamIndex, points: number, multiplier: number, isMatch: boolean) => {
    setState(prev => writePoints(prev, team, points, multiplier, isMatch));
    setScoreInput(null);
  }, []);

  const handleUndo = useCallback(() => {
    setState(prev => undoLast(prev));
    setMenuOpen(false);
  }, []);

  const handleClear = useCallback(() => {
    setState(clearTafel());
    setMenuOpen(false);
  }, []);

  const team0Total = getTeamTotal(state, 0);
  const team1Total = getTeamTotal(state, 1);

  return (
    <div
      className="jass-container"
      onTouchStart={handleTouchStartSwipe}
      onTouchMove={handleTouchMoveSwipe}
    >
      {/* Team 0 (oben, um 180° gedreht für gegenübersitzenden Spieler) */}
      <div
        className="jass-half jass-half-top"
        onTouchStart={() => handleLongPressStart(0)}
        onTouchEnd={handleLongPressEnd}
        onTouchCancel={handleLongPressEnd}
        onMouseDown={() => handleLongPressStart(0)}
        onMouseUp={handleLongPressEnd}
        onMouseLeave={handleLongPressEnd}
      >
        <div className="jass-half-content rotated">
          <div className="jass-total-bg">{team0Total}</div>
          <ZShapeSVG team={state.teams[0]} teamIndex={0} onLineClick={handleWyss} />
        </div>
      </div>

      {/* Mittellinie mit Menü-Button für Desktop */}
      <div className="jass-divider">
        <button
          className="jass-divider-menu-btn"
          onClick={() => setMenuOpen(true)}
          aria-label="Menü öffnen"
          title="Menü (M)"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="jass-divider-menu-icon">
            <line x1="4" y1="6" x2="20" y2="6" strokeLinecap="round"/>
            <line x1="4" y1="12" x2="20" y2="12" strokeLinecap="round"/>
            <line x1="4" y1="18" x2="20" y2="18" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* Team 1 (unten, normal orientiert) */}
      <div
        className="jass-half jass-half-bottom"
        onTouchStart={() => handleLongPressStart(1)}
        onTouchEnd={handleLongPressEnd}
        onTouchCancel={handleLongPressEnd}
        onMouseDown={() => handleLongPressStart(1)}
        onMouseUp={handleLongPressEnd}
        onMouseLeave={handleLongPressEnd}
      >
        <div className="jass-half-content">
          <div className="jass-total-bg">{team1Total}</div>
          <ZShapeSVG team={state.teams[1]} teamIndex={1} onLineClick={handleWyss} />
        </div>
      </div>

      {/* Menü Overlay */}
      {menuOpen && (
        <div className="jass-menu-overlay" onClick={() => setMenuOpen(false)}>
          <div className="jass-menu" onClick={(e) => e.stopPropagation()}>
            <button className="jass-menu-btn" onClick={handleUndo} disabled={state.history.length === 0}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="jass-menu-icon">
                <path d="M3 10h10a5 5 0 0 1 0 10H9" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M7 6L3 10l4 4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>Undo</span>
            </button>
            <button className="jass-menu-btn" onClick={handleClear}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="jass-menu-icon">
                <rect x="3" y="3" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M9 9l6 6M15 9l-6 6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>Tafel leeren</span>
            </button>
            <button className="jass-menu-btn" onClick={onBack}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="jass-menu-icon">
                <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>Menü</span>
            </button>
            <button className="jass-menu-btn" onClick={() => setMenuOpen(false)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="jass-menu-icon">
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>Schliessen</span>
            </button>
          </div>
        </div>
      )}

      {/* Score Input Modal */}
      {scoreInput && (
        <ScoreInput
          team={scoreInput.team}
          onSubmit={handleScoreSubmit}
          onClose={() => setScoreInput(null)}
        />
      )}
    </div>
  );
}

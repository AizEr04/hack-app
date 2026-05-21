import type { TeamIndex } from './types';
import { TallyMarks } from './TallyMarks';

/**
 * SVG-basierte Z-Form für eine Spielhälfte.
 * Die Z-Form besteht aus:
 * - Obere horizontale Linie (100er Striche)
 * - Diagonale von oben-rechts nach unten-links (50er Striche)
 * - Untere horizontale Linie (20er Striche + Rest)
 */
export function ZShapeSVG({
  team,
  teamIndex,
  onLineClick,
}: {
  team: { hundreds: number; fifties: number; twenties: number; rest: number };
  teamIndex: TeamIndex;
  onLineClick: (team: TeamIndex, lineIndex: 0 | 1 | 2) => void;
}) {
  return (
    <div className="jass-z-wrapper">
      {/* SVG for the Z lines */}
      <svg
        className="jass-z-svg"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        fill="none"
      >
        {/* Top horizontal line */}
        <line x1="2" y1="8" x2="98" y2="8" stroke="#dc2626" strokeWidth="0.6" />
        {/* Diagonal from top-right to bottom-left */}
        <line x1="98" y1="8" x2="2" y2="92" stroke="#dc2626" strokeWidth="0.6" />
        {/* Bottom horizontal line */}
        <line x1="2" y1="92" x2="98" y2="92" stroke="#dc2626" strokeWidth="0.6" />
      </svg>

      {/* Clickable areas and tally marks */}
      {/* Top line area (100er) */}
      <div
        className="jass-z-area jass-z-area-top"
        onClick={(e) => { e.stopPropagation(); onLineClick(teamIndex, 0); }}
      >
        <TallyMarks count={team.hundreds} type="hundred" />
      </div>

      {/* Diagonal area (50er) */}
      <div
        className="jass-z-area jass-z-area-diagonal"
        onClick={(e) => { e.stopPropagation(); onLineClick(teamIndex, 1); }}
      >
        <TallyMarks count={team.fifties} type="fifty" />
      </div>

      {/* Bottom line area (20er) */}
      <div
        className="jass-z-area jass-z-area-bottom"
        onClick={(e) => { e.stopPropagation(); onLineClick(teamIndex, 2); }}
      >
        <TallyMarks count={team.twenties} type="twenty" />
        {team.rest > 0 && <span className="jass-rest-number">{team.rest}</span>}
      </div>
    </div>
  );
}

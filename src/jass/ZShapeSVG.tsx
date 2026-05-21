import type { TeamIndex } from './types';
import { TallyMarks } from './TallyMarks';

/**
 * SVG-basierte Z-Form für eine Spielhälfte.
 * Die Z-Form besteht aus:
 * - Obere horizontale Linie (100er Striche darauf)
 * - Diagonale von rechtem Ende der oberen Linie zum linken Ende der unteren Linie (50er Striche darauf)
 * - Untere horizontale Linie (20er Striche + Rest darauf)
 *
 * Die Diagonale wird als SVG-Polygon klickbar gemacht (da ein HTML-Div nicht diagonal sein kann).
 * Die 50er-Striche werden auf der Mitte der Diagonale positioniert.
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
      {/* SVG for the Z red lines + clickable diagonal polygon */}
      <svg
        className="jass-z-svg"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        fill="none"
      >
        {/* Top horizontal line */}
        <line x1="2" y1="10" x2="98" y2="10" stroke="#dc2626" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
        {/* Diagonal from top-right to bottom-left */}
        <line x1="98" y1="10" x2="2" y2="90" stroke="#dc2626" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
        {/* Bottom horizontal line */}
        <line x1="2" y1="90" x2="98" y2="90" stroke="#dc2626" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />

        {/* Clickable diagonal area – a thin polygon along the diagonal line */}
        <polygon
          points="93,7 100,7 100,13 7,93 0,93 0,87"
          fill="transparent"
          className="jass-diagonal-hitarea"
          onClick={(e) => { e.stopPropagation(); onLineClick(teamIndex, 1); }}
        />
      </svg>

      {/* Top line (100er) – horizontal click area at y=10% */}
      <div
        className="jass-line-area jass-line-top"
        onClick={(e) => { e.stopPropagation(); onLineClick(teamIndex, 0); }}
      >
        <div className="jass-tally-on-line">
          <TallyMarks count={team.hundreds} type="hundred" />
        </div>
      </div>

      {/* 50er tally marks – positioned at the center of the diagonal */}
      <div className="jass-fifty-on-diagonal">
        <TallyMarks count={team.fifties} type="fifty" />
      </div>

      {/* Bottom line (20er) – horizontal click area at y=90% */}
      <div
        className="jass-line-area jass-line-bottom"
        onClick={(e) => { e.stopPropagation(); onLineClick(teamIndex, 2); }}
      >
        <div className="jass-tally-on-line">
          <TallyMarks count={team.twenties} type="twenty" />
        </div>
        {team.rest > 0 && <span className="jass-rest-number">{team.rest}</span>}
      </div>
    </div>
  );
}

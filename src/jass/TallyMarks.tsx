/**
 * Renders tally marks (Striche) for the Jasstafel.
 *
 * - "hundred" and "twenty": Groups of 5 (4 vertical + 1 diagonal)
 * - "fifty": Groups of 2 (X-form, two crossing lines)
 */
export function TallyMarks({ count, type }: { count: number; type: 'hundred' | 'fifty' | 'twenty' }) {
  if (count === 0) return null;

  if (type === 'fifty') {
    // X-form: every 2 strokes form an X
    const fullXs = Math.floor(count / 2);
    const remainder = count % 2;

    return (
      <div className="tally-fifty-container">
        {Array.from({ length: fullXs }).map((_, i) => (
          <div key={i} className="tally-x">
            <div className="tally-x-line1" />
            <div className="tally-x-line2" />
          </div>
        ))}
        {remainder > 0 && (
          <div className="tally-x tally-x-single">
            <div className="tally-x-line1" />
          </div>
        )}
      </div>
    );
  }

  // hundred and twenty: groups of 5 (4 vertical + 1 diagonal)
  const fullGroups = Math.floor(count / 5);
  const remainder = count % 5;

  return (
    <div className="tally-group-container">
      {Array.from({ length: fullGroups }).map((_, i) => (
        <div key={i} className="tally-five">
          <div className="tally-stick" />
          <div className="tally-stick" />
          <div className="tally-stick" />
          <div className="tally-stick" />
          <div className="tally-diagonal" />
        </div>
      ))}
      {remainder > 0 && (
        <div className="tally-five">
          {Array.from({ length: remainder }).map((_, i) => (
            <div key={i} className="tally-stick" />
          ))}
        </div>
      )}
    </div>
  );
}

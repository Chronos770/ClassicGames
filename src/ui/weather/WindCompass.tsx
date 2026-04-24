import { useUnitFormatters } from '../../lib/weatherUnits';

interface Props {
  dirCurrent: number | null;
  dirAvg: number | null;
  speed: number | null;
  gust: number | null;
  size?: number;
}

export default function WindCompass({ dirCurrent, dirAvg, speed, gust, size = 180 }: Props) {
  const { fmtWindNum, windUnitLabel, toWind } = useUnitFormatters();
  const cx = size / 2;
  const cy = size / 2;
  // Padding around the outer ring makes room for cardinal labels, which now
  // live *outside* the ring to prevent the wind arrows from overlapping them.
  const outerPad = size < 170 ? 16 : 18;
  const r = size / 2 - outerPad;

  const polar = (deg: number, radius: number) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  };

  const cardinal = ['N', 'E', 'S', 'W'];
  const cardinalDegs = [0, 90, 180, 270];

  const speedStr = fmtWindNum(speed);
  const gustConv = toWind(gust);
  const speedConv = toWind(speed);
  const showGust = gustConv !== null && speedConv !== null && gustConv - speedConv >= 1;

  // Responsive type sizes.
  const speedFont = size < 150 ? 20 : size < 180 ? 24 : 28;
  const unitFont = size < 150 ? 8 : 9;
  const cardinalFont = size < 150 ? 10 : 11;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
      {/* outer ring */}
      <circle cx={cx} cy={cy} r={r} fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
      <circle cx={cx} cy={cy} r={r - 6} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />

      {/* tick marks every 30° — sit on the ring */}
      {Array.from({ length: 12 }, (_, i) => i * 30).map((deg) => {
        const outer = polar(deg, r);
        const inner = polar(deg, r - (deg % 90 === 0 ? 8 : 4));
        return (
          <line
            key={deg}
            x1={outer.x}
            y1={outer.y}
            x2={inner.x}
            y2={inner.y}
            stroke="rgba(255,255,255,0.3)"
            strokeWidth={deg % 90 === 0 ? 1.5 : 1}
          />
        );
      })}

      {/* cardinal labels — OUTSIDE the ring so arrow tips don't clash */}
      {cardinal.map((label, i) => {
        const p = polar(cardinalDegs[i], r + 11);
        return (
          <text
            key={label}
            x={p.x}
            y={p.y}
            textAnchor="middle"
            dominantBaseline="central"
            fill={label === 'N' ? '#f87171' : 'rgba(255,255,255,0.55)'}
            fontSize={cardinalFont}
            fontWeight="600"
          >
            {label}
          </text>
        );
      })}

      {/* Average wind direction — wider, faint blue wedge. Vertices are
          computed already-rotated rather than relying on the SVG transform
          attribute. Mixing SVG `transform="rotate(angle cx cy)"` with CSS
          `transform-origin` + `transition: transform` renders inconsistently
          on Android Chrome (the polygon ends up in the lower-left of the
          compass instead of pointing in the wind direction). Direct vertex
          math is bulletproof at the cost of losing the smooth tween. */}
      {dirAvg !== null && dirAvg !== undefined && (() => {
        const tip = polar(dirAvg, r - 6);
        const base1 = polar(dirAvg - 10, 12);
        const base2 = polar(dirAvg + 10, 12);
        return (
          <polygon
            points={`${tip.x},${tip.y} ${base1.x},${base1.y} ${base2.x},${base2.y}`}
            fill="rgba(96,165,250,0.35)"
            stroke="rgba(96,165,250,0.5)"
            strokeWidth="1"
          />
        );
      })()}

      {/* Current wind direction — sharper amber arrow, slightly shorter than avg. */}
      {dirCurrent !== null && dirCurrent !== undefined && (() => {
        const tip = polar(dirCurrent, r - 10);
        const base1 = polar(dirCurrent - 5, 16);
        const base2 = polar(dirCurrent + 5, 16);
        return (
          <polygon
            points={`${tip.x},${tip.y} ${base1.x},${base1.y} ${base2.x},${base2.y}`}
            fill="#fbbf24"
            stroke="#f59e0b"
            strokeWidth="1"
          />
        );
      })()}

      {/* Center hub so the arrows visually anchor at the middle. */}
      <circle cx={cx} cy={cy} r={5} fill="rgba(0,0,0,0.5)" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />

      {/* Speed readout — below the hub, two-line */}
      <text
        x={cx}
        y={cy + speedFont + 6}
        textAnchor="middle"
        fill="white"
        fontSize={speedFont}
        fontWeight="700"
        className="tabular-nums"
      >
        {speedStr}
      </text>
      <text
        x={cx}
        y={cy + speedFont + 6 + unitFont + 4}
        textAnchor="middle"
        fill="rgba(255,255,255,0.45)"
        fontSize={unitFont}
      >
        {windUnitLabel}
      </text>
      {showGust && (
        <text
          x={cx}
          y={cy - 10}
          textAnchor="middle"
          fill="rgba(251,191,36,0.85)"
          fontSize={unitFont + 1}
          fontWeight="600"
        >
          gust {gustConv!.toFixed(0)}
        </text>
      )}
    </svg>
  );
}

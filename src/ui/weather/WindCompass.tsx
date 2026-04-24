import { compassFromDegrees } from '../../lib/weatherService';
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
  const r = size / 2 - 12;

  const polar = (deg: number, radius: number) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  };

  const cardinal = ['N', 'E', 'S', 'W'];
  const cardinalDegs = [0, 90, 180, 270];

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* outer ring */}
      <circle cx={cx} cy={cy} r={r} fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
      <circle cx={cx} cy={cy} r={r - 8} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />

      {/* tick marks every 30° */}
      {Array.from({ length: 12 }, (_, i) => i * 30).map((deg) => {
        const outer = polar(deg, r);
        const inner = polar(deg, r - (deg % 90 === 0 ? 10 : 5));
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

      {/* cardinal labels */}
      {cardinal.map((label, i) => {
        const p = polar(cardinalDegs[i], r - 24);
        return (
          <text
            key={label}
            x={p.x}
            y={p.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fill={label === 'N' ? '#f87171' : 'rgba(255,255,255,0.6)'}
            fontSize={size < 160 ? 10 : 12}
            fontWeight="600"
          >
            {label}
          </text>
        );
      })}

      {/* average wind direction arc (wider, fainter) — rotated via group so we
          can animate the angle smoothly instead of recomputing the polygon. */}
      {dirAvg !== null && dirAvg !== undefined && (() => {
        const tip = polar(0, r - 6);
        const base1 = polar(-12, 14);
        const base2 = polar(12, 14);
        return (
          <g
            style={{ transformOrigin: `${cx}px ${cy}px`, transition: 'transform 800ms ease-out' }}
            transform={`rotate(${dirAvg} ${cx} ${cy})`}
          >
            <polygon
              points={`${tip.x},${tip.y} ${base1.x},${base1.y} ${base2.x},${base2.y}`}
              fill="rgba(96,165,250,0.35)"
              stroke="rgba(96,165,250,0.5)"
              strokeWidth="1"
            />
          </g>
        );
      })()}

      {/* current wind direction arrow (animated rotation) */}
      {dirCurrent !== null && dirCurrent !== undefined && (() => {
        const tip = polar(0, r - 6);
        const base1 = polar(-6, 20);
        const base2 = polar(6, 20);
        return (
          <g
            style={{ transformOrigin: `${cx}px ${cy}px`, transition: 'transform 500ms ease-out' }}
            transform={`rotate(${dirCurrent} ${cx} ${cy})`}
          >
            <polygon
              points={`${tip.x},${tip.y} ${base1.x},${base1.y} ${base2.x},${base2.y}`}
              fill="#fbbf24"
              stroke="#f59e0b"
              strokeWidth="1"
            />
          </g>
        );
      })()}

      {/* center text */}
      <text x={cx} y={cy - 10} textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="10">
        {compassFromDegrees(dirCurrent)}
      </text>
      <text x={cx} y={cy + 8} textAnchor="middle" fill="white" fontSize="20" fontWeight="700">
        {fmtWindNum(speed)}
      </text>
      <text x={cx} y={cy + 22} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="9">
        {windUnitLabel}
      </text>
      {gust !== null && gust !== undefined && gust > 0 && (
        <text x={cx} y={cy + 36} textAnchor="middle" fill="rgba(251,191,36,0.8)" fontSize="10">
          gust {(toWind(gust) ?? 0).toFixed(0)}
        </text>
      )}
    </svg>
  );
}

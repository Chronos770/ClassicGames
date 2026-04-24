import { compassFromDegrees } from '../../lib/weatherService';
import { useUnitFormatters } from '../../lib/weatherUnits';

interface Props {
  dirCurrent: number | null;
  dirAvg: number | null; // unused — kept for API compatibility
  speed: number | null;
  gust: number | null;   // unused — gust lives in the adjacent data rows
  size?: number;
}

// WeatherLink-console style compass. One ring, 8 cardinal labels around the
// edge, one small marker pointing to the direction wind is coming FROM,
// and a single-line horizontal readout in the middle: DIR  SPEED  UNIT.
export default function WindCompass({ dirCurrent, speed, size = 180 }: Props) {
  const { fmtWindNum, windUnitLabel } = useUnitFormatters();
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - (size < 150 ? 14 : 16);

  const polar = (deg: number, radius: number) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  };

  const cardinals = [
    { label: 'N', deg: 0 },
    { label: 'NE', deg: 45 },
    { label: 'E', deg: 90 },
    { label: 'SE', deg: 135 },
    { label: 'S', deg: 180 },
    { label: 'SW', deg: 225 },
    { label: 'W', deg: 270 },
    { label: 'NW', deg: 315 },
  ];

  const speedStr = fmtWindNum(speed, 0);
  const dirStr = compassFromDegrees(dirCurrent);

  const centerFont = size < 140 ? 16 : size < 170 ? 22 : 28;
  const unitFont = Math.round(centerFont * 0.45);
  const cardinalFont = size < 140 ? 9 : 10;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Single clean ring */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="rgba(96,165,250,0.06)"
        stroke="rgba(96,165,250,0.45)"
        strokeWidth="1.5"
      />

      {/* 8 cardinal labels sitting on the inside edge */}
      {cardinals.map((c) => {
        const p = polar(c.deg, r - 11);
        return (
          <text
            key={c.label}
            x={p.x}
            y={p.y}
            textAnchor="middle"
            dominantBaseline="central"
            fill={c.label === 'N' ? '#f87171' : 'rgba(255,255,255,0.5)'}
            fontSize={c.label.length === 1 ? cardinalFont + 1 : cardinalFont}
            fontWeight="600"
          >
            {c.label}
          </text>
        );
      })}

      {/* One small marker on the ring pointing toward where wind is FROM. */}
      {dirCurrent !== null && dirCurrent !== undefined && (() => {
        const tip = polar(dirCurrent, r - 2);
        const base1 = polar(dirCurrent - 5, r - 14);
        const base2 = polar(dirCurrent + 5, r - 14);
        return (
          <polygon
            points={`${tip.x},${tip.y} ${base1.x},${base1.y} ${base2.x},${base2.y}`}
            fill="#60a5fa"
          />
        );
      })()}

      {/* Horizontal center readout: DIR  SPEED  UNIT */}
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="central"
        fontWeight="700"
        fontSize={centerFont}
        fill="#93c5fd"
        className="tabular-nums"
      >
        <tspan>{dirStr === '--' ? '' : dirStr}</tspan>
        <tspan dx={centerFont * 0.35}>{speedStr}</tspan>
        <tspan dx={centerFont * 0.25} fontSize={unitFont} fontWeight="500">
          {windUnitLabel}
        </tspan>
      </text>
    </svg>
  );
}

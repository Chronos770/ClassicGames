import { compassFromDegrees } from '../../lib/weatherService';
import { useUnitFormatters } from '../../lib/weatherUnits';

interface Props {
  dirCurrent: number | null;
  dirAvg: number | null; // unused — kept for API compatibility
  speed: number | null;
  gust: number | null;   // unused — kept for API compatibility
  size?: number;
}

// Simple WeatherLink-console style compass. One ring, 8 cardinal labels
// around the edge, one small marker at the direction wind is coming FROM,
// and a single-line horizontal readout in the middle: DIR  SPEED  unit.
export default function WindCompass({ dirCurrent, speed, size = 240 }: Props) {
  const { fmtWindNum, windUnitLabel } = useUnitFormatters();

  // Draw in a fixed 240 viewBox and let the SVG scale to the element's
  // `size` prop. All measurements below are in those 240 units regardless
  // of rendered size, so the layout never breaks at smaller sizes.
  const V = 240;
  const cx = V / 2;
  const cy = V / 2;
  const r = V / 2 - 20;

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

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${V} ${V}`}
      className="max-w-full h-auto"
      style={{ maxWidth: size }}
    >
      {/* Single ring */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="rgba(96,165,250,0.06)"
        stroke="rgba(96,165,250,0.45)"
        strokeWidth="2"
      />

      {/* 8 cardinal labels just inside the ring */}
      {cardinals.map((c) => {
        const p = polar(c.deg, r - 14);
        return (
          <text
            key={c.label}
            x={p.x}
            y={p.y}
            textAnchor="middle"
            dominantBaseline="central"
            fill={c.label === 'N' ? '#f87171' : 'rgba(255,255,255,0.55)'}
            fontSize={c.label.length === 1 ? 13 : 11}
            fontWeight="600"
          >
            {c.label}
          </text>
        );
      })}

      {/* Single marker on the ring — points where wind is FROM */}
      {dirCurrent !== null && dirCurrent !== undefined && (() => {
        const tip = polar(dirCurrent, r - 2);
        const base1 = polar(dirCurrent - 5, r - 18);
        const base2 = polar(dirCurrent + 5, r - 18);
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
        fontSize={34}
        fill="#93c5fd"
        className="tabular-nums"
      >
        <tspan>{dirStr === '--' ? '' : dirStr}</tspan>
        <tspan dx={10}>{speedStr}</tspan>
        <tspan dx={8} fontSize={15} fontWeight="500">
          {windUnitLabel}
        </tspan>
      </text>
    </svg>
  );
}

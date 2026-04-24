import { useUnitFormatters } from '../../lib/weatherUnits';

interface Props {
  dirCurrent: number | null;
  dirAvg: number | null; // unused — kept for API compatibility
  speed: number | null;
  gust: number | null;   // unused — kept for API compatibility
  size?: number;
}

// Clean compass: ring, 8 cardinal labels, one marker sitting OUTSIDE the
// ring pointing inward to the direction wind is FROM, and just the speed
// in the middle (the cardinal direction is shown above the compass in the
// card header instead).
export default function WindCompass({ dirCurrent, speed, size = 240 }: Props) {
  const { fmtWindNum, windUnitLabel } = useUnitFormatters();

  const V = 240;
  const cx = V / 2;
  const cy = V / 2;
  const r = V / 2 - 24; // leave a bit more headroom for the outside marker

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

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${V} ${V}`}
      className="max-w-full h-auto overflow-visible"
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

      {/* Single marker OUTSIDE the ring, tip pointing inward toward the
          direction wind is coming FROM. */}
      {dirCurrent !== null && dirCurrent !== undefined && (() => {
        const tip = polar(dirCurrent, r + 3);       // nearly touching ring
        const base1 = polar(dirCurrent - 5, r + 16); // outer base, slight spread
        const base2 = polar(dirCurrent + 5, r + 16);
        return (
          <polygon
            points={`${tip.x},${tip.y} ${base1.x},${base1.y} ${base2.x},${base2.y}`}
            fill="#60a5fa"
          />
        );
      })()}

      {/* Center readout — speed + unit only, no cardinal letters. */}
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="central"
        fontWeight="700"
        fontSize={42}
        fill="#93c5fd"
        className="tabular-nums"
      >
        <tspan>{speedStr}</tspan>
        <tspan dx={8} fontSize={17} fontWeight="500">
          {windUnitLabel}
        </tspan>
      </text>
    </svg>
  );
}

import { compassFromDegrees } from '../../lib/weatherService';
import { useUnitFormatters } from '../../lib/weatherUnits';

interface Props {
  dirCurrent: number | null;
  dirAvg: number | null; // kept for API compatibility; not rendered
  speed: number | null;
  gust: number | null;   // kept for API compatibility; not rendered
  size?: number;
}

// Clean WeatherLink-console style compass:
//  - 8 cardinal labels (N, NE, E, SE, S, SW, W, NW) around the outer ring
//  - single small arrow marker pointing to the direction wind is FROM
//  - horizontal readout in the center: DIR | SPEED | UNIT
//  - no second arrow, no gust on the face — gust lives in the adjacent data
//    rows where there's room for context.
export default function WindCompass({ dirCurrent, speed, size = 180 }: Props) {
  const { fmtWindNum, windUnitLabel } = useUnitFormatters();
  const cx = size / 2;
  const cy = size / 2;
  const outerPad = size < 150 ? 16 : 18;
  const r = size / 2 - outerPad;

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

  // Responsive sizes.
  const centerFont = size < 140 ? 14 : size < 170 ? 18 : 22;
  const cardinalFont = size < 140 ? 9 : 10;
  const subFont = size < 140 ? 7 : 8;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Outer ring */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="rgba(255,255,255,0.03)"
        stroke="rgba(255,255,255,0.18)"
        strokeWidth="1"
      />

      {/* Faint inner guide */}
      <circle cx={cx} cy={cy} r={r - 6} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />

      {/* Cardinal tick marks — small dashes at each of the 8 directions */}
      {cardinals.map((c) => {
        const outer = polar(c.deg, r);
        const inner = polar(c.deg, r - (c.label.length === 1 ? 6 : 4));
        return (
          <line
            key={`tick-${c.deg}`}
            x1={outer.x}
            y1={outer.y}
            x2={inner.x}
            y2={inner.y}
            stroke="rgba(255,255,255,0.25)"
            strokeWidth={c.label.length === 1 ? 1.5 : 1}
          />
        );
      })}

      {/* Cardinal labels — just inside the ring so they sit within the circle */}
      {cardinals.map((c) => {
        const p = polar(c.deg, r - 14);
        return (
          <text
            key={`label-${c.label}`}
            x={p.x}
            y={p.y}
            textAnchor="middle"
            dominantBaseline="central"
            fill={c.label === 'N' ? '#f87171' : 'rgba(255,255,255,0.55)'}
            fontSize={c.label.length === 1 ? cardinalFont + 1 : cardinalFont}
            fontWeight="600"
          >
            {c.label}
          </text>
        );
      })}

      {/* Single direction marker — small arrow sitting just inside the ring,
          points TOWARD center from the direction wind is coming FROM. */}
      {dirCurrent !== null && dirCurrent !== undefined && (() => {
        const tipR = r - 22;
        const baseR = r - 4;
        const tip = polar(dirCurrent, tipR);
        const base1 = polar(dirCurrent - 6, baseR);
        const base2 = polar(dirCurrent + 6, baseR);
        return (
          <polygon
            points={`${tip.x},${tip.y} ${base1.x},${base1.y} ${base2.x},${base2.y}`}
            fill="#60a5fa"
            stroke="#3b82f6"
            strokeWidth="1"
          />
        );
      })()}

      {/* Horizontal center readout: DIR · SPEED · UNIT */}
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="central"
        fill="white"
        fontSize={centerFont}
        fontWeight="700"
        className="tabular-nums"
      >
        <tspan fill="rgba(147,197,253,0.9)">{dirStr === '--' ? '' : dirStr}</tspan>
        {dirStr !== '--' && <tspan fill="rgba(255,255,255,0.4)"> · </tspan>}
        <tspan>{speedStr}</tspan>
        <tspan fill="rgba(255,255,255,0.5)" fontSize={centerFont - 6} fontWeight="500">
          {' '}
          {windUnitLabel}
        </tspan>
      </text>

      {/* Degree readout below */}
      {dirCurrent !== null && dirCurrent !== undefined && (
        <text
          x={cx}
          y={cy + centerFont}
          textAnchor="middle"
          fontSize={subFont}
          fill="rgba(255,255,255,0.35)"
          className="tabular-nums"
        >
          {Math.round(dirCurrent)}°
        </text>
      )}
    </svg>
  );
}

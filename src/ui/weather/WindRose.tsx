import { useMemo } from 'react';
import type { WeatherReading } from '../../lib/weatherService';
import { convertWind, useWeatherUnitsStore } from '../../lib/weatherUnits';

interface Props {
  rows: WeatherReading[];
  size?: number;
}

// Polar histogram (wind rose) — 16 cardinal bins, stacked by speed category.
// Each wedge's radial length = frequency; colors show speed buckets.
export default function WindRose({ rows, size = 280 }: Props) {
  const windUnit = useWeatherUnitsStore((s) => s.wind);

  const data = useMemo(() => {
    const BINS = 16;
    // Speed categories in mph (source units). We display converted for legend.
    const CATEGORIES: { min: number; max: number; color: string }[] = [
      { min: 0, max: 3, color: '#1e3a8a' },
      { min: 3, max: 7, color: '#2563eb' },
      { min: 7, max: 12, color: '#22c55e' },
      { min: 12, max: 20, color: '#facc15' },
      { min: 20, max: 30, color: '#f97316' },
      { min: 30, max: Infinity, color: '#ef4444' },
    ];
    // bins[dirBin][catIndex] = count
    const bins: number[][] = Array.from({ length: BINS }, () => CATEGORIES.map(() => 0));
    let total = 0;
    let calms = 0;
    for (const r of rows) {
      const speed = r.wind_speed_avg_last_10_min ?? r.wind_speed_last;
      const dir = r.wind_dir_scalar_avg_last_10_min ?? r.wind_dir_last;
      if (speed === null || speed === undefined) continue;
      if (speed < 0.5) {
        calms++;
        total++;
        continue;
      }
      if (dir === null || dir === undefined) continue;
      const binIdx = Math.round(((dir % 360) / (360 / BINS))) % BINS;
      let catIdx = CATEGORIES.findIndex((c) => speed >= c.min && speed < c.max);
      if (catIdx === -1) catIdx = CATEGORIES.length - 1;
      bins[binIdx][catIdx]++;
      total++;
    }
    // Max bin total
    let maxBinTotal = 0;
    for (const b of bins) {
      const sum = b.reduce((a, c) => a + c, 0);
      if (sum > maxBinTotal) maxBinTotal = sum;
    }
    return { bins, categories: CATEGORIES, maxBinTotal, total, calms, BINS };
  }, [rows]);

  if (data.total === 0) {
    return (
      <div className="bg-white/5 rounded-xl border border-white/10 p-4">
        <div className="text-xs uppercase tracking-wide text-white/40 mb-3 font-semibold">Wind Rose (24h)</div>
        <div className="text-sm text-white/30 py-8 text-center italic">Not enough wind data yet.</div>
      </div>
    );
  }

  const cx = size / 2;
  const cy = size / 2;
  const maxR = size / 2 - 28;

  const wedgeAngle = (2 * Math.PI) / data.BINS;
  const arc = wedgeAngle * 0.85;

  const polar = (angle: number, r: number) => ({
    x: cx + r * Math.cos(angle - Math.PI / 2),
    y: cy + r * Math.sin(angle - Math.PI / 2),
  });

  // Rings at 25/50/75/100% of max
  const rings = [0.25, 0.5, 0.75, 1];

  const cardinals = ['N', 'E', 'S', 'W'];

  return (
    <div className="bg-white/5 rounded-xl border border-white/10 p-4">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="text-xs uppercase tracking-wide text-white/40 font-semibold">Wind Rose (24h)</div>
        <div className="text-[10px] text-white/40">
          {data.total} obs · {Math.round((data.calms / data.total) * 100)}% calm
        </div>
      </div>
      <div className="flex items-center justify-center gap-4 flex-wrap">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Rings */}
          {rings.map((f) => (
            <circle
              key={f}
              cx={cx}
              cy={cy}
              r={maxR * f}
              fill="none"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="1"
            />
          ))}
          {/* Cross lines */}
          {[0, 90, 180, 270].map((deg) => {
            const p1 = polar((deg * Math.PI) / 180, 0);
            const p2 = polar((deg * Math.PI) / 180, maxR);
            return (
              <line
                key={deg}
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke="rgba(255,255,255,0.05)"
              />
            );
          })}
          {/* Wedges */}
          {data.bins.map((bin, i) => {
            const angle = i * wedgeAngle;
            const start = angle - arc / 2;
            const end = angle + arc / 2;
            let stackR = 0;
            const segments: JSX.Element[] = [];
            bin.forEach((count, catIdx) => {
              if (count === 0) return;
              const frac = count / data.maxBinTotal;
              const innerR = stackR * maxR;
              const outerR = (stackR + frac) * maxR;
              const p1 = polar(start, innerR);
              const p2 = polar(start, outerR);
              const p3 = polar(end, outerR);
              const p4 = polar(end, innerR);
              const d = `M ${p1.x.toFixed(1)} ${p1.y.toFixed(1)} L ${p2.x.toFixed(1)} ${p2.y.toFixed(1)} A ${outerR.toFixed(1)} ${outerR.toFixed(1)} 0 0 1 ${p3.x.toFixed(1)} ${p3.y.toFixed(1)} L ${p4.x.toFixed(1)} ${p4.y.toFixed(1)} ${innerR > 0 ? `A ${innerR.toFixed(1)} ${innerR.toFixed(1)} 0 0 0 ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}` : ''} Z`;
              segments.push(
                <path
                  key={`${i}-${catIdx}`}
                  d={d}
                  fill={data.categories[catIdx].color}
                  opacity={0.85}
                  stroke="rgba(0,0,0,0.2)"
                  strokeWidth="0.5"
                />,
              );
              stackR += frac;
            });
            return <g key={i}>{segments}</g>;
          })}
          {/* Cardinal labels */}
          {cardinals.map((c, i) => {
            const angle = (i * 90 * Math.PI) / 180;
            const p = polar(angle, maxR + 14);
            return (
              <text
                key={c}
                x={p.x}
                y={p.y + 3}
                textAnchor="middle"
                fontSize="11"
                fontWeight="600"
                fill={c === 'N' ? '#f87171' : 'rgba(255,255,255,0.6)'}
              >
                {c}
              </text>
            );
          })}
          {/* Max-ring percent label */}
          <text x={cx + 2} y={cy - maxR - 2} fontSize="8" fill="rgba(255,255,255,0.35)">
            {Math.round((data.maxBinTotal / data.total) * 100)}%
          </text>
        </svg>
        <div className="text-[10px] space-y-1">
          <div className="text-white/40 uppercase tracking-wide font-semibold mb-1">Speed</div>
          {data.categories.map((c, i) => {
            const lo = convertWind(c.min, windUnit);
            const hi = Number.isFinite(c.max) ? convertWind(c.max, windUnit) : null;
            const unitLabel = windUnit === 'ms' ? 'm/s' : windUnit;
            return (
              <div key={i} className="flex items-center gap-1.5 font-mono">
                <span className="w-3 h-3 rounded-sm" style={{ background: c.color, opacity: 0.85 }} />
                <span className="text-white/70">
                  {lo?.toFixed(0)}
                  {hi !== null ? `–${hi.toFixed(0)}` : '+'} {unitLabel}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

import { useMemo } from 'react';
import type { WeatherReading } from '../../lib/weatherService';
import { compassFromDegrees } from '../../lib/weatherService';
import { convertWind, useWeatherUnitsStore } from '../../lib/weatherUnits';

interface Props {
  rows: WeatherReading[];
  size?: number;
}

// Polar histogram — 16 cardinal bins, stacked by speed category. Bar lengths
// show what % of the time wind blew FROM that direction.
export default function WindRose({ rows, size = 280 }: Props) {
  const windUnit = useWeatherUnitsStore((s) => s.wind);
  const unitLabel = windUnit === 'ms' ? 'm/s' : windUnit;

  const data = useMemo(() => {
    const BINS = 16;
    // Friendly named buckets in mph (source units). Beaufort-ish.
    const CATEGORIES: { min: number; max: number; color: string; label: string }[] = [
      { min: 0.5, max: 7, color: '#60a5fa', label: 'Light' },
      { min: 7, max: 15, color: '#22c55e', label: 'Moderate' },
      { min: 15, max: 25, color: '#facc15', label: 'Strong' },
      { min: 25, max: Infinity, color: '#ef4444', label: 'Gale+' },
    ];
    const bins: number[][] = Array.from({ length: BINS }, () => CATEGORIES.map(() => 0));
    let total = 0;
    let calms = 0;
    let speedSum = 0;
    let speedCount = 0;
    let peakGust = 0;
    const dirCounts = Array(BINS).fill(0);
    for (const r of rows) {
      const speed = r.wind_speed_avg_last_10_min ?? r.wind_speed_last;
      const dir = r.wind_dir_scalar_avg_last_10_min ?? r.wind_dir_last;
      const gust = r.wind_speed_hi_last_10_min;
      if (gust !== null && gust !== undefined && gust > peakGust) peakGust = gust;
      if (speed === null || speed === undefined) continue;
      speedSum += speed;
      speedCount++;
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
      dirCounts[binIdx]++;
      total++;
    }
    let maxBinTotal = 0;
    for (const b of bins) {
      const sum = b.reduce((a, c) => a + c, 0);
      if (sum > maxBinTotal) maxBinTotal = sum;
    }
    // Prevailing direction = bin with most observations
    let prevailingBin = -1;
    let prevailingMax = 0;
    for (let i = 0; i < BINS; i++) {
      if (dirCounts[i] > prevailingMax) {
        prevailingMax = dirCounts[i];
        prevailingBin = i;
      }
    }
    const prevailingDir = prevailingBin >= 0 ? prevailingBin * (360 / BINS) : null;
    const avgSpeed = speedCount > 0 ? speedSum / speedCount : null;
    return {
      bins,
      categories: CATEGORIES,
      maxBinTotal,
      total,
      calms,
      BINS,
      prevailingDir,
      avgSpeed,
      peakGust,
    };
  }, [rows]);

  if (data.total === 0) {
    return (
      <div className="bg-slate-900/85 backdrop-blur-sm rounded-xl border border-white/10 p-4">
        <div className="text-xs uppercase tracking-wide text-white/40 mb-3 font-semibold">
          Wind Rose &middot; 24h
        </div>
        <div className="text-sm text-white/30 py-8 text-center italic">Not enough wind data yet.</div>
      </div>
    );
  }

  const cx = size / 2;
  const cy = size / 2;
  const maxR = size / 2 - 32;

  const wedgeAngle = (2 * Math.PI) / data.BINS;
  const arc = wedgeAngle * 0.85;

  const polar = (angle: number, r: number) => ({
    x: cx + r * Math.cos(angle - Math.PI / 2),
    y: cy + r * Math.sin(angle - Math.PI / 2),
  });

  const rings = [0.25, 0.5, 0.75, 1];
  const directions8 = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

  const calmPct = Math.round((data.calms / data.total) * 100);
  const maxPct = Math.round((data.maxBinTotal / data.total) * 100);

  const fmtSpeed = (v: number | null) => (v === null ? '--' : `${(convertWind(v, windUnit) ?? 0).toFixed(1)} ${unitLabel}`);

  return (
    <div className="bg-slate-900/85 backdrop-blur-sm rounded-xl border border-white/10 p-4">
      {/* Header */}
      <div className="flex items-baseline justify-between mb-1 flex-wrap gap-2">
        <div className="text-xs uppercase tracking-wide text-white/40 font-semibold">
          Wind Rose &middot; 24h
        </div>
        <div className="text-[10px] text-white/40">{data.total} obs</div>
      </div>

      {/* Plain-English summary */}
      {data.prevailingDir !== null && (
        <div className="text-xs text-white/70 mb-3">
          Wind mostly from{' '}
          <span className="text-amber-300 font-semibold">{compassFromDegrees(data.prevailingDir)}</span>
          {data.avgSpeed !== null && (
            <>
              {' '}&middot; avg <span className="text-white font-mono">{fmtSpeed(data.avgSpeed)}</span>
            </>
          )}
          {data.peakGust > 0 && (
            <>
              {' '}&middot; peak gust <span className="text-amber-300 font-mono">{fmtSpeed(data.peakGust)}</span>
            </>
          )}
        </div>
      )}

      <div className="flex items-center justify-center gap-4 flex-wrap">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Rings + percent labels on N axis */}
          {rings.map((f) => (
            <g key={f}>
              <circle
                cx={cx}
                cy={cy}
                r={maxR * f}
                fill="none"
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="1"
                strokeDasharray={f === 1 ? '' : '2 3'}
              />
              <text
                x={cx + 3}
                y={cy - maxR * f - 2}
                fontSize="8"
                fill="rgba(255,255,255,0.3)"
                fontFamily="monospace"
              >
                {Math.round(f * maxPct)}%
              </text>
            </g>
          ))}

          {/* 8 direction lines */}
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
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

          {/* Wedges (percent of total observations) */}
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
                  stroke="rgba(0,0,0,0.25)"
                  strokeWidth="0.5"
                />,
              );
              stackR += frac;
            });
            return <g key={i}>{segments}</g>;
          })}

          {/* Prevailing direction marker — arrow pointing FROM that direction */}
          {data.prevailingDir !== null && (() => {
            const angle = (data.prevailingDir * Math.PI) / 180;
            const tip = polar(angle, maxR + 8);
            const back = polar(angle, maxR + 18);
            const left = polar(angle - 0.15, maxR + 14);
            const right = polar(angle + 0.15, maxR + 14);
            return (
              <polygon
                points={`${tip.x},${tip.y} ${left.x},${left.y} ${back.x},${back.y} ${right.x},${right.y}`}
                fill="#fbbf24"
                stroke="#f59e0b"
                strokeWidth="0.5"
              />
            );
          })()}

          {/* 8 cardinal labels */}
          {directions8.map((c, i) => {
            const angle = (i * 45 * Math.PI) / 180;
            const p = polar(angle, maxR + 22);
            return (
              <text
                key={c}
                x={p.x}
                y={p.y + 3}
                textAnchor="middle"
                fontSize={c.length === 1 ? '12' : '10'}
                fontWeight="600"
                fill={c === 'N' ? '#f87171' : 'rgba(255,255,255,0.65)'}
              >
                {c}
              </text>
            );
          })}

          {/* Calm % at center */}
          {calmPct > 0 && (
            <g>
              <circle cx={cx} cy={cy} r={14} fill="rgba(0,0,0,0.4)" stroke="rgba(255,255,255,0.15)" />
              <text x={cx} y={cy - 1} textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.7)" fontFamily="monospace">
                {calmPct}%
              </text>
              <text x={cx} y={cy + 9} textAnchor="middle" fontSize="7" fill="rgba(255,255,255,0.4)">
                calm
              </text>
            </g>
          )}
        </svg>

        {/* Legend */}
        <div className="text-[11px] space-y-1.5 min-w-[110px]">
          <div className="text-white/40 uppercase tracking-wide font-semibold mb-1 text-[10px]">Speed</div>
          {data.categories.map((c, i) => {
            const lo = convertWind(c.min, windUnit) ?? 0;
            const hi = Number.isFinite(c.max) ? convertWind(c.max, windUnit) : null;
            return (
              <div key={i} className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: c.color, opacity: 0.85 }} />
                <div className="flex flex-col leading-tight">
                  <span className="text-white/80">{c.label}</span>
                  <span className="text-white/40 font-mono text-[10px]">
                    {lo.toFixed(0)}{hi !== null ? `–${hi.toFixed(0)}` : '+'} {unitLabel}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* How-to-read note */}
      <div className="mt-3 pt-3 border-t border-white/5 text-[10px] text-white/40 leading-relaxed">
        Each spoke shows wind blowing <span className="text-white/60 font-medium">from</span> that direction.
        Longer spokes = more frequent. Color = speed.
        {' '}<span className="text-amber-300">Gold arrow</span> = prevailing direction.
      </div>
    </div>
  );
}

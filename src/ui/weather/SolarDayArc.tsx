import { useMemo } from 'react';
import type { WeatherReading } from '../../lib/weatherService';
import { getSunTimes } from '../../lib/astronomy';

interface Props {
  rows: WeatherReading[]; // today's readings with solar_rad + uv_index
  lat: number | null;
  lon: number | null;
}

// Plots solar radiation across the day as a shaded area, with current UV index
// overlay and peak-time marker.
export default function SolarDayArc({ rows, lat, lon }: Props) {
  const data = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const dd = now.getDate();
    const startOfDay = new Date(y, m, dd, 0, 0, 0).getTime();
    const endOfDay = startOfDay + 24 * 3600_000;

    const pts: { t: number; solar: number | null; uv: number | null }[] = [];
    let peak: { t: number; v: number } | null = null;
    let currentSolar: number | null = null;
    let currentUv: number | null = null;
    let lastT = 0;
    for (const r of rows) {
      const t = new Date(r.observed_at).getTime();
      if (t < startOfDay || t > endOfDay) continue;
      pts.push({ t, solar: r.solar_rad, uv: r.uv_index });
      if (r.solar_rad !== null && (peak === null || r.solar_rad > peak.v)) {
        peak = { t, v: r.solar_rad };
      }
      if (t > lastT) {
        lastT = t;
        currentSolar = r.solar_rad;
        currentUv = r.uv_index;
      }
    }

    const sun = lat !== null && lon !== null ? getSunTimes(now, lat, lon) : null;
    return { pts, peak, currentSolar, currentUv, sun, startOfDay, endOfDay, now };
  }, [rows, lat, lon]);

  if (data.pts.length < 2 || data.pts.every((p) => p.solar === null)) {
    return null;
  }

  const width = 600;
  const height = 160;
  const padL = 30;
  const padR = 12;
  const padT = 8;
  const padB = 24;

  let maxSolar = 100;
  for (const p of data.pts) if (p.solar !== null && p.solar > maxSolar) maxSolar = p.solar;
  maxSolar = Math.ceil(maxSolar / 100) * 100;

  const xs = (t: number) =>
    padL + ((t - data.startOfDay) / (data.endOfDay - data.startOfDay)) * (width - padL - padR);
  const ys = (v: number) => padT + (1 - v / maxSolar) * (height - padT - padB);

  // Build area path
  let d = `M ${padL} ${height - padB} `;
  let first = true;
  for (const p of data.pts) {
    if (p.solar === null) continue;
    if (first) {
      d += `L ${xs(p.t).toFixed(1)} ${ys(p.solar).toFixed(1)} `;
      first = false;
    } else {
      d += `L ${xs(p.t).toFixed(1)} ${ys(p.solar).toFixed(1)} `;
    }
  }
  const lastPt = [...data.pts].reverse().find((p) => p.solar !== null);
  if (lastPt) d += `L ${xs(lastPt.t).toFixed(1)} ${height - padB} Z`;

  const peakTime = data.peak ? new Date(data.peak.t) : null;

  // UV risk color
  const uv = data.currentUv;
  const uvColor =
    uv === null
      ? 'text-white/40'
      : uv < 3
        ? 'text-green-400'
        : uv < 6
          ? 'text-amber-400'
          : uv < 8
            ? 'text-orange-400'
            : uv < 11
              ? 'text-red-400'
              : 'text-violet-400';
  const uvLabel =
    uv === null
      ? '--'
      : uv < 3
        ? 'Low'
        : uv < 6
          ? 'Moderate'
          : uv < 8
            ? 'High'
            : uv < 11
              ? 'Very High'
              : 'Extreme';

  return (
    <div className="bg-white/5 rounded-xl border border-white/10 p-4">
      <div className="flex items-start justify-between mb-2 gap-3 flex-wrap">
        <div className="text-xs uppercase tracking-wide text-white/40 font-semibold">
          Today's Solar
        </div>
        <div className="flex gap-4 text-xs">
          <div>
            <span className="text-white/40">Now: </span>
            <span className="font-mono text-white">
              {data.currentSolar !== null ? `${data.currentSolar.toFixed(0)} W/m²` : '--'}
            </span>
          </div>
          <div>
            <span className="text-white/40">UV: </span>
            <span className={`font-mono font-semibold ${uvColor}`}>
              {uv !== null ? uv.toFixed(1) : '--'}
            </span>
            <span className={`ml-1 text-[10px] ${uvColor}`}>{uvLabel}</span>
          </div>
        </div>
      </div>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
        <defs>
          <linearGradient id="solarGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(251,191,36,0.6)" />
            <stop offset="100%" stopColor="rgba(251,191,36,0.02)" />
          </linearGradient>
        </defs>
        {/* Daylight band */}
        {data.sun?.sunrise && data.sun?.sunset && (
          <rect
            x={xs(data.sun.sunrise.getTime())}
            y={padT}
            width={xs(data.sun.sunset.getTime()) - xs(data.sun.sunrise.getTime())}
            height={height - padT - padB}
            fill="rgba(251,191,36,0.03)"
          />
        )}
        {/* Y grid */}
        {[0, 0.25, 0.5, 0.75, 1].map((f) => {
          const v = maxSolar * (1 - f);
          const y = padT + f * (height - padT - padB);
          return (
            <g key={f}>
              <line x1={padL} x2={width - padR} y1={y} y2={y} stroke="rgba(255,255,255,0.05)" />
              <text x={padL - 4} y={y + 3} textAnchor="end" fontSize="8" fill="rgba(255,255,255,0.35)">
                {v.toFixed(0)}
              </text>
            </g>
          );
        })}
        {/* Area */}
        <path d={d} fill="url(#solarGrad)" stroke="rgba(251,191,36,0.8)" strokeWidth="1.5" />
        {/* Peak marker */}
        {data.peak && peakTime && (
          <g>
            <line
              x1={xs(data.peak.t)}
              x2={xs(data.peak.t)}
              y1={ys(data.peak.v)}
              y2={height - padB}
              stroke="rgba(251,191,36,0.4)"
              strokeDasharray="2 3"
            />
            <circle cx={xs(data.peak.t)} cy={ys(data.peak.v)} r={3} fill="#fbbf24" />
            <text
              x={xs(data.peak.t)}
              y={ys(data.peak.v) - 6}
              textAnchor="middle"
              fontSize="9"
              fill="#fbbf24"
            >
              Peak {data.peak.v.toFixed(0)}
            </text>
          </g>
        )}
        {/* "Now" marker */}
        {data.now.getTime() <= data.endOfDay && (
          <line
            x1={xs(data.now.getTime())}
            x2={xs(data.now.getTime())}
            y1={padT}
            y2={height - padB}
            stroke="rgba(255,255,255,0.3)"
            strokeDasharray="2 2"
          />
        )}
        {/* Hour labels */}
        {[6, 9, 12, 15, 18].map((h) => {
          const t = data.startOfDay + h * 3600_000;
          return (
            <text
              key={h}
              x={xs(t)}
              y={height - 6}
              textAnchor="middle"
              fontSize="9"
              fill="rgba(255,255,255,0.4)"
            >
              {h}:00
            </text>
          );
        })}
      </svg>
      {peakTime && (
        <div className="text-[10px] text-white/40 mt-1">
          Peak at {peakTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
          {data.peak && ` · ${data.peak.v.toFixed(0)} W/m²`}
        </div>
      )}
    </div>
  );
}

import { useMemo, useState } from 'react';

export interface Series {
  label: string;
  color: string;
  points: { t: number; v: number | null }[];
}

interface Props {
  series: Series[];
  height?: number;
  yUnit?: string;
  yDomain?: [number, number];
  formatY?: (v: number) => string;
  formatX?: (ts: number) => string;
}

export default function LineChart({
  series,
  height = 220,
  yUnit = '',
  yDomain,
  formatY,
  formatX,
}: Props) {
  const [hoverX, setHoverX] = useState<number | null>(null);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const PAD_L = 44;
  const PAD_R = 12;
  const PAD_T = 12;
  const PAD_B = 28;
  const [width, setWidth] = useState(800);

  const visibleSeries = useMemo(() => series.filter((s) => !hidden.has(s.label)), [series, hidden]);

  const { minT, maxT, minY, maxY } = useMemo(() => {
    let minT = Infinity;
    let maxT = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const s of visibleSeries) {
      for (const p of s.points) {
        if (p.t < minT) minT = p.t;
        if (p.t > maxT) maxT = p.t;
        if (p.v !== null && p.v !== undefined && Number.isFinite(p.v)) {
          if (p.v < minY) minY = p.v;
          if (p.v > maxY) maxY = p.v;
        }
      }
    }
    if (yDomain) {
      minY = yDomain[0];
      maxY = yDomain[1];
    } else {
      if (!Number.isFinite(minY)) {
        minY = 0;
        maxY = 1;
      } else if (minY === maxY) {
        minY -= 1;
        maxY += 1;
      } else {
        const pad = (maxY - minY) * 0.08;
        minY -= pad;
        maxY += pad;
      }
    }
    if (!Number.isFinite(minT)) {
      minT = Date.now() - 3600_000;
      maxT = Date.now();
    }
    return { minT, maxT, minY, maxY };
  }, [visibleSeries, yDomain]);

  const xScale = (t: number) => PAD_L + ((t - minT) / (maxT - minT || 1)) * (width - PAD_L - PAD_R);
  const yScale = (v: number) => PAD_T + (1 - (v - minY) / (maxY - minY || 1)) * (height - PAD_T - PAD_B);

  // Y axis ticks
  const yTicks = useMemo(() => {
    const ticks: number[] = [];
    for (let i = 0; i <= 4; i++) ticks.push(minY + ((maxY - minY) * i) / 4);
    return ticks;
  }, [minY, maxY]);

  // X axis ticks
  const xTicks = useMemo(() => {
    const ticks: number[] = [];
    for (let i = 0; i <= 5; i++) ticks.push(minT + ((maxT - minT) * i) / 5);
    return ticks;
  }, [minT, maxT]);

  const defaultFmtX = (ts: number) => {
    const span = maxT - minT;
    const d = new Date(ts);
    if (span < 48 * 3600_000) return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };
  const fmtY = formatY ?? ((v: number) => `${v.toFixed(1)}${yUnit}`);
  const fmtX = formatX ?? defaultFmtX;

  // Find closest point per series to hoverX (only for visible series)
  const hoverPoints = useMemo(() => {
    if (hoverX === null) return null;
    const tAtHover = minT + ((hoverX - PAD_L) / (width - PAD_L - PAD_R)) * (maxT - minT);
    return visibleSeries.map((s) => {
      let closest: { t: number; v: number | null } | null = null;
      let minDiff = Infinity;
      for (const p of s.points) {
        const d = Math.abs(p.t - tAtHover);
        if (d < minDiff) {
          minDiff = d;
          closest = p;
        }
      }
      return { label: s.label, color: s.color, point: closest };
    });
  }, [hoverX, visibleSeries, minT, maxT, width]);

  // Build smooth path for each series
  function buildPath(points: { t: number; v: number | null }[]): string {
    let d = '';
    let penDown = false;
    for (const p of points) {
      if (p.v === null || p.v === undefined || !Number.isFinite(p.v)) {
        penDown = false;
        continue;
      }
      const x = xScale(p.t);
      const y = yScale(p.v);
      if (!penDown) {
        d += `M ${x.toFixed(1)} ${y.toFixed(1)} `;
        penDown = true;
      } else {
        d += `L ${x.toFixed(1)} ${y.toFixed(1)} `;
      }
    }
    return d;
  }

  return (
    <div
      ref={(el) => {
        if (el && el.clientWidth !== width) setWidth(el.clientWidth);
      }}
      className="relative w-full"
      style={{ height }}
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        if (x >= PAD_L && x <= width - PAD_R) setHoverX(x);
        else setHoverX(null);
      }}
      onMouseLeave={() => setHoverX(null)}
    >
      <svg width={width} height={height} style={{ display: 'block' }}>
        {/* Y grid */}
        {yTicks.map((y) => (
          <g key={y}>
            <line
              x1={PAD_L}
              x2={width - PAD_R}
              y1={yScale(y)}
              y2={yScale(y)}
              stroke="rgba(255,255,255,0.06)"
            />
            <text x={PAD_L - 6} y={yScale(y) + 3} fontSize="9" fill="rgba(255,255,255,0.4)" textAnchor="end">
              {fmtY(y)}
            </text>
          </g>
        ))}
        {/* X ticks */}
        {xTicks.map((t) => (
          <text
            key={t}
            x={xScale(t)}
            y={height - 10}
            fontSize="9"
            fill="rgba(255,255,255,0.4)"
            textAnchor="middle"
          >
            {fmtX(t)}
          </text>
        ))}
        {/* Series (only the visible ones) */}
        {visibleSeries.map((s, i) => (
          <path
            key={`${s.label}-${i}`}
            d={buildPath(s.points)}
            fill="none"
            stroke={s.color}
            strokeWidth="1.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}
        {/* Hover line and dots */}
        {hoverX !== null && (
          <line x1={hoverX} x2={hoverX} y1={PAD_T} y2={height - PAD_B} stroke="rgba(255,255,255,0.2)" />
        )}
        {hoverPoints?.map((hp, i) =>
          hp.point && hp.point.v !== null ? (
            <circle
              key={i}
              cx={xScale(hp.point.t)}
              cy={yScale(hp.point.v)}
              r={3.5}
              fill={hp.color}
              stroke="#0b0b0d"
              strokeWidth="1.5"
            />
          ) : null,
        )}
      </svg>

      {/* Hover tooltip */}
      {hoverX !== null && hoverPoints && hoverPoints[0]?.point && (
        <div
          className="absolute pointer-events-none bg-black/80 border border-white/10 rounded-lg px-2.5 py-1.5 text-[11px] whitespace-nowrap"
          style={{
            left: Math.min(hoverX + 10, width - 160),
            top: 4,
          }}
        >
          <div className="text-white/50 mb-0.5">{fmtX(hoverPoints[0].point.t)}</div>
          {hoverPoints.map((hp) => (
            <div key={hp.label} className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ background: hp.color }} />
              <span className="text-white/60">{hp.label}</span>
              <span className="text-white font-mono ml-auto">
                {hp.point && hp.point.v !== null ? fmtY(hp.point.v) : '--'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Legend — tap any series to toggle visibility. Sized as proper
          tap targets so it works on mobile without zooming. */}
      {series.length > 1 && (
        <div className="flex flex-wrap gap-2 mt-2 px-1">
          {series.map((s) => {
            const isHidden = hidden.has(s.label);
            return (
              <button
                key={s.label}
                type="button"
                onClick={() => {
                  setHidden((prev) => {
                    const next = new Set(prev);
                    if (next.has(s.label)) next.delete(s.label);
                    else next.add(s.label);
                    return next;
                  });
                }}
                title={isHidden ? `Show ${s.label}` : `Hide ${s.label}`}
                className={`flex items-center gap-2 text-xs cursor-pointer select-none transition-all rounded-full px-3 py-1.5 border ${
                  isHidden
                    ? 'opacity-50 line-through border-white/10 bg-white/0'
                    : 'opacity-100 border-white/15 bg-white/5 hover:bg-white/10'
                }`}
              >
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ background: isHidden ? 'rgba(255,255,255,0.25)' : s.color }}
                />
                <span className={isHidden ? 'text-white/50' : 'text-white/85'}>{s.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

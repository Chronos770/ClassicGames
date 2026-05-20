import { useMemo, useRef, useState } from 'react';

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

// Group consecutive non-null points into runs. Each run gets its own smooth
// path so a null gap doesn't drag a curve across the chart.
function runs(points: { t: number; v: number | null }[]): { t: number; v: number }[][] {
  const out: { t: number; v: number }[][] = [];
  let cur: { t: number; v: number }[] = [];
  for (const p of points) {
    if (p.v === null || p.v === undefined || !Number.isFinite(p.v)) {
      if (cur.length) out.push(cur);
      cur = [];
    } else {
      cur.push({ t: p.t, v: p.v });
    }
  }
  if (cur.length) out.push(cur);
  return out;
}

// Catmull-Rom → cubic Bezier path. Tension 0.5 gives a gentle smoothing
// without overshooting like a true spline would.
function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return '';
  if (pts.length === 1) return `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  const tension = 0.5;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1.x + ((p2.x - p0.x) / 6) * tension * 2;
    const c1y = p1.y + ((p2.y - p0.y) / 6) * tension * 2;
    const c2x = p2.x - ((p3.x - p1.x) / 6) * tension * 2;
    const c2y = p2.y - ((p3.y - p1.y) / 6) * tension * 2;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

export default function LineChart({
  series,
  height = 240,
  yUnit = '',
  yDomain,
  formatY,
  formatX,
}: Props) {
  const [hoverX, setHoverX] = useState<number | null>(null);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const PAD_L = 44;
  const PAD_R = 12;
  const PAD_T = 10;
  const PAD_B = 26;
  const [width, setWidth] = useState(800);
  const containerRef = useRef<HTMLDivElement | null>(null);

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

  const yTicks = useMemo(() => {
    const ticks: number[] = [];
    for (let i = 0; i <= 4; i++) ticks.push(minY + ((maxY - minY) * i) / 4);
    return ticks;
  }, [minY, maxY]);

  const xTicks = useMemo(() => {
    // Fewer ticks on narrow screens to avoid overlap
    const count = width < 480 ? 3 : width < 720 ? 4 : 5;
    const ticks: number[] = [];
    for (let i = 0; i <= count; i++) ticks.push(minT + ((maxT - minT) * i) / count);
    return ticks;
  }, [minT, maxT, width]);

  const defaultFmtX = (ts: number) => {
    const span = maxT - minT;
    const d = new Date(ts);
    if (span < 48 * 3600_000) return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };
  const fmtY = formatY ?? ((v: number) => `${v.toFixed(1)}${yUnit}`);
  const fmtX = formatX ?? defaultFmtX;

  // Pre-build runs (continuous segments) per series in screen coordinates
  const seriesRuns = useMemo(() => {
    return visibleSeries.map((s) => ({
      ...s,
      runs: runs(s.points).map((run) => run.map((p) => ({ x: xScale(p.t), y: yScale(p.v) }))),
    }));
    // xScale/yScale closures depend on width/min/max — listing visibleSeries
    // and the scales' inputs covers all the dependencies.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleSeries, width, minT, maxT, minY, maxY, height]);

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

  const baselineY = yScale(Math.max(minY, 0));

  // Pointer handler shared by mouse + touch
  const handlePointer = (clientX: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = clientX - rect.left;
    if (x >= PAD_L && x <= width - PAD_R) setHoverX(x);
    else setHoverX(null);
  };

  // Stable id for the gradient defs so multiple charts on the page don't collide
  const gradId = useMemo(() => `lc-grad-${Math.random().toString(36).slice(2, 8)}`, []);

  return (
    <div className="w-full">
      <div
        ref={(el) => {
          containerRef.current = el;
          if (el && el.clientWidth !== width) setWidth(el.clientWidth);
        }}
        className="relative w-full select-none"
        style={{ height }}
        onMouseMove={(e) => handlePointer(e.clientX)}
        onMouseLeave={() => setHoverX(null)}
        onTouchStart={(e) => e.touches[0] && handlePointer(e.touches[0].clientX)}
        onTouchMove={(e) => e.touches[0] && handlePointer(e.touches[0].clientX)}
        onTouchEnd={() => setHoverX(null)}
      >
        <svg width={width} height={height} style={{ display: 'block' }}>
          <defs>
            {seriesRuns.map((s, i) => (
              <linearGradient id={`${gradId}-${i}`} key={s.label} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity="0.32" />
                <stop offset="100%" stopColor={s.color} stopOpacity="0" />
              </linearGradient>
            ))}
          </defs>

          {/* Y grid */}
          {yTicks.map((y) => (
            <g key={y}>
              <line
                x1={PAD_L}
                x2={width - PAD_R}
                y1={yScale(y)}
                y2={yScale(y)}
                stroke="rgba(255,255,255,0.05)"
                strokeDasharray="2 4"
              />
              <text
                x={PAD_L - 6}
                y={yScale(y) + 3}
                fontSize="10"
                fill="rgba(255,255,255,0.45)"
                textAnchor="end"
              >
                {fmtY(y)}
              </text>
            </g>
          ))}

          {/* X ticks */}
          {xTicks.map((t) => (
            <text
              key={t}
              x={xScale(t)}
              y={height - 8}
              fontSize="10"
              fill="rgba(255,255,255,0.45)"
              textAnchor="middle"
            >
              {fmtX(t)}
            </text>
          ))}

          {/* Area fills (only when single series for visual clarity) */}
          {seriesRuns.length === 1 &&
            seriesRuns[0].runs.map((run, ri) => {
              if (run.length < 2) return null;
              const linePath = smoothPath(run);
              const areaPath = `${linePath} L ${run[run.length - 1].x.toFixed(1)} ${baselineY.toFixed(1)} L ${run[0].x.toFixed(1)} ${baselineY.toFixed(1)} Z`;
              return (
                <path
                  key={`area-${ri}`}
                  d={areaPath}
                  fill={`url(#${gradId}-0)`}
                  stroke="none"
                />
              );
            })}

          {/* Lines */}
          {seriesRuns.map((s, i) =>
            s.runs.map((run, ri) => (
              <path
                key={`line-${i}-${ri}`}
                d={run.length === 1
                  ? `M ${run[0].x - 1.5} ${run[0].y} L ${run[0].x + 1.5} ${run[0].y}`
                  : smoothPath(run)
                }
                fill="none"
                stroke={s.color}
                strokeWidth={run.length === 1 ? 3 : 1.75}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            )),
          )}

          {/* Hover line and dots */}
          {hoverX !== null && (
            <line
              x1={hoverX}
              x2={hoverX}
              y1={PAD_T}
              y2={height - PAD_B}
              stroke="rgba(255,255,255,0.25)"
              strokeWidth="1"
            />
          )}
          {hoverPoints?.map((hp, i) =>
            hp.point && hp.point.v !== null ? (
              <g key={i}>
                <circle
                  cx={xScale(hp.point.t)}
                  cy={yScale(hp.point.v)}
                  r={5}
                  fill={hp.color}
                  fillOpacity="0.25"
                />
                <circle
                  cx={xScale(hp.point.t)}
                  cy={yScale(hp.point.v)}
                  r={3}
                  fill={hp.color}
                  stroke="#0b0b0d"
                  strokeWidth="1.5"
                />
              </g>
            ) : null,
          )}
        </svg>

        {/* Hover tooltip */}
        {hoverX !== null && hoverPoints && hoverPoints.some((hp) => hp.point) && (
          <div
            className="absolute pointer-events-none bg-slate-900/95 backdrop-blur-sm border border-white/10 rounded-lg px-3 py-2 text-[11px] whitespace-nowrap shadow-xl"
            style={{
              left: Math.min(Math.max(hoverX + 12, 8), Math.max(width - 200, 8)),
              top: 6,
            }}
          >
            <div className="text-white/55 mb-1 text-[10px] uppercase tracking-wide">
              {fmtX(hoverPoints.find((h) => h.point)!.point!.t)}
            </div>
            {hoverPoints.map((hp) => (
              <div key={hp.label} className="flex items-center gap-2 leading-snug">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: hp.color }} />
                <span className="text-white/65">{hp.label}</span>
                <span className="text-white font-mono ml-auto pl-3">
                  {hp.point && hp.point.v !== null ? fmtY(hp.point.v) : '—'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Legend — outside the height-locked chart so its pills get their own row.
          Tap any series to toggle visibility. */}
      {series.length > 1 && (
        <div className="flex flex-wrap gap-1.5 mt-3 px-1">
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
                    : 'opacity-100 border-white/15 bg-white/5 hover:bg-white/10 active:bg-white/15'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
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

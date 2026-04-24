import { useMemo } from 'react';
import type { WeatherReading } from '../../lib/weatherService';
import { convertPressure, useWeatherUnitsStore } from '../../lib/weatherUnits';

interface Props {
  rows: WeatherReading[];
  width?: number;
  height?: number;
}

// Tiny inline sparkline of barometric pressure. Autoranges Y, includes last-point dot.
export default function PressureSparkline({ rows, width = 160, height = 44 }: Props) {
  const unit = useWeatherUnitsStore((s) => s.pressure);

  const path = useMemo(() => {
    const pts: { t: number; v: number }[] = [];
    for (const r of rows) {
      const v = convertPressure(r.bar_sea_level, unit);
      if (v === null || !Number.isFinite(v)) continue;
      pts.push({ t: new Date(r.observed_at).getTime(), v });
    }
    if (pts.length < 2) return null;
    const minT = pts[0].t;
    const maxT = pts[pts.length - 1].t;
    let minV = Infinity;
    let maxV = -Infinity;
    for (const p of pts) {
      if (p.v < minV) minV = p.v;
      if (p.v > maxV) maxV = p.v;
    }
    const pad = (maxV - minV) * 0.15 || 0.01;
    minV -= pad;
    maxV += pad;
    const xs = (t: number) => 2 + ((t - minT) / (maxT - minT || 1)) * (width - 4);
    const ys = (v: number) => 2 + (1 - (v - minV) / (maxV - minV || 1)) * (height - 4);
    let d = '';
    pts.forEach((p, i) => {
      const x = xs(p.t);
      const y = ys(p.v);
      d += i === 0 ? `M ${x.toFixed(1)} ${y.toFixed(1)} ` : `L ${x.toFixed(1)} ${y.toFixed(1)} `;
    });
    const last = pts[pts.length - 1];
    const first = pts[0];
    const dir = last.v - first.v;
    return {
      d,
      endX: xs(last.t),
      endY: ys(last.v),
      fillPath: d + `L ${xs(last.t).toFixed(1)} ${(height - 2).toFixed(1)} L ${xs(first.t).toFixed(1)} ${(height - 2).toFixed(1)} Z`,
      dir,
    };
  }, [rows, unit, width, height]);

  if (!path) return <div className="text-[10px] text-white/30 italic">Building history…</div>;

  const color = path.dir > 0 ? '#34d399' : path.dir < 0 ? '#f87171' : '#93c5fd';
  const fill = path.dir > 0 ? 'rgba(52,211,153,0.18)' : path.dir < 0 ? 'rgba(248,113,113,0.18)' : 'rgba(147,197,253,0.18)';

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <path d={path.fillPath} fill={fill} />
      <path
        d={path.d}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={path.endX} cy={path.endY} r={2.5} fill={color} stroke="#0b0b0d" strokeWidth="1.5" />
    </svg>
  );
}

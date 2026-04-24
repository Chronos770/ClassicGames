import { useEffect, useMemo, useState } from 'react';
import { getReadingsRange, type WeatherReading } from '../../lib/weatherService';

interface Props {
  stationId: number | null;
  tick: number;
}

interface DayBar {
  key: string;
  date: Date;
  hdd: number;
  cdd: number;
}

// Bar chart of heating (blue) vs cooling (red) degree days over the last 30 days.
export default function DegreeDayChart({ stationId, tick }: Props) {
  const [rows, setRows] = useState<WeatherReading[]>([]);

  useEffect(() => {
    if (stationId === null) return;
    let cancelled = false;
    const to = new Date();
    const from = new Date(to.getTime() - 30 * 24 * 3600_000);
    getReadingsRange(
      stationId,
      from.toISOString(),
      to.toISOString(),
      'observed_at,hdd_day,cdd_day',
    )
      .then((r) => {
        if (!cancelled) setRows(r);
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      });
    return () => {
      cancelled = true;
    };
  }, [stationId, tick]);

  const days: DayBar[] = useMemo(() => {
    const byDay = new Map<string, { hdd: number; cdd: number; date: Date }>();
    for (const r of rows) {
      const d = new Date(r.observed_at);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      const existing = byDay.get(key) ?? {
        hdd: 0,
        cdd: 0,
        date: new Date(d.getFullYear(), d.getMonth(), d.getDate()),
      };
      if (r.hdd_day !== null) existing.hdd = Math.max(existing.hdd, r.hdd_day);
      if (r.cdd_day !== null) existing.cdd = Math.max(existing.cdd, r.cdd_day);
      byDay.set(key, existing);
    }
    return [...byDay.entries()]
      .map(([key, v]) => ({ key, ...v }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [rows]);

  const totals = useMemo(() => {
    let hdd = 0;
    let cdd = 0;
    for (const d of days) {
      hdd += d.hdd;
      cdd += d.cdd;
    }
    return { hdd, cdd };
  }, [days]);

  if (days.length === 0) {
    return (
      <div className="bg-white/5 rounded-xl border border-white/10 p-4">
        <div className="text-xs uppercase tracking-wide text-white/40 mb-3 font-semibold">
          Degree Days (30d)
        </div>
        <div className="text-sm text-white/30 py-6 text-center italic">Not enough history yet.</div>
      </div>
    );
  }

  const width = 600;
  const height = 140;
  const padL = 30;
  const padR = 12;
  const padT = 8;
  const padB = 28;
  const chartW = width - padL - padR;
  const chartH = height - padT - padB;

  const maxValue = Math.max(
    1,
    ...days.map((d) => Math.max(d.hdd, d.cdd)),
  );

  const barWidth = chartW / days.length;

  return (
    <div className="bg-white/5 rounded-xl border border-white/10 p-4">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="text-xs uppercase tracking-wide text-white/40 font-semibold">
          Degree Days (30d)
        </div>
        <div className="flex gap-4 text-xs">
          <div>
            <span className="inline-block w-2 h-2 rounded-sm bg-blue-400 mr-1" />
            <span className="text-white/40">Heating: </span>
            <span className="font-mono text-white">{totals.hdd.toFixed(0)}</span>
          </div>
          <div>
            <span className="inline-block w-2 h-2 rounded-sm bg-red-400 mr-1" />
            <span className="text-white/40">Cooling: </span>
            <span className="font-mono text-white">{totals.cdd.toFixed(0)}</span>
          </div>
        </div>
      </div>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
        {/* Y grid */}
        {[0, 0.5, 1].map((f) => {
          const v = maxValue * (1 - f);
          const y = padT + f * chartH;
          return (
            <g key={f}>
              <line x1={padL} x2={width - padR} y1={y} y2={y} stroke="rgba(255,255,255,0.05)" />
              <text x={padL - 4} y={y + 3} textAnchor="end" fontSize="8" fill="rgba(255,255,255,0.35)">
                {v.toFixed(0)}
              </text>
            </g>
          );
        })}
        {days.map((d, i) => {
          const xBase = padL + i * barWidth;
          const hddH = (d.hdd / maxValue) * chartH;
          const cddH = (d.cdd / maxValue) * chartH;
          const bw = Math.max(2, barWidth - 2);
          const halfW = bw / 2 - 0.5;
          return (
            <g key={d.key}>
              {d.hdd > 0 && (
                <rect
                  x={xBase + 1}
                  y={padT + chartH - hddH}
                  width={halfW}
                  height={hddH}
                  fill="#60a5fa"
                  opacity={0.8}
                />
              )}
              {d.cdd > 0 && (
                <rect
                  x={xBase + 1 + halfW + 1}
                  y={padT + chartH - cddH}
                  width={halfW}
                  height={cddH}
                  fill="#f87171"
                  opacity={0.8}
                />
              )}
            </g>
          );
        })}
        {/* X labels: show first, middle, last day */}
        {[0, Math.floor(days.length / 2), days.length - 1].map((idx) => {
          const d = days[idx];
          if (!d) return null;
          const x = padL + idx * barWidth + barWidth / 2;
          return (
            <text
              key={idx}
              x={x}
              y={height - 10}
              textAnchor="middle"
              fontSize="9"
              fill="rgba(255,255,255,0.4)"
            >
              {d.date.toLocaleDateString([], { month: 'short', day: 'numeric' })}
            </text>
          );
        })}
      </svg>
      <div className="mt-1 text-[10px] text-white/40 text-center">
        Base 65°F. Heating days (blue) when daily avg below base; cooling (red) when above.
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { getReadingsRange, type WeatherReading } from '../../lib/weatherService';
import { useUnitFormatters } from '../../lib/weatherUnits';

interface Props {
  stationId: number | null;
  reading: WeatherReading;
  tick: number;
}

// Simple water-balance card: compares 7-day ET vs 7-day rainfall.
// Positive deficit = soils drying; negative = saturated.
export default function ETContextCard({ stationId, reading, tick }: Props) {
  const fmt = useUnitFormatters();
  const [rows, setRows] = useState<WeatherReading[]>([]);

  useEffect(() => {
    if (stationId === null) return;
    let cancelled = false;
    const to = new Date();
    const from = new Date(to.getTime() - 7 * 24 * 3600_000);
    getReadingsRange(
      stationId,
      from.toISOString(),
      to.toISOString(),
      'observed_at,et_day,rainfall_day_in',
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

  const totals = useMemo(() => {
    // Each day, take the max et_day / rainfall_day_in value observed (these
    // are cumulative daily counters reported by the console).
    const byDay: Record<string, { et: number; rain: number }> = {};
    for (const r of rows) {
      const d = new Date(r.observed_at);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      const cur = byDay[key] ?? { et: 0, rain: 0 };
      if (r.et_day !== null) cur.et = Math.max(cur.et, r.et_day);
      if (r.rainfall_day_in !== null) cur.rain = Math.max(cur.rain, r.rainfall_day_in);
      byDay[key] = cur;
    }
    let etSum = 0;
    let rainSum = 0;
    const days = Object.values(byDay);
    for (const d of days) {
      etSum += d.et;
      rainSum += d.rain;
    }
    return { etSum, rainSum, deficit: etSum - rainSum, daysTracked: days.length };
  }, [rows]);

  const deficit = totals.deficit;
  let status: { label: string; tone: string; bar: string; tip: string };
  if (deficit > 1.0) {
    status = {
      label: 'Soils drying',
      tone: 'text-amber-300',
      bar: 'bg-amber-400',
      tip: 'Plants are likely using more water than has fallen. Water thirsty annuals, new plantings, and containers.',
    };
  } else if (deficit > 0.3) {
    status = {
      label: 'Mild deficit',
      tone: 'text-yellow-200',
      bar: 'bg-yellow-300',
      tip: 'Slight water deficit — established lawns fine; monitor new plantings.',
    };
  } else if (deficit > -0.3) {
    status = {
      label: 'Balanced',
      tone: 'text-emerald-300',
      bar: 'bg-emerald-400',
      tip: 'Rain and evapotranspiration are roughly balanced. No extra watering needed.',
    };
  } else {
    status = {
      label: 'Saturated',
      tone: 'text-sky-300',
      bar: 'bg-sky-400',
      tip: 'Soil is wet. Skip irrigation to avoid root rot.',
    };
  }

  // Bar visualization: deficit (yellow) vs surplus (blue) from center
  const scale = Math.max(Math.abs(deficit), 1);
  const pct = Math.min(100, (Math.abs(deficit) / scale) * 100);

  return (
    <div className="bg-slate-900/85 backdrop-blur-sm rounded-xl border border-white/10 p-4">
      <div className="text-xs uppercase tracking-wide text-white/40 mb-3 font-semibold">
        Water Balance (7 day)
      </div>
      <div className="flex items-baseline gap-2 mb-2">
        <span className={`text-2xl font-display font-bold tabular-nums ${status.tone}`}>
          {status.label}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
        <div className="bg-white/5 rounded-lg p-2">
          <div className="text-[10px] uppercase tracking-wide text-white/40">ET Loss</div>
          <div className="font-mono text-amber-300 text-sm">{fmt.fmtPrecip(totals.etSum)}</div>
        </div>
        <div className="bg-white/5 rounded-lg p-2">
          <div className="text-[10px] uppercase tracking-wide text-white/40">Rain</div>
          <div className="font-mono text-sky-300 text-sm">{fmt.fmtPrecip(totals.rainSum)}</div>
        </div>
      </div>
      {/* Deficit bar */}
      <div className="relative h-2 rounded-full bg-white/5 overflow-hidden mb-2">
        <div className="absolute top-0 bottom-0 left-1/2 w-px bg-white/20" />
        {deficit > 0 ? (
          <div
            className={`absolute top-0 bottom-0 left-1/2 ${status.bar}`}
            style={{ width: `${pct / 2}%` }}
          />
        ) : (
          <div
            className={`absolute top-0 bottom-0 right-1/2 ${status.bar}`}
            style={{ width: `${pct / 2}%` }}
          />
        )}
      </div>
      <div className="flex justify-between text-[10px] text-white/40 mb-2 font-mono">
        <span>wet</span>
        <span>
          Net: {deficit >= 0 ? '+' : ''}
          {fmt.fmtPrecip(deficit)} {deficit > 0 ? 'deficit' : 'surplus'}
        </span>
        <span>dry</span>
      </div>
      <div className="text-xs text-white/60 italic">{status.tip}</div>
      <div className="mt-2 pt-2 border-t border-white/5 text-[10px] text-white/40 space-y-0.5 font-mono">
        <div className="flex justify-between">
          <span>Today ET</span>
          <span>{fmt.fmtPrecip(reading.et_day, 3)}</span>
        </div>
        <div className="flex justify-between">
          <span>Month ET</span>
          <span>{fmt.fmtPrecip(reading.et_month)}</span>
        </div>
        <div className="flex justify-between">
          <span>Year ET</span>
          <span>{fmt.fmtPrecip(reading.et_year)}</span>
        </div>
      </div>
    </div>
  );
}

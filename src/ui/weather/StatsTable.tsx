import { useMemo, useState } from 'react';
import { compassFromDegrees, type WeatherReading } from '../../lib/weatherService';
import {
  convertPrecip,
  convertPressure,
  convertTemp,
  convertWind,
  useWeatherUnitsStore,
} from '../../lib/weatherUnits';

interface Column {
  id: string;
  label: string;
  unit?: string;
  width?: string;
  get: (r: WeatherReading) => number | string | null;
  fmt?: (v: number) => string;
}

function buildColumns(
  tempU: 'F' | 'C',
  windU: 'mph' | 'kph' | 'kt' | 'ms',
  pressU: 'inHg' | 'hPa' | 'mb',
  precU: 'in' | 'mm',
): Column[] {
  const tU = `°${tempU}`;
  const wU = windU === 'ms' ? 'm/s' : windU;
  const pU = pressU;
  const rU = precU === 'in' ? '"' : 'mm';
  const rateU = precU === 'in' ? '"/hr' : 'mm/hr';
  const pDig = pressU === 'inHg' ? 3 : 1;
  const rDig = precU === 'in' ? 2 : 1;
  return [
    { id: 'observed_at', label: 'Time', width: '160px', get: (r) => r.observed_at },
    { id: 'temp', label: 'Temp', unit: tU, get: (r) => convertTemp(r.temp, tempU), fmt: (v) => v.toFixed(1) },
    { id: 'hum', label: 'Hum', unit: '%', get: (r) => r.hum, fmt: (v) => v.toFixed(1) },
    { id: 'dew_point', label: 'Dew Pt', unit: tU, get: (r) => convertTemp(r.dew_point, tempU), fmt: (v) => v.toFixed(1) },
    { id: 'wind_speed_avg_last_10_min', label: 'Wind Avg', unit: wU, get: (r) => convertWind(r.wind_speed_avg_last_10_min, windU), fmt: (v) => v.toFixed(1) },
    { id: 'wind_speed_hi_last_10_min', label: 'Gust', unit: wU, get: (r) => convertWind(r.wind_speed_hi_last_10_min, windU), fmt: (v) => v.toFixed(1) },
    { id: 'wind_dir_last', label: 'Wind Dir', get: (r) => r.wind_dir_last, fmt: (v) => `${compassFromDegrees(v)} ${Math.round(v)}°` },
    { id: 'rain_rate_hi_in', label: 'Rain Rate', unit: rateU, get: (r) => convertPrecip(r.rain_rate_hi_in ?? r.rain_rate_last_in, precU), fmt: (v) => v.toFixed(rDig) },
    { id: 'rainfall_last_15_min_in', label: 'Rain (15m)', unit: rU, get: (r) => convertPrecip(r.rainfall_last_15_min_in, precU), fmt: (v) => v.toFixed(rDig) },
    { id: 'rainfall_day_in', label: 'Rain Today', unit: rU, get: (r) => convertPrecip(r.rainfall_day_in, precU), fmt: (v) => v.toFixed(rDig) },
    { id: 'bar_sea_level', label: 'Pressure', unit: pU, get: (r) => convertPressure(r.bar_sea_level, pressU), fmt: (v) => v.toFixed(pDig) },
    { id: 'temp_in', label: 'Indoor T', unit: tU, get: (r) => convertTemp(r.temp_in, tempU), fmt: (v) => v.toFixed(1) },
    { id: 'hum_in', label: 'Indoor H', unit: '%', get: (r) => r.hum_in, fmt: (v) => v.toFixed(1) },
    { id: 'rssi_last', label: 'RSSI', unit: 'dBm', get: (r) => r.rssi_last, fmt: (v) => v.toFixed(0) },
    { id: 'reception_day', label: 'Recept', unit: '%', get: (r) => r.reception_day, fmt: (v) => v.toFixed(0) },
  ];
}

const DEFAULT_COLUMNS = ['observed_at', 'temp', 'hum', 'dew_point', 'wind_speed_avg_last_10_min', 'wind_speed_hi_last_10_min', 'wind_dir_last', 'rainfall_last_15_min_in', 'bar_sea_level'];

type SortDir = 'asc' | 'desc';

export default function StatsTable({ readings }: { readings: WeatherReading[] }) {
  const [sortCol, setSortCol] = useState<string>('observed_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [visibleCols, setVisibleCols] = useState<Set<string>>(new Set(DEFAULT_COLUMNS));
  const [columnPickerOpen, setColumnPickerOpen] = useState(false);
  const [pageSize, setPageSize] = useState<number>(50);
  const [page, setPage] = useState(0);

  const tempU = useWeatherUnitsStore((s) => s.temp);
  const windU = useWeatherUnitsStore((s) => s.wind);
  const pressU = useWeatherUnitsStore((s) => s.pressure);
  const precU = useWeatherUnitsStore((s) => s.precip);
  const ALL_COLUMNS = useMemo(() => buildColumns(tempU, windU, pressU, precU), [tempU, windU, pressU, precU]);

  const sorted = useMemo(() => {
    const col = ALL_COLUMNS.find((c) => c.id === sortCol);
    if (!col) return readings;
    const arr = [...readings];
    arr.sort((a, b) => {
      const av = col.get(a);
      const bv = col.get(b);
      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'asc' ? av - bv : bv - av;
      }
      const as = String(av);
      const bs = String(bv);
      return sortDir === 'asc' ? as.localeCompare(bs) : bs.localeCompare(as);
    });
    return arr;
  }, [readings, sortCol, sortDir, ALL_COLUMNS]);

  const paged = useMemo(() => {
    if (pageSize >= sorted.length) return sorted;
    return sorted.slice(page * pageSize, (page + 1) * pageSize);
  }, [sorted, page, pageSize]);

  const toggleSort = (id: string) => {
    if (sortCol === id) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else {
      setSortCol(id);
      setSortDir('desc');
    }
  };

  const cols = ALL_COLUMNS.filter((c) => visibleCols.has(c.id));

  const fmtCell = (col: Column, row: WeatherReading) => {
    const v = col.get(row);
    if (v === null || v === undefined) return '--';
    if (col.id === 'observed_at' && typeof v === 'string') {
      return new Date(v).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    }
    if (typeof v === 'number') return col.fmt ? col.fmt(v) : String(v);
    return String(v);
  };

  const exportCsv = () => {
    const header = cols.map((c) => `${c.label}${c.unit ? ' (' + c.unit + ')' : ''}`).join(',');
    const rows = sorted.map((r) =>
      cols.map((c) => {
        const v = c.get(r);
        if (v === null || v === undefined) return '';
        if (typeof v === 'number') return String(v);
        // Quote strings with commas
        const s = String(v);
        return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
      }).join(','),
    );
    const csv = [header, ...rows].join('\n');
    download(csv, 'text/csv', `weather-${new Date().toISOString().slice(0, 19)}.csv`);
  };

  const exportJson = () => {
    const json = JSON.stringify(
      sorted.map((r) => {
        const obj: Record<string, unknown> = {};
        for (const c of cols) obj[c.id] = c.get(r);
        return obj;
      }),
      null,
      2,
    );
    download(json, 'application/json', `weather-${new Date().toISOString().slice(0, 19)}.json`);
  };

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="text-xs text-white/40">{sorted.length.toLocaleString()} rows</div>
        <div className="flex-1" />
        <div className="relative">
          <button
            onClick={() => setColumnPickerOpen((o) => !o)}
            className="text-xs px-2.5 py-1.5 bg-white/5 hover:bg-white/10 text-white/60 rounded-lg transition-colors"
          >
            Columns ({visibleCols.size})
          </button>
          {columnPickerOpen && (
            <div className="absolute right-0 top-full mt-1 bg-black/95 border border-white/10 rounded-lg p-2 shadow-xl z-10 w-56 max-h-[60vh] overflow-y-auto">
              {ALL_COLUMNS.map((c) => (
                <label key={c.id} className="flex items-center gap-2 text-xs text-white/70 hover:bg-white/5 px-2 py-1 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={visibleCols.has(c.id)}
                    onChange={(e) => {
                      const next = new Set(visibleCols);
                      if (e.target.checked) next.add(c.id);
                      else next.delete(c.id);
                      setVisibleCols(next);
                    }}
                    className="accent-amber-500"
                  />
                  <span>
                    {c.label}
                    {c.unit && <span className="text-white/30 ml-1">({c.unit})</span>}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>
        <select
          value={pageSize}
          onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }}
          className="text-xs bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white/70"
        >
          <option value={25}>25 / page</option>
          <option value={50}>50 / page</option>
          <option value={100}>100 / page</option>
          <option value={500}>500 / page</option>
          <option value={99999}>All</option>
        </select>
        <button
          onClick={exportCsv}
          className="text-xs px-2.5 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-lg transition-colors"
        >
          ↓ CSV
        </button>
        <button
          onClick={exportJson}
          className="text-xs px-2.5 py-1.5 bg-white/5 hover:bg-white/10 text-white/60 rounded-lg transition-colors"
        >
          ↓ JSON
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto bg-white/5 rounded-xl border border-white/10">
        <table className="w-full text-xs tabular-nums">
          <thead>
            <tr className="border-b border-white/10 bg-black/20">
              {cols.map((c) => (
                <th
                  key={c.id}
                  onClick={() => toggleSort(c.id)}
                  className="text-left px-3 py-2 text-[10px] uppercase tracking-wide text-white/50 font-semibold whitespace-nowrap cursor-pointer hover:bg-white/5 select-none"
                  style={c.width ? { width: c.width } : undefined}
                >
                  {c.label}
                  {c.unit && <span className="text-white/30 normal-case font-normal ml-1">({c.unit})</span>}
                  {sortCol === c.id && (
                    <span className="ml-1 text-amber-400">{sortDir === 'asc' ? '▲' : '▼'}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr>
                <td colSpan={cols.length} className="text-center py-8 text-white/30">No data</td>
              </tr>
            ) : (
              paged.map((row) => (
                <tr key={row.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  {cols.map((c) => (
                    <td key={c.id} className="px-3 py-1.5 text-white/80 whitespace-nowrap">
                      {fmtCell(c, row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pageSize < sorted.length && (
        <div className="flex items-center justify-center gap-3 text-xs text-white/50">
          <button
            onClick={() => setPage(0)}
            disabled={page === 0}
            className="px-2 py-1 hover:text-white disabled:opacity-30"
          >
            « First
          </button>
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-2 py-1 hover:text-white disabled:opacity-30"
          >
            ‹ Prev
          </button>
          <span className="text-white/40">
            Page {page + 1} of {Math.ceil(sorted.length / pageSize)}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={(page + 1) * pageSize >= sorted.length}
            className="px-2 py-1 hover:text-white disabled:opacity-30"
          >
            Next ›
          </button>
          <button
            onClick={() => setPage(Math.floor(sorted.length / pageSize))}
            disabled={(page + 1) * pageSize >= sorted.length}
            className="px-2 py-1 hover:text-white disabled:opacity-30"
          >
            Last »
          </button>
        </div>
      )}
    </div>
  );
}

function download(content: string, mime: string, filename: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Stats summary ────────────────────────────────────────────────

interface StatRow {
  label: string;
  unit: string;
  values: number[];
}

export function StatsSummary({ readings }: { readings: WeatherReading[] }) {
  const tempU = useWeatherUnitsStore((s) => s.temp);
  const windU = useWeatherUnitsStore((s) => s.wind);
  const pressU = useWeatherUnitsStore((s) => s.pressure);
  const precU = useWeatherUnitsStore((s) => s.precip);
  const windLabel = windU === 'ms' ? 'm/s' : windU;
  const precLabel = precU === 'in' ? '"' : 'mm';

  const stats = useMemo(() => {
    const collect = (
      label: string,
      unit: string,
      get: (r: WeatherReading) => number | null,
    ): StatRow => ({
      label,
      unit,
      values: readings
        .map(get)
        .filter((v): v is number => v !== null && Number.isFinite(v)),
    });

    return [
      collect('Temperature', `°${tempU}`, (r) => convertTemp(r.temp, tempU)),
      collect('Humidity', '%', (r) => r.hum),
      collect('Dew Point', `°${tempU}`, (r) => convertTemp(r.dew_point, tempU)),
      collect('Wind Avg', windLabel, (r) => convertWind(r.wind_speed_avg_last_10_min, windU)),
      collect('Wind Gust', windLabel, (r) => convertWind(r.wind_speed_hi_last_10_min, windU)),
      collect('Pressure', pressU, (r) => convertPressure(r.bar_sea_level, pressU)),
      collect('Indoor Temp', `°${tempU}`, (r) => convertTemp(r.temp_in, tempU)),
      collect('Indoor Hum', '%', (r) => r.hum_in),
    ].filter((s) => s.values.length > 0);
  }, [readings, tempU, windU, pressU, windLabel]);

  const totalRain = useMemo(() => {
    // Two ingest paths give us two different rainfall fields per row, and
    // we have to combine them correctly:
    //
    //   * Live rows (from WeatherLink /current, polled every 10 min) have the
    //     cumulative `rainfall_year_in` counter. Differencing consecutive
    //     samples gives the exact rain that fell between them.
    //   * Backfilled rows (from /historic, 15-min archive buckets) DON'T
    //     have `rainfall_year_in` — the historic API doesn't return it.
    //     Instead, each row's `rainfall_last_15_min_in` is the rain that
    //     fell in that one 15-min bucket (mapped from `rainfall_in`).
    //
    // Naively diffing only `rainfall_year_in` and skipping nulls silently
    // drops every backfilled row's contribution, so windows that include
    // historic data report a total much lower than reality. Combine both:
    // diff the year counter when present, fall back to the per-period sum
    // when not. Both are non-overlapping so the totals add cleanly.
    const sorted = [...readings].sort(
      (a, b) => new Date(a.observed_at).getTime() - new Date(b.observed_at).getTime(),
    );
    let total = 0;
    let prevYear: number | null = null;
    const seenDays = new Set<string>();
    for (const r of sorted) {
      const d = new Date(r.observed_at);
      seenDays.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);

      const yr = r.rainfall_year_in;
      if (yr !== null && Number.isFinite(yr)) {
        if (prevYear !== null) {
          if (yr >= prevYear) total += yr - prevYear;
          else total += yr; // year rollover — accept post-reset amount as lower bound
        }
        prevYear = yr;
      } else {
        // Historic / backfill row — no year counter. Add the row's
        // per-period rainfall directly. These buckets don't overlap each
        // other (15-min archive records).
        const p = r.rainfall_last_15_min_in;
        if (p !== null && Number.isFinite(p) && p > 0) total += p;
      }
    }
    const converted = convertPrecip(total, precU) ?? 0;
    return { total: converted, days: seenDays.size };
  }, [readings, precU]);

  if (readings.length === 0) return null;

  return (
    <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
      <div className="px-3 py-2 border-b border-white/10 bg-black/20 text-[10px] uppercase tracking-wide text-white/50 font-semibold">
        Summary &middot; {readings.length.toLocaleString()} readings
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs tabular-nums">
          <thead>
            <tr className="text-[10px] uppercase text-white/40 border-b border-white/5">
              <th className="text-left px-3 py-1.5 font-semibold">Metric</th>
              <th className="text-right px-3 py-1.5 font-semibold">Min</th>
              <th className="text-right px-3 py-1.5 font-semibold">Avg</th>
              <th className="text-right px-3 py-1.5 font-semibold">Max</th>
              <th className="text-right px-3 py-1.5 font-semibold">Range</th>
              <th className="text-right px-3 py-1.5 font-semibold hidden sm:table-cell">N</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((s) => {
              const min = Math.min(...s.values);
              const max = Math.max(...s.values);
              const avg = s.values.reduce((a, b) => a + b, 0) / s.values.length;
              const range = max - min;
              const fmt = (v: number) => v.toFixed(s.unit === '%' || s.unit === 'mph' || s.unit === 'W/m²' ? 1 : 2);
              return (
                <tr key={s.label} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="px-3 py-1.5 text-white/80">{s.label}{s.unit && <span className="text-white/30"> ({s.unit})</span>}</td>
                  <td className="px-3 py-1.5 text-right text-blue-300">{fmt(min)}</td>
                  <td className="px-3 py-1.5 text-right text-white/80">{fmt(avg)}</td>
                  <td className="px-3 py-1.5 text-right text-amber-300">{fmt(max)}</td>
                  <td className="px-3 py-1.5 text-right text-white/50">{fmt(range)}</td>
                  <td className="px-3 py-1.5 text-right text-white/40 hidden sm:table-cell">{s.values.length}</td>
                </tr>
              );
            })}
            <tr className="border-b border-white/5 bg-blue-500/5">
              <td className="px-3 py-1.5 text-white/80">Total Rainfall <span className="text-white/30">({precLabel})</span></td>
              <td className="px-3 py-1.5 text-right text-white/30">—</td>
              <td className="px-3 py-1.5 text-right text-white/30">—</td>
              <td className="px-3 py-1.5 text-right text-white/30">—</td>
              <td className="px-3 py-1.5 text-right text-blue-300 font-semibold">{totalRain.total.toFixed(2)}</td>
              <td className="px-3 py-1.5 text-right text-white/40 hidden sm:table-cell">{totalRain.days || '—'}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

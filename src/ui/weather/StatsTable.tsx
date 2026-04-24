import { useMemo, useState } from 'react';
import { compassFromDegrees, type WeatherReading } from '../../lib/weatherService';

interface Column {
  id: string;
  label: string;
  unit?: string;
  width?: string;
  get: (r: WeatherReading) => number | string | null;
  fmt?: (v: number) => string;
}

const ALL_COLUMNS: Column[] = [
  { id: 'observed_at', label: 'Time', width: '160px', get: (r) => r.observed_at },
  { id: 'temp', label: 'Temp', unit: '°F', get: (r) => r.temp, fmt: (v) => v.toFixed(1) },
  { id: 'hum', label: 'Hum', unit: '%', get: (r) => r.hum, fmt: (v) => v.toFixed(1) },
  { id: 'dew_point', label: 'Dew Pt', unit: '°F', get: (r) => r.dew_point, fmt: (v) => v.toFixed(1) },
  { id: 'wind_speed_avg_last_10_min', label: 'Wind Avg', unit: 'mph', get: (r) => r.wind_speed_avg_last_10_min, fmt: (v) => v.toFixed(1) },
  { id: 'wind_speed_hi_last_10_min', label: 'Gust', unit: 'mph', get: (r) => r.wind_speed_hi_last_10_min, fmt: (v) => v.toFixed(1) },
  { id: 'wind_dir_last', label: 'Wind Dir', get: (r) => r.wind_dir_last, fmt: (v) => `${compassFromDegrees(v)} ${Math.round(v)}°` },
  { id: 'rain_rate_hi_in', label: 'Rain Rate', unit: '"/hr', get: (r) => r.rain_rate_hi_in ?? r.rain_rate_last_in, fmt: (v) => v.toFixed(2) },
  { id: 'rainfall_last_15_min_in', label: 'Rain (15m)', unit: '"', get: (r) => r.rainfall_last_15_min_in, fmt: (v) => v.toFixed(2) },
  { id: 'rainfall_day_in', label: 'Rain Today', unit: '"', get: (r) => r.rainfall_day_in, fmt: (v) => v.toFixed(2) },
  { id: 'bar_sea_level', label: 'Pressure', unit: 'inHg', get: (r) => r.bar_sea_level, fmt: (v) => v.toFixed(3) },
  { id: 'solar_rad', label: 'Solar', unit: 'W/m²', get: (r) => r.solar_rad, fmt: (v) => v.toFixed(0) },
  { id: 'uv_index', label: 'UV', get: (r) => r.uv_index, fmt: (v) => v.toFixed(1) },
  { id: 'temp_in', label: 'Indoor T', unit: '°F', get: (r) => r.temp_in, fmt: (v) => v.toFixed(1) },
  { id: 'hum_in', label: 'Indoor H', unit: '%', get: (r) => r.hum_in, fmt: (v) => v.toFixed(1) },
  { id: 'rssi_last', label: 'RSSI', unit: 'dBm', get: (r) => r.rssi_last, fmt: (v) => v.toFixed(0) },
  { id: 'reception_day', label: 'Recept', unit: '%', get: (r) => r.reception_day, fmt: (v) => v.toFixed(0) },
];

const DEFAULT_COLUMNS = ['observed_at', 'temp', 'hum', 'dew_point', 'wind_speed_avg_last_10_min', 'wind_speed_hi_last_10_min', 'wind_dir_last', 'rainfall_last_15_min_in', 'bar_sea_level'];

type SortDir = 'asc' | 'desc';

export default function StatsTable({ readings }: { readings: WeatherReading[] }) {
  const [sortCol, setSortCol] = useState<string>('observed_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [visibleCols, setVisibleCols] = useState<Set<string>>(new Set(DEFAULT_COLUMNS));
  const [columnPickerOpen, setColumnPickerOpen] = useState(false);
  const [pageSize, setPageSize] = useState<number>(50);
  const [page, setPage] = useState(0);

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
  }, [readings, sortCol, sortDir]);

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
  const stats = useMemo(() => {
    const collect = (label: string, unit: string, get: (r: WeatherReading) => number | null): StatRow => ({
      label,
      unit,
      values: readings.map(get).filter((v): v is number => v !== null && Number.isFinite(v)),
    });

    return [
      collect('Temperature', '°F', (r) => r.temp),
      collect('Humidity', '%', (r) => r.hum),
      collect('Dew Point', '°F', (r) => r.dew_point),
      collect('Wind Avg', 'mph', (r) => r.wind_speed_avg_last_10_min),
      collect('Wind Gust', 'mph', (r) => r.wind_speed_hi_last_10_min),
      collect('Pressure', 'inHg', (r) => r.bar_sea_level),
      collect('Solar', 'W/m²', (r) => r.solar_rad),
      collect('UV Index', '', (r) => r.uv_index),
      collect('Indoor Temp', '°F', (r) => r.temp_in),
      collect('Indoor Hum', '%', (r) => r.hum_in),
    ].filter((s) => s.values.length > 0);
  }, [readings]);

  const totalRain = useMemo(() => {
    // `rainfall_last_15_min_in` is a rolling window reported on every reading,
    // so summing it across samples double-counts overlapping windows. The
    // console instead tracks `rainfall_day_in` as a cumulative counter that
    // resets at midnight, so for each calendar day take the max observed and
    // sum those daily totals.
    const byDay = new Map<string, number>();
    for (const r of readings) {
      const v = r.rainfall_day_in;
      if (v === null || v === undefined || !Number.isFinite(v)) continue;
      const d = new Date(r.observed_at);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      const cur = byDay.get(key) ?? 0;
      if (v > cur) byDay.set(key, v);
    }
    let total = 0;
    for (const v of byDay.values()) total += v;
    return { total, days: byDay.size };
  }, [readings]);

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
              <td className="px-3 py-1.5 text-white/80">Total Rainfall <span className="text-white/30">(in)</span></td>
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

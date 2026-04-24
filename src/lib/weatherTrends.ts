import { useEffect, useMemo, useState } from 'react';
import { getReadingsRange, type WeatherReading } from './weatherService';

export interface TrendData {
  rows: WeatherReading[];
  loading: boolean;
}

// Fetches a sliding window of readings (default: last 24h) used by sparklines,
// sun/solar arcs, wind rose, etc. Re-fetches when `tick` changes.
export function useRecentReadings(
  stationId: number | null,
  hours: number,
  tick: number,
  columns = 'observed_at,temp,bar_sea_level,solar_rad,uv_index,wind_speed_avg_last_10_min,wind_dir_scalar_avg_last_10_min,rainfall_day_in,hum,rain_rate_last_in',
): TrendData {
  const [rows, setRows] = useState<WeatherReading[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (stationId === null) return;
    let cancelled = false;
    setLoading(true);
    const to = new Date();
    const from = new Date(to.getTime() - hours * 3600_000);
    getReadingsRange(stationId, from.toISOString(), to.toISOString(), columns)
      .then((r) => {
        if (!cancelled) setRows(r);
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [stationId, hours, tick, columns]);

  return { rows, loading };
}

export interface Extremes {
  min: number | null;
  max: number | null;
  minAt: string | null;
  maxAt: string | null;
}

export function extremes(rows: WeatherReading[], key: keyof WeatherReading): Extremes {
  let min: number | null = null;
  let max: number | null = null;
  let minAt: string | null = null;
  let maxAt: string | null = null;
  for (const r of rows) {
    const v = r[key] as number | null;
    if (v === null || v === undefined || !Number.isFinite(v)) continue;
    if (min === null || v < min) {
      min = v;
      minAt = r.observed_at;
    }
    if (max === null || v > max) {
      max = v;
      maxAt = r.observed_at;
    }
  }
  return { min, max, minAt, maxAt };
}

// Simple linear slope per hour across the window for a numeric column.
export function trendPerHour(rows: WeatherReading[], key: keyof WeatherReading): number | null {
  const pts: { t: number; v: number }[] = [];
  for (const r of rows) {
    const v = r[key] as number | null;
    if (v === null || v === undefined || !Number.isFinite(v)) continue;
    pts.push({ t: new Date(r.observed_at).getTime(), v });
  }
  if (pts.length < 2) return null;
  const n = pts.length;
  let sumT = 0, sumV = 0, sumTV = 0, sumTT = 0;
  const t0 = pts[0].t;
  for (const p of pts) {
    const t = (p.t - t0) / 3600_000;
    sumT += t;
    sumV += p.v;
    sumTV += t * p.v;
    sumTT += t * t;
  }
  const denom = n * sumTT - sumT * sumT;
  if (denom === 0) return null;
  return (n * sumTV - sumT * sumV) / denom;
}

// Filter to rows whose observed_at falls on the local calendar date of `now`.
export function todaysRows(rows: WeatherReading[], now = new Date()): WeatherReading[] {
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();
  return rows.filter((r) => {
    const x = new Date(r.observed_at);
    return x.getFullYear() === y && x.getMonth() === m && x.getDate() === d;
  });
}

export function useTodaysExtremes(
  rows: WeatherReading[],
  key: keyof WeatherReading,
): Extremes {
  return useMemo(() => extremes(todaysRows(rows), key), [rows, key]);
}

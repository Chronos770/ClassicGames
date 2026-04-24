import { useEffect, useState } from 'react';
import {
  getAlerts,
  getForecast,
  getHourlyForecast,
  type NwsAlert,
  type NwsForecast,
} from './nwsService';

// Module-level cache keyed by lat,lon,tick. Dedupes concurrent fetches across
// components (PrecipOutlook and ForecastSection were both hitting NWS for the
// same hourly forecast on every ingest tick).
type Kind = 'forecast' | 'hourly' | 'alerts';
const cache = new Map<string, Promise<unknown>>();

function key(kind: Kind, lat: number, lon: number, tick: number): string {
  return `${kind}:${lat.toFixed(4)}:${lon.toFixed(4)}:${tick}`;
}

function getCached<T>(kind: Kind, lat: number, lon: number, tick: number, loader: () => Promise<T>): Promise<T> {
  const k = key(kind, lat, lon, tick);
  const existing = cache.get(k);
  if (existing) return existing as Promise<T>;
  const p = loader().catch((e) => {
    // Don't poison the cache — clear on failure so the next caller retries.
    cache.delete(k);
    throw e;
  });
  cache.set(k, p);
  // Opportunistic GC: keep the cache small. Drop entries with the same kind
  // but different ticks once the new one resolves so memory doesn't grow.
  p.finally(() => {
    for (const existingKey of cache.keys()) {
      if (existingKey.startsWith(`${kind}:`) && existingKey !== k) cache.delete(existingKey);
    }
  });
  return p;
}

interface NwsState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

function useNws<T>(
  kind: Kind,
  lat: number | null,
  lon: number | null,
  tick: number,
  loader: (lat: number, lon: number) => Promise<T>,
): NwsState<T> {
  const [state, setState] = useState<NwsState<T>>({ data: null, loading: true, error: null });

  useEffect(() => {
    if (lat === null || lon === null) {
      setState({ data: null, loading: false, error: null });
      return;
    }
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    getCached(kind, lat, lon, tick, () => loader(lat, lon))
      .then((data) => {
        if (!cancelled) setState({ data: data as T, loading: false, error: null });
      })
      .catch((e) => {
        if (!cancelled) setState({ data: null, loading: false, error: String(e?.message ?? e) });
      });
    return () => {
      cancelled = true;
    };
  }, [kind, lat, lon, tick, loader]);

  return state;
}

export function useNwsForecast(lat: number | null, lon: number | null, tick: number) {
  return useNws<NwsForecast>('forecast', lat, lon, tick, getForecast);
}

export function useNwsHourly(lat: number | null, lon: number | null, tick: number) {
  return useNws<NwsForecast>('hourly', lat, lon, tick, getHourlyForecast);
}

export function useNwsAlerts(lat: number | null, lon: number | null, tick: number) {
  return useNws<NwsAlert[]>('alerts', lat, lon, tick, getAlerts);
}

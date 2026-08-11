// NWS (National Weather Service) forecast client.
// All calls are proxied through the Supabase Edge Function `weather-proxy`
// because NWS has aggressive User-Agent / CORS handling that browser requests
// can trip over.

import { supabase } from './supabase';

export interface NwsForecastPeriod {
  number: number;
  name: string;
  startTime: string;
  endTime: string;
  isDaytime: boolean;
  temperature: number;
  temperatureUnit: string;
  temperatureTrend: string | null;
  probabilityOfPrecipitation: { value: number | null };
  windSpeed: string;
  windDirection: string;
  icon: string;
  shortForecast: string;
  detailedForecast: string;
}

export interface NwsForecast {
  properties: {
    generatedAt: string;
    updateTime: string;
    periods: NwsForecastPeriod[];
  };
}

export interface NwsAlert {
  id: string;
  geometry?: unknown;
  properties: {
    event: string;
    severity: string;
    urgency: string;
    certainty: string;
    headline: string;
    description: string;
    instruction: string | null;
    areaDesc: string;
    effective: string;
    expires: string;
    ends: string | null;
    sender: string;
    senderName: string;
  };
}

async function invokeProxy<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('weather-proxy', { body });
  if (error) throw new Error(`weather-proxy transport: ${error.message}`);
  if (!data || typeof data !== 'object') throw new Error('weather-proxy returned no data');
  const envelope = data as { ok?: boolean; data?: unknown; error?: string };
  if (envelope.ok === false) throw new Error(envelope.error || 'weather-proxy unknown error');
  if (envelope.ok === true) return envelope.data as T;
  // Backward-compat: older deploy returned raw data.
  return data as T;
}

export async function getForecast(lat: number, lon: number): Promise<NwsForecast> {
  return invokeProxy<NwsForecast>({ kind: 'nws-forecast', lat, lon });
}

export async function getHourlyForecast(lat: number, lon: number): Promise<NwsForecast> {
  return invokeProxy<NwsForecast>({ kind: 'nws-hourly', lat, lon });
}

export async function getAlerts(lat: number, lon: number): Promise<NwsAlert[]> {
  const res = await invokeProxy<{ features: NwsAlert[] }>({ kind: 'nws-alerts', lat, lon });
  return res?.features ?? [];
}

export function forecastEmoji(shortForecast: string, isDaytime = true): string {
  const s = shortForecast.toLowerCase();
  if (/thunder/.test(s)) return '⛈️';
  if (/\b(hail|sleet)\b/.test(s)) return '🌨️';
  if (/snow/.test(s)) return '❄️';
  if (/\b(rain|shower|drizzle)\b/.test(s)) return '🌧️';
  if (/fog|haze|mist/.test(s)) return '🌫️';
  if (/\bwind/.test(s)) return '💨';
  if (/\b(cloud|overcast)\b/.test(s)) return '☁️';
  if (/partly/.test(s)) return isDaytime ? '⛅' : '🌙';
  if (/\b(sunny|clear|fair)\b/.test(s)) return isDaytime ? '☀️' : '🌜';
  return isDaytime ? '☀️' : '🌙';
}

// Maps an NWS short-forecast string to a ConditionKey so the same animated
// icon component used in the hero can render forecast periods.
//
// `pop` is the period's probabilityOfPrecipitation value (0-100), when
// known. NWS's shortForecast text names the precip type ("Slight Chance
// Showers And Thunderstorms") even when the actual chance is only 20-30%,
// so matching on the text alone made the icon commit to a full
// thunderstorm/rain graphic almost any time precip was mentioned at all —
// a 20% chance of a thunderstorm looked identical to a certain one. Gate
// each precip icon behind the real probability instead; below the
// threshold we fall back to a cloud-cover icon rather than the dramatic
// precip graphic. When pop is unavailable (undefined/null) we keep the
// old text-only behavior.
export function forecastConditionKey(
  shortForecast: string,
  isDaytime = true,
  pop?: number | null,
): 'thunderstorm' | 'heavyRain' | 'rain' | 'drizzle' | 'snow' | 'fog' | 'windy' | 'hot' | 'cold' | 'sunny' | 'clear' | 'partlyCloudy' | 'cloudy' | 'unknown' {
  const s = shortForecast.toLowerCase();
  const p = pop ?? null;
  const likely = (min: number) => p === null || p >= min;
  const cloudFallback = isDaytime ? 'partlyCloudy' : 'cloudy';

  if (/thunder/.test(s)) {
    if (likely(50)) return 'thunderstorm';
    if (likely(25)) return 'rain';
    return cloudFallback;
  }
  if (/\b(hail|sleet|freezing|wintry)\b/.test(s) || /snow|flurr|blizzard/.test(s)) {
    return likely(30) ? 'snow' : cloudFallback;
  }
  if (/\bheavy\s+rain\b|downpour/.test(s)) {
    if (likely(40)) return 'heavyRain';
    if (likely(20)) return 'rain';
    return cloudFallback;
  }
  if (/drizzle/.test(s)) {
    return likely(30) ? 'drizzle' : cloudFallback;
  }
  if (/\b(rain|shower)\b/.test(s)) {
    return likely(30) ? 'rain' : cloudFallback;
  }
  if (/fog|haze|mist/.test(s)) return 'fog';
  if (/\bwind/.test(s)) return 'windy';
  if (/partly/.test(s)) return 'partlyCloudy';
  if (/mostly\s+cloud|\b(cloud|overcast)\b/.test(s)) return 'cloudy';
  if (/\b(sunny|clear|fair)\b/.test(s)) return isDaytime ? 'sunny' : 'clear';
  return 'unknown';
}

export function parseWindSpeed(ws: string): number | null {
  const m = ws.match(/(\d+)(?:\s*to\s*(\d+))?/);
  if (!m) return null;
  const a = Number(m[1]);
  const b = m[2] ? Number(m[2]) : a;
  return (a + b) / 2;
}

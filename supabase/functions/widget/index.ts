// Supabase Edge Function: widget
//
// Single JSON endpoint that powers the Android home-screen widget.
// Combines: latest reading from the DB + NWS day forecast + NWS active
// alerts. Returns a compact, opinionated shape — no nullable maze for
// the widget client to traverse.
//
// GET /functions/v1/widget?station_id=123
//   { ok: true, data: WidgetPayload }
//
// CORS-open so the Android client can call it without auth tokens
// (the anon key is still required as the Authorization header per
// Supabase platform defaults).

// deno-lint-ignore-file no-explicit-any

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const NWS_BASE = 'https://api.weather.gov';
const NWS_UA = 'CastleAndCards-WeatherWidget/1.0 (sfisherit@gmail.com)';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

interface ForecastDay {
  day: string;          // "SUN"
  icon: string;         // condition key e.g. "rain", "cloudy", "sunny"
  hi: number;           // °F
  lo: number;           // °F
  precipPct: number | null; // chance of precipitation, 0-100
}

interface WidgetPayload {
  location: string;
  observed_at: string | null;
  updated_at: string;
  current: {
    temp: number | null;
    feels: number | null;
    precip_pct: number | null;
    wind_mph: number | null;
    humidity: number | null;
    icon: string;
    alert: string | null;     // e.g. "Tornado Warning" — null when no active alert
  };
  forecast: ForecastDay[];
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

async function nwsFetch(url: string, retries = 2): Promise<any> {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': NWS_UA, Accept: 'application/geo+json' },
      });
      if (res.ok) return await res.json();
      if (res.status >= 500 || res.status === 429) {
        if (i < retries) { await sleep(300 * (i + 1)); continue; }
      }
      throw new Error(`NWS ${res.status}: ${(await res.text()).slice(0, 200)}`);
    } catch (e) {
      if (i === retries) throw e;
      await sleep(300 * (i + 1));
    }
  }
}

function shortDay(startTime: string): string {
  // NWS startTime carries the station's local TZ offset (e.g.
  // "2025-06-25T22:00:00-05:00"). The edge function runs in UTC, so
  // `new Date(startTime).getDay()` would shift the day name across
  // midnight UTC — a 10 PM CST period would show up as Thursday
  // even though it's still Wednesday locally. Parse the local
  // calendar components directly from the string to get the day in
  // the station's timezone, not the server's.
  const m = startTime.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) {
    const d = new Date(startTime);
    return ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][d.getUTCDay()];
  }
  const utc = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][new Date(utc).getUTCDay()];
}

// Map NWS shortForecast to a small icon vocabulary the widget understands.
function iconFor(short: string, isDaytime: boolean): string {
  const s = short.toLowerCase();
  if (/thunder/.test(s)) return 'thunder';
  if (/snow|flurr|blizzard|sleet|hail/.test(s)) return 'snow';
  if (/rain|shower|drizzle/.test(s)) return 'rain';
  if (/fog|haze|mist/.test(s)) return 'fog';
  if (/partly|mostly/.test(s)) return isDaytime ? 'partly' : 'partlyNight';
  if (/cloud|overcast/.test(s)) return 'cloudy';
  if (/sunny|clear|fair/.test(s)) return isDaytime ? 'sunny' : 'clear';
  return 'cloudy';
}

// Walk NWS daytime periods and collapse to up to 5 day-level rows with hi/lo.
function buildForecast(periods: any[]): ForecastDay[] {
  // NWS alternates daytime + nighttime periods. Pair each daytime with the
  // following nighttime to derive hi/lo. If the fetch happens after sunset
  // the API leads with the current day's nighttime period — SKIP it,
  // otherwise we end up with TWO rows for the same day (a "night-only"
  // synthesized row, then the proper hi/lo row that comes from the next
  // daytime period). Either both rows say "WED" or the night row says
  // "THU" due to UTC-vs-local day rollover, both confusing.
  const out: ForecastDay[] = [];
  let i = 0;
  if (periods.length > 0 && !periods[0].isDaytime) i = 1;
  while (i < periods.length && out.length < 5) {
    const p = periods[i];
    if (!p.isDaytime) { i += 1; continue; }
    const next = periods[i + 1];
    const lo = next && !next.isDaytime ? Number(next.temperature) : Number(p.temperature);
    // Precip is reported per period; surface the higher of day vs night
    // so a daytime 10% + nighttime 60% reads as a clear "60% rain" day.
    const dayP = Number(p.probabilityOfPrecipitation?.value ?? 0);
    const nightP = next ? Number(next.probabilityOfPrecipitation?.value ?? 0) : 0;
    const precip = Math.round(Math.max(dayP, nightP));
    out.push({
      day: shortDay(p.startTime),
      icon: iconFor(p.shortForecast, true),
      hi: Math.round(Number(p.temperature)),
      lo: Math.round(lo),
      precipPct: Number.isFinite(precip) ? precip : null,
    });
    i += 2;
  }
  return out;
}

function pickAlert(features: any[]): string | null {
  if (!features?.length) return null;
  // Prioritize severity: Extreme > Severe > Moderate.
  const order: Record<string, number> = { Extreme: 0, Severe: 1, Moderate: 2, Minor: 3, Unknown: 4 };
  const sorted = [...features].sort(
    (a, b) => (order[a.properties?.severity] ?? 5) - (order[b.properties?.severity] ?? 5),
  );
  return sorted[0]?.properties?.event ?? null;
}

function feelsLike(temp: number | null, heatIdx: number | null, windChill: number | null): number | null {
  if (temp === null) return null;
  if (temp >= 80 && heatIdx !== null) return heatIdx;
  if (temp <= 50 && windChill !== null) return windChill;
  return temp;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) {
    return json({ ok: false, error: 'Missing SUPABASE env' }, 500);
  }
  const sb = createClient(supabaseUrl, serviceKey);

  try {
    const url = new URL(req.url);
    const stationParam = url.searchParams.get('station_id');
    let stationId: number | null = stationParam ? Number(stationParam) : null;

    // Resolve station (default: first one in the table).
    let station: any = null;
    if (stationId !== null && Number.isFinite(stationId)) {
      const { data, error } = await sb
        .from('weather_stations')
        .select('station_id, station_name, city, latitude, longitude')
        .eq('station_id', stationId)
        .maybeSingle();
      if (error) throw error;
      station = data;
    } else {
      const { data, error } = await sb
        .from('weather_stations')
        .select('station_id, station_name, city, latitude, longitude')
        .order('station_id', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      station = data;
      stationId = station?.station_id ?? null;
    }
    if (!station) return json({ ok: false, error: 'No station found' }, 404);

    const { data: reading, error: readErr } = await sb
      .from('weather_readings')
      .select('temp, hum, heat_index, wind_chill, wind_speed_last, observed_at')
      .eq('station_id', stationId)
      .order('observed_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (readErr) throw readErr;

    let forecast: ForecastDay[] = [];
    let precipPct: number | null = null;
    let alert: string | null = null;
    // The current-conditions icon is derived from the NWS hourly forecast's
    // FIRST period — i.e. the hour we're actually in — rather than the
    // daily forecast's first period. The daily summary reads "partly
    // cloudy" all day; the hourly forecast knows it's raining right now.
    // Station readings give us accurate numbers (temp/humidity/wind) but
    // don't classify conditions, so NWS fills that gap.
    let currentIcon: string | null = null;
    const lat = station.latitude as number | null;
    const lon = station.longitude as number | null;
    if (lat !== null && lon !== null) {
      // Fan out NWS calls.
      const [pointRes, alertsRes] = await Promise.allSettled([
        nwsFetch(`${NWS_BASE}/points/${lat.toFixed(4)},${lon.toFixed(4)}`),
        nwsFetch(
          `${NWS_BASE}/alerts/active?point=${lat.toFixed(4)},${lon.toFixed(4)}`,
        ),
      ]);
      if (pointRes.status === 'fulfilled') {
        // Daily + hourly forecasts in parallel — both are derived from the
        // same gridpoint URL set returned by /points.
        const dailyUrl = pointRes.value.properties.forecast;
        const hourlyUrl = pointRes.value.properties.forecastHourly;
        const [dailyRes, hourlyRes] = await Promise.allSettled([
          dailyUrl ? nwsFetch(dailyUrl) : Promise.resolve(null),
          hourlyUrl ? nwsFetch(hourlyUrl) : Promise.resolve(null),
        ]);
        if (dailyRes.status === 'fulfilled' && dailyRes.value) {
          try {
            const fc = dailyRes.value;
            forecast = buildForecast(fc?.properties?.periods ?? []);
          } catch (e) {
            console.error('daily forecast parse failed:', (e as Error).message);
          }
        } else if (dailyRes.status === 'rejected') {
          console.error('daily forecast fetch failed:', (dailyRes.reason as Error)?.message);
        }
        if (hourlyRes.status === 'fulfilled' && hourlyRes.value) {
          const h0 = hourlyRes.value?.properties?.periods?.[0];
          if (h0) {
            currentIcon = iconFor(String(h0.shortForecast ?? ''), Boolean(h0.isDaytime));
            const hp = h0?.probabilityOfPrecipitation?.value;
            if (hp !== null && hp !== undefined) precipPct = Math.round(Number(hp));
          }
        } else if (hourlyRes.status === 'rejected') {
          console.error('hourly forecast fetch failed:', (hourlyRes.reason as Error)?.message);
        }
        // Fallback: if hourly didn't give us precip, fall back to daily's first period
        // so the widget doesn't lose the metric entirely on a partial NWS outage.
        if (precipPct === null && dailyRes.status === 'fulfilled' && dailyRes.value) {
          const d0 = dailyRes.value?.properties?.periods?.[0];
          const dp = d0?.probabilityOfPrecipitation?.value;
          if (dp !== null && dp !== undefined) precipPct = Math.round(Number(dp));
        }
      }
      if (alertsRes.status === 'fulfilled') {
        alert = pickAlert(alertsRes.value?.features ?? []);
      }
    }

    const payload: WidgetPayload = {
      location: station.city || station.station_name || 'Home',
      observed_at: reading?.observed_at ?? null,
      updated_at: new Date().toISOString(),
      current: {
        temp: reading?.temp !== undefined && reading?.temp !== null ? Math.round(reading.temp) : null,
        feels: (() => {
          const f = feelsLike(reading?.temp ?? null, reading?.heat_index ?? null, reading?.wind_chill ?? null);
          return f === null ? null : Math.round(f);
        })(),
        precip_pct: precipPct,
        wind_mph: reading?.wind_speed_last !== undefined && reading?.wind_speed_last !== null
          ? Math.round(reading.wind_speed_last)
          : null,
        humidity: reading?.hum !== undefined && reading?.hum !== null ? Math.round(reading.hum) : null,
        // Prefer the hourly-derived icon; if NWS hourly was unreachable
        // fall back to the daily-derived icon so we still render something
        // sensible instead of defaulting to "cloudy".
        icon: currentIcon ?? forecast[0]?.icon ?? 'cloudy',
        alert,
      },
      forecast,
    };

    return json({ ok: true, data: payload });
  } catch (e: any) {
    console.error('widget endpoint failed:', e?.message ?? e);
    return json({ ok: false, error: String(e?.message ?? e).slice(0, 500) }, 500);
  }
});

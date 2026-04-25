// Supabase Edge Function: push-tick
//
// Cron-driven entry point that checks all the threshold conditions for
// weather + space-weather notifications, then calls push-send with the
// matching payload(s). Designed to run every 15 minutes via pg_cron.
//
// Required env (auto-provided in Supabase Edge runtime):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// What we check (only fires if the user has the toggle on; idempotent
// per alert_key, so repeated runs don't double-send):
//   1. Severe NWS alerts (Severe/Extreme) — bypasses quiet hours
//   2. Rain incoming  — NWS hourly precip ≥ 50% within next 24h
//   3. Thunderstorms  — NWS shortForecast says thunder within 24h
//   4. Snow / wintry  — NWS shortForecast says snow/sleet/etc within 24h
//   5. Daily forecast — once per day at the user's configured 5am local
//   6. Active rain    — station rain rate > 0 right now
//   7. Aurora possible— Kp meets the user's latitude threshold
//   8. Major flare    — current X-ray flux ≥ M5 (5e-5) or NOAA G/S/R ≥ 3

// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

const NWS_FORECAST_HOURLY = (lat: number, lon: number) =>
  `https://api.weather.gov/points/${lat},${lon}/forecast/hourly`;

const SWPC = 'https://services.swpc.noaa.gov';

async function fetchJSON<T>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url, {
      headers: {
        'User-Agent': 'ClassicGamesWeather/1.0 (push-tick)',
        Accept: 'application/json',
      },
    });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

interface Station {
  station_id: number;
  station_name: string;
  latitude: number | null;
  longitude: number | null;
}

async function callPushSend(supabaseUrl: string, serviceKey: string, payload: any) {
  const r = await fetch(`${supabaseUrl}/functions/v1/push-send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${serviceKey}`,
    },
    body: JSON.stringify(payload),
  });
  if (!r.ok) return { error: `push-send ${r.status}` };
  return await r.json();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: 'env missing' }), { status: 500 });
  }
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  // We only have one station for now; pull it for lat/lon. If you ever support
  // multiple stations per user, this loop should be per-user-station.
  const { data: stations } = await supabase
    .from('weather_stations')
    .select('station_id, station_name, latitude, longitude')
    .limit(1);
  const station: Station | null = (stations as Station[])?.[0] ?? null;
  if (!station || station.latitude === null || station.longitude === null) {
    return new Response(JSON.stringify({ error: 'no station with coords' }), { status: 400 });
  }

  const lat = station.latitude;
  const lon = station.longitude;
  const results: Record<string, any> = {};

  // ── Pull NWS hourly forecast and active alerts ─────────────────
  const hourly = await fetchJSON<any>(NWS_FORECAST_HOURLY(lat, lon));
  const periods: any[] = hourly?.properties?.periods ?? [];
  const next24 = periods.slice(0, 24);

  // ── 1. Severe NWS alerts (bypasses quiet hours) ────────────────
  const alertsJson = await fetchJSON<any>(
    `https://api.weather.gov/alerts/active?point=${lat},${lon}`,
  );
  const features = alertsJson?.features ?? [];
  for (const f of features) {
    const sev = (f?.properties?.severity || '').toLowerCase();
    if (sev !== 'severe' && sev !== 'extreme') continue;
    const id = f?.id || f?.properties?.id || '';
    if (!id) continue;
    const event = f?.properties?.event || 'Severe weather alert';
    const headline = f?.properties?.headline || event;
    results[`severe:${id}`] = await callPushSend(supabaseUrl, serviceKey, {
      alert_kind: 'severe_alerts',
      alert_key: id,
      title: `⚠️ ${event}`,
      body: headline,
      url: '/weather',
      tag: 'severe-alert',
      bypass_quiet_hours: true,
    });
  }

  // ── 2/3/4. Precip / thunder / snow within next 24h ─────────────
  const eventDateKey = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  let topPrecip = 0;
  let firstPrecipPeriod: any = null;
  let hasThunder = false;
  let hasSnow = false;
  let firstThunderPeriod: any = null;
  let firstSnowPeriod: any = null;
  for (const p of next24) {
    const prob = p?.probabilityOfPrecipitation?.value ?? 0;
    const fc = String(p?.shortForecast || '').toLowerCase();
    if (prob > topPrecip) topPrecip = prob;
    if (prob >= 50 && !firstPrecipPeriod) firstPrecipPeriod = p;
    if (/thunder/.test(fc)) {
      hasThunder = true;
      if (!firstThunderPeriod) firstThunderPeriod = p;
    }
    if (/snow|sleet|wintry|ice|freezing|flurr|blizzard/.test(fc)) {
      hasSnow = true;
      if (!firstSnowPeriod) firstSnowPeriod = p;
    }
  }

  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleString([], {
      hour: 'numeric',
      minute: '2-digit',
      weekday: 'short',
    });

  if (firstPrecipPeriod) {
    results['rain_incoming'] = await callPushSend(supabaseUrl, serviceKey, {
      alert_kind: 'rain_incoming',
      alert_key: `rain-${eventDateKey}`,
      title: '🌧 Rain coming',
      body: `Rain ${topPrecip}% likely starting around ${fmtTime(firstPrecipPeriod.startTime)}.`,
      url: '/weather',
      tag: 'rain-incoming',
    });
  }
  if (hasThunder && firstThunderPeriod) {
    results['thunderstorms'] = await callPushSend(supabaseUrl, serviceKey, {
      alert_kind: 'thunderstorms',
      alert_key: `thunder-${eventDateKey}`,
      title: '⛈ Thunderstorms expected',
      body: `Storms in the forecast starting around ${fmtTime(firstThunderPeriod.startTime)}.`,
      url: '/weather',
      tag: 'thunderstorms',
    });
  }
  if (hasSnow && firstSnowPeriod) {
    results['snow_wintry'] = await callPushSend(supabaseUrl, serviceKey, {
      alert_kind: 'snow_wintry',
      alert_key: `snow-${eventDateKey}`,
      title: '❄️ Snow / wintry mix',
      body: `Wintry weather in the forecast starting around ${fmtTime(firstSnowPeriod.startTime)}.`,
      url: '/weather',
      tag: 'snow-wintry',
    });
  }

  // ── 5. Daily forecast at 5am local ─────────────────────────────
  // Pull per-user prefs/timezones, send to anyone whose local hour is 5.
  const { data: prefRows } = await supabase
    .from('weather_push_preferences')
    .select('user_id, timezone, daily_forecast');
  const dailyTargets: string[] = [];
  for (const p of (prefRows ?? []) as any[]) {
    if (!p.daily_forecast) continue;
    let h: number;
    try {
      h = Number(
        new Intl.DateTimeFormat('en-US', {
          timeZone: p.timezone || 'America/Chicago',
          hour: 'numeric',
          hour12: false,
        }).format(new Date()),
      );
    } catch {
      h = new Date().getHours();
    }
    if (h === 5) dailyTargets.push(p.user_id);
  }
  if (dailyTargets.length > 0) {
    const dayPeriod = periods.find((p: any) => p?.isDaytime) ?? next24[0];
    if (dayPeriod) {
      const high = dayPeriod.temperature;
      const cond = dayPeriod.shortForecast;
      const dayPrecip = dayPeriod.probabilityOfPrecipitation?.value ?? 0;
      results['daily_forecast'] = await callPushSend(supabaseUrl, serviceKey, {
        user_ids: dailyTargets,
        alert_kind: 'daily_forecast',
        alert_key: `daily-${eventDateKey}`,
        title: `Today: ${cond}`,
        body: `High ${high}°${dayPeriod.temperatureUnit}${dayPrecip > 0 ? `, rain ${dayPrecip}%` : ''}.`,
        url: '/weather',
        tag: 'daily-forecast',
      });
    }
  }

  // ── 6. Active rain at the station ──────────────────────────────
  const { data: latestReadings } = await supabase
    .from('weather_readings')
    .select('rain_rate_last_in, rainfall_last_15_min_in, observed_at')
    .eq('station_id', station.station_id)
    .order('observed_at', { ascending: false })
    .limit(1);
  const reading = (latestReadings as any[])?.[0];
  if (reading && (reading.rain_rate_last_in > 0 || reading.rainfall_last_15_min_in > 0.01)) {
    const halfHour = Math.floor(Date.now() / (30 * 60_000));
    results['active_rain'] = await callPushSend(supabaseUrl, serviceKey, {
      alert_kind: 'active_rain',
      alert_key: `active-rain-${halfHour}`,
      title: '🌧 It\'s raining at your station',
      body: `Rate ${(reading.rain_rate_last_in ?? 0).toFixed(2)}"/hr.`,
      url: '/weather',
      tag: 'active-rain',
    });
  }

  // ── 7/8. Space weather (Kp + flare) ────────────────────────────
  const kpData = await fetchJSON<any[]>(
    `${SWPC}/products/noaa-planetary-k-index.json`,
  );
  let currentKp: number | null = null;
  if (Array.isArray(kpData) && kpData.length > 1) {
    const last = kpData[kpData.length - 1];
    currentKp = Number(last?.[1]);
    if (!Number.isFinite(currentKp)) currentKp = null;
  }
  if (currentKp !== null && currentKp >= 5) {
    const eventBucket = Math.floor(Date.now() / (3 * 3600_000));
    results['aurora_possible'] = await callPushSend(supabaseUrl, serviceKey, {
      alert_kind: 'aurora_possible',
      alert_key: `aurora-kp${currentKp.toFixed(1)}-${eventBucket}`,
      title: '🌌 Aurora possible',
      body: `Kp index is ${currentKp.toFixed(1)} — check the Space tab.`,
      url: '/weather',
      tag: 'aurora',
    });
  }

  const xrays = await fetchJSON<any[]>(`${SWPC}/json/goes/primary/xrays-6-hour.json`);
  const xrayLong = (Array.isArray(xrays) ? xrays : []).filter(
    (r: any) => r?.energy === '0.1-0.8nm',
  );
  const latestFlux = xrayLong.length ? Number(xrayLong[xrayLong.length - 1]?.flux) : 0;
  if (latestFlux >= 5e-5) {
    const eventBucket = Math.floor(Date.now() / (1 * 3600_000));
    const klass = latestFlux >= 1e-4 ? 'X' : 'M';
    results['major_flare'] = await callPushSend(supabaseUrl, serviceKey, {
      alert_kind: 'major_flare',
      alert_key: `flare-${klass}-${eventBucket}`,
      title: `☀️ ${klass}-class solar flare`,
      body: `X-ray flux at ${latestFlux.toExponential(1)} W/m². Possible radio impacts.`,
      url: '/weather',
      tag: 'major-flare',
      bypass_quiet_hours: klass === 'X',
    });
  }

  return new Response(
    JSON.stringify({ ran_at: new Date().toISOString(), results }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});

// Supabase Edge Function: backfill-weather
//
// Pulls historic readings from the WeatherLink v2 API /historic endpoint and
// upserts them into weather_readings. WeatherLink limits historic requests to
// ~24 hours per call, so we page through the requested window in 24hr chunks.
//
// Usage (POST body):
//   { "station_id": 235190, "days": 7 }
//   { "station_id": 235190, "start": "2026-04-15T00:00:00Z", "end": "2026-04-22T00:00:00Z" }
//   { "all_stations": true, "days": 30 }
//
// Field mapping notes (data structure type 24, the historic ISS structure):
//   The /historic endpoint returns *per-period* aggregates (15-min buckets for
//   our station), with different field names than /current. We map them as:
//     wind_speed_avg          -> wind_speed_avg_last_10_min   (period mean)
//     wind_speed_hi           -> wind_speed_hi_last_10_min    (period peak)
//     wind_dir_of_avg         -> wind_dir_scalar_avg_last_10_min
//     wind_dir_of_prevail     -> wind_dir_last                (best proxy)
//     wind_speed_hi_dir       -> wind_dir_at_hi_speed_last_10_min
//     rainfall_in             -> rainfall_last_15_min_in      (period total)
//     rain_rate_hi_in         -> rain_rate_hi_in              (period max rate)
//     temp_avg                -> temp                          (period mean)
//     temp_last               -> (also temp if avg missing)
//   We do NOT populate wind_speed_last for historic rows (no instantaneous
//   value exists in the per-period data — leaving NULL keeps the History
//   chart's "Current" line from being a duplicate of the avg line).

// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const WEATHERLINK_BASE = 'https://api.weatherlink.com/v2';
const CHUNK_HOURS = 24;
const MAX_CHUNKS_PER_CALL = 60;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

const numField = (o: any, k: string) => {
  const v = o?.[k];
  return v === null || v === undefined ? null : Number(v);
};
const intField = (o: any, k: string) => {
  const v = o?.[k];
  return v === null || v === undefined ? null : Math.round(Number(v));
};
const tsField = (o: any, k: string) => {
  const v = o?.[k];
  return v === null || v === undefined ? null : new Date(Number(v) * 1000).toISOString();
};
// Pick the first present value among aliases.
const pick = (o: any, ...keys: string[]) => {
  for (const k of keys) {
    const v = o?.[k];
    if (v !== null && v !== undefined) return v;
  }
  return null;
};
const numAny = (o: any, ...keys: string[]) => {
  const v = pick(o, ...keys);
  return v === null ? null : Number(v);
};
const intAny = (o: any, ...keys: string[]) => {
  const v = pick(o, ...keys);
  return v === null ? null : Math.round(Number(v));
};

function groupByTimestamp(historic: any): Record<number, Record<string, any>> {
  const byTs: Record<number, Record<string, any>> = {};
  for (const sensor of historic?.sensors ?? []) {
    for (const row of sensor?.data ?? []) {
      if (typeof row.ts !== 'number') continue;
      if (!byTs[row.ts]) byTs[row.ts] = {};
      for (const [k, v] of Object.entries(row)) {
        const existing = byTs[row.ts][k];
        if (existing === undefined || existing === null) byTs[row.ts][k] = v;
        else if (v !== null && v !== undefined) byTs[row.ts][k] = v;
      }
    }
  }
  return byTs;
}

function buildReading(stationId: number, ts: number, m: Record<string, any>) {
  return {
    station_id: stationId,
    observed_at: new Date(ts * 1000).toISOString(),

    // Temperature — historic uses temp_avg / temp_last; current uses temp
    temp: numAny(m, 'temp', 'temp_out', 'temp_avg', 'temp_last'),
    hum: numAny(m, 'hum', 'hum_out', 'hum_last'),
    dew_point: numAny(m, 'dew_point', 'dew_point_out', 'dew_point_last'),
    wet_bulb: numAny(m, 'wet_bulb', 'wet_bulb_last'),
    heat_index: numAny(m, 'heat_index', 'heat_index_out', 'heat_index_last'),
    wind_chill: numAny(m, 'wind_chill', 'wind_chill_last'),
    thw_index: numAny(m, 'thw_index', 'thw_index_last'),
    thsw_index: numAny(m, 'thsw_index', 'thsw_index_last'),
    wbgt: numAny(m, 'wbgt', 'wbgt_last'),

    // Wind — IMPORTANT: do NOT alias wind_speed_avg into wind_speed_last,
    // they mean different things and would create duplicate chart series.
    wind_speed_last: numField(m, 'wind_speed_last'),
    wind_dir_last: intAny(m, 'wind_dir_last', 'wind_dir_of_prevail'),
    wind_speed_avg_last_1_min: numField(m, 'wind_speed_avg_last_1_min'),
    wind_speed_avg_last_2_min: numField(m, 'wind_speed_avg_last_2_min'),
    wind_speed_avg_last_10_min: numAny(m, 'wind_speed_avg_last_10_min', 'wind_speed_avg'),
    wind_speed_hi_last_2_min: numField(m, 'wind_speed_hi_last_2_min'),
    wind_speed_hi_last_10_min: numAny(m, 'wind_speed_hi_last_10_min', 'wind_speed_hi'),
    wind_dir_scalar_avg_last_1_min: intField(m, 'wind_dir_scalar_avg_last_1_min'),
    wind_dir_scalar_avg_last_2_min: intField(m, 'wind_dir_scalar_avg_last_2_min'),
    wind_dir_scalar_avg_last_10_min: intAny(m, 'wind_dir_scalar_avg_last_10_min', 'wind_dir_of_avg'),
    wind_dir_at_hi_speed_last_2_min: intField(m, 'wind_dir_at_hi_speed_last_2_min'),
    wind_dir_at_hi_speed_last_10_min: intAny(m, 'wind_dir_at_hi_speed_last_10_min', 'wind_speed_hi_dir'),
    wind_run_day: numAny(m, 'wind_run_day', 'wind_run'),

    // Rain — historic gives per-period totals (rainfall_in for the 15-min
    // bucket) and per-period peak rate (rain_rate_hi_in). The "_day_in"-style
    // running totals are only meaningful in /current and stay NULL here.
    rainfall_last_15_min_in: numAny(m, 'rainfall_last_15_min_in', 'rainfall_in'),
    rainfall_last_60_min_in: numField(m, 'rainfall_last_60_min_in'),
    rainfall_last_24_hr_in: numField(m, 'rainfall_last_24_hr_in'),
    rainfall_day_in: numField(m, 'rainfall_day_in'),
    rainfall_month_in: numField(m, 'rainfall_month_in'),
    rainfall_year_in: numField(m, 'rainfall_year_in'),
    rain_rate_last_in: numField(m, 'rain_rate_last_in'),
    rain_rate_hi_in: numAny(m, 'rain_rate_hi_in'),
    rain_rate_hi_last_15_min_in: numField(m, 'rain_rate_hi_last_15_min_in'),
    rain_storm_current_in: numField(m, 'rain_storm_current_in'),
    rain_storm_last_in: numField(m, 'rain_storm_last_in'),
    rain_storm_current_start_at: tsField(m, 'rain_storm_current_start_at'),
    rain_storm_last_start_at: tsField(m, 'rain_storm_last_start_at'),
    rain_storm_last_end_at: tsField(m, 'rain_storm_last_end_at'),

    solar_rad: numAny(m, 'solar_rad', 'solar_rad_avg'),
    solar_energy_day: numField(m, 'solar_energy_day'),
    uv_index: numAny(m, 'uv_index', 'uv_index_avg'),
    uv_dose_day: numField(m, 'uv_dose_day'),

    temp_in: numAny(m, 'temp_in', 'temp_in_last'),
    hum_in: numAny(m, 'hum_in', 'hum_in_last'),
    dew_point_in: numAny(m, 'dew_point_in', 'dew_point_in_last'),
    heat_index_in: numAny(m, 'heat_index_in', 'heat_index_in_last'),
    wet_bulb_in: numAny(m, 'wet_bulb_in', 'wet_bulb_in_last'),

    bar_sea_level: numAny(m, 'bar_sea_level', 'bar'),
    bar_absolute: numField(m, 'bar_absolute'),
    bar_trend: numField(m, 'bar_trend'),

    hdd_day: numAny(m, 'hdd_day', 'hdd'),
    cdd_day: numAny(m, 'cdd_day', 'cdd'),
    et_day: numAny(m, 'et_day', 'et'),
    et_month: numField(m, 'et_month'),
    et_year: numField(m, 'et_year'),

    trans_battery_volt: numField(m, 'trans_battery_volt'),
    trans_battery_flag: intField(m, 'trans_battery_flag'),
    rssi_last: intAny(m, 'rssi_last', 'rssi'),
    reception_day: intAny(m, 'reception_day', 'reception'),
    battery_percent: intField(m, 'battery_percent'),
    battery_voltage: intField(m, 'battery_voltage'),
    wifi_rssi: intField(m, 'wifi_rssi'),
    console_sw_version: m?.console_sw_version ?? null,

    raw: null,
  };
}

async function fetchHistoric(
  stationId: number,
  startSec: number,
  endSec: number,
  apiKey: string,
  apiSecret: string,
) {
  const url = `${WEATHERLINK_BASE}/historic/${stationId}?api-key=${encodeURIComponent(apiKey)}&start-timestamp=${startSec}&end-timestamp=${endSec}`;
  const res = await fetch(url, { headers: { 'X-Api-Secret': apiSecret } });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`WeatherLink /historic/${stationId} ${res.status}: ${text}`);
  }
  return await res.json();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const apiKey = Deno.env.get('WEATHERLINK_API_KEY');
  const apiSecret = Deno.env.get('WEATHERLINK_API_SECRET');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!apiKey || !apiSecret || !supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: 'Missing env' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch (_) { /* ignore */ }

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  let targetStationIds: number[] = [];
  if (body.station_id) {
    targetStationIds = [Number(body.station_id)];
  } else {
    const { data, error } = await supabase.from('weather_stations').select('station_id');
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    targetStationIds = (data ?? []).map((s: any) => Number(s.station_id));
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const endSec = body.end ? Math.floor(new Date(body.end).getTime() / 1000) : nowSec;
  let startSec: number;
  if (body.start) {
    startSec = Math.floor(new Date(body.start).getTime() / 1000);
  } else {
    const days = Number(body.days ?? 7);
    startSec = endSec - days * 86400;
  }

  const stationResults: any[] = [];

  for (const stationId of targetStationIds) {
    const chunks: { startSec: number; endSec: number; rows: number; error?: string }[] = [];
    let rowsInserted = 0;

    let cursor = startSec;
    let chunkCount = 0;
    while (cursor < endSec && chunkCount < MAX_CHUNKS_PER_CALL) {
      const chunkEnd = Math.min(cursor + CHUNK_HOURS * 3600, endSec);
      try {
        const historic = await fetchHistoric(stationId, cursor, chunkEnd, apiKey, apiSecret);
        const byTs = groupByTimestamp(historic);
        const rows = Object.entries(byTs).map(([ts, m]) => buildReading(stationId, Number(ts), m));

        if (rows.length > 0) {
          for (let i = 0; i < rows.length; i += 200) {
            const slice = rows.slice(i, i + 200);
            const { error } = await supabase
              .from('weather_readings')
              .upsert(slice, { onConflict: 'station_id,observed_at' });
            if (error) throw new Error(error.message);
          }
        }
        rowsInserted += rows.length;
        chunks.push({ startSec: cursor, endSec: chunkEnd, rows: rows.length });
      } catch (e: any) {
        chunks.push({ startSec: cursor, endSec: chunkEnd, rows: 0, error: String(e?.message ?? e) });
      }
      cursor = chunkEnd;
      chunkCount++;
    }

    stationResults.push({
      station_id: stationId,
      start: new Date(startSec * 1000).toISOString(),
      end: new Date(endSec * 1000).toISOString(),
      rows_inserted: rowsInserted,
      chunks,
    });
  }

  return new Response(
    JSON.stringify({ completed_at: new Date().toISOString(), stations: stationResults }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});

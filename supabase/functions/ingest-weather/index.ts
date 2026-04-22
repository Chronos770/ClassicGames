// Supabase Edge Function: ingest-weather
//
// Polls the WeatherLink v2 API for every station in weather_stations and
// upserts a row into weather_readings. Called on a schedule (pg_cron or
// Supabase cron) and also on-demand from the admin UI.
//
// Required environment variables (set via `supabase secrets set`):
//   WEATHERLINK_API_KEY      -- WeatherLink API Key v2
//   WEATHERLINK_API_SECRET   -- WeatherLink API Secret
//   SUPABASE_URL             -- auto-provided in Edge runtime
//   SUPABASE_SERVICE_ROLE_KEY -- auto-provided in Edge runtime

// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const WEATHERLINK_BASE = 'https://api.weatherlink.com/v2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

interface IngestResult {
  station_id: number;
  ok: boolean;
  observed_at?: string;
  error?: string;
}

// Fields that come back as strings or numbers we pass through directly.
// Key = reading column, value = function to extract from the flattened sensors object.
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

// Flatten the sensors[].data[0] arrays so we can pull fields by name regardless
// of which sensor they live on. When two sensors have the same field name the
// later sensor wins (usually fine since they are on different units).
function flattenSensors(current: any): { merged: Record<string, any>; observed_at: Date } {
  const merged: Record<string, any> = {};
  let latest = 0;
  for (const sensor of current?.sensors ?? []) {
    for (const row of sensor?.data ?? []) {
      for (const [k, v] of Object.entries(row)) {
        if (merged[k] === undefined || merged[k] === null) merged[k] = v;
        else if (v !== null && v !== undefined) merged[k] = v;
      }
      if (typeof row.ts === 'number' && row.ts > latest) latest = row.ts;
    }
  }
  return { merged, observed_at: new Date((latest || Math.floor(Date.now() / 1000)) * 1000) };
}

function buildReading(stationId: number, current: any) {
  const { merged: m, observed_at } = flattenSensors(current);
  return {
    station_id: stationId,
    observed_at: observed_at.toISOString(),

    temp: numField(m, 'temp'),
    hum: numField(m, 'hum'),
    dew_point: numField(m, 'dew_point'),
    wet_bulb: numField(m, 'wet_bulb'),
    heat_index: numField(m, 'heat_index'),
    wind_chill: numField(m, 'wind_chill'),
    thw_index: numField(m, 'thw_index'),
    thsw_index: numField(m, 'thsw_index'),
    wbgt: numField(m, 'wbgt'),

    wind_speed_last: numField(m, 'wind_speed_last'),
    wind_dir_last: intField(m, 'wind_dir_last'),
    wind_speed_avg_last_1_min: numField(m, 'wind_speed_avg_last_1_min'),
    wind_speed_avg_last_2_min: numField(m, 'wind_speed_avg_last_2_min'),
    wind_speed_avg_last_10_min: numField(m, 'wind_speed_avg_last_10_min'),
    wind_speed_hi_last_2_min: numField(m, 'wind_speed_hi_last_2_min'),
    wind_speed_hi_last_10_min: numField(m, 'wind_speed_hi_last_10_min'),
    wind_dir_scalar_avg_last_1_min: intField(m, 'wind_dir_scalar_avg_last_1_min'),
    wind_dir_scalar_avg_last_2_min: intField(m, 'wind_dir_scalar_avg_last_2_min'),
    wind_dir_scalar_avg_last_10_min: intField(m, 'wind_dir_scalar_avg_last_10_min'),
    wind_dir_at_hi_speed_last_2_min: intField(m, 'wind_dir_at_hi_speed_last_2_min'),
    wind_dir_at_hi_speed_last_10_min: intField(m, 'wind_dir_at_hi_speed_last_10_min'),
    wind_run_day: numField(m, 'wind_run_day'),

    rainfall_last_15_min_in: numField(m, 'rainfall_last_15_min_in'),
    rainfall_last_60_min_in: numField(m, 'rainfall_last_60_min_in'),
    rainfall_last_24_hr_in: numField(m, 'rainfall_last_24_hr_in'),
    rainfall_day_in: numField(m, 'rainfall_day_in'),
    rainfall_month_in: numField(m, 'rainfall_month_in'),
    rainfall_year_in: numField(m, 'rainfall_year_in'),
    rain_rate_last_in: numField(m, 'rain_rate_last_in'),
    rain_rate_hi_in: numField(m, 'rain_rate_hi_in'),
    rain_rate_hi_last_15_min_in: numField(m, 'rain_rate_hi_last_15_min_in'),
    rain_storm_current_in: numField(m, 'rain_storm_current_in'),
    rain_storm_last_in: numField(m, 'rain_storm_last_in'),
    rain_storm_current_start_at: tsField(m, 'rain_storm_current_start_at'),
    rain_storm_last_start_at: tsField(m, 'rain_storm_last_start_at'),
    rain_storm_last_end_at: tsField(m, 'rain_storm_last_end_at'),

    solar_rad: numField(m, 'solar_rad'),
    solar_energy_day: numField(m, 'solar_energy_day'),
    uv_index: numField(m, 'uv_index'),
    uv_dose_day: numField(m, 'uv_dose_day'),

    temp_in: numField(m, 'temp_in'),
    hum_in: numField(m, 'hum_in'),
    dew_point_in: numField(m, 'dew_point_in'),
    heat_index_in: numField(m, 'heat_index_in'),
    wet_bulb_in: numField(m, 'wet_bulb_in'),

    bar_sea_level: numField(m, 'bar_sea_level'),
    bar_absolute: numField(m, 'bar_absolute'),
    bar_trend: numField(m, 'bar_trend'),

    hdd_day: numField(m, 'hdd_day'),
    cdd_day: numField(m, 'cdd_day'),
    et_day: numField(m, 'et_day'),
    et_month: numField(m, 'et_month'),
    et_year: numField(m, 'et_year'),

    trans_battery_volt: numField(m, 'trans_battery_volt'),
    trans_battery_flag: intField(m, 'trans_battery_flag'),
    rssi_last: intField(m, 'rssi_last'),
    reception_day: intField(m, 'reception_day'),
    battery_percent: intField(m, 'battery_percent'),
    battery_voltage: intField(m, 'battery_voltage'),
    wifi_rssi: intField(m, 'wifi_rssi'),
    console_sw_version: m?.console_sw_version ?? null,

    raw: current,
  };
}

async function fetchCurrent(stationId: number, apiKey: string, apiSecret: string) {
  const url = `${WEATHERLINK_BASE}/current/${stationId}?api-key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, { headers: { 'X-Api-Secret': apiSecret } });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`WeatherLink /current/${stationId} ${res.status}: ${text}`);
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
    return new Response(
      JSON.stringify({ error: 'Missing required environment variables' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  // Pull all stations from our metadata table (seeded with your station).
  const { data: stations, error: stationsErr } = await supabase
    .from('weather_stations')
    .select('station_id');

  if (stationsErr) {
    return new Response(
      JSON.stringify({ error: stationsErr.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const results: IngestResult[] = [];

  for (const s of stations ?? []) {
    try {
      const current = await fetchCurrent(s.station_id, apiKey, apiSecret);
      const reading = buildReading(s.station_id, current);

      const { error: insertErr } = await supabase
        .from('weather_readings')
        .upsert(reading, { onConflict: 'station_id,observed_at' });

      if (insertErr) throw new Error(insertErr.message);

      await supabase
        .from('weather_stations')
        .update({ last_ingested_at: new Date().toISOString() })
        .eq('station_id', s.station_id);

      results.push({ station_id: s.station_id, ok: true, observed_at: reading.observed_at });
    } catch (e: any) {
      results.push({ station_id: s.station_id, ok: false, error: String(e?.message ?? e) });
    }
  }

  return new Response(
    JSON.stringify({ ingested_at: new Date().toISOString(), results }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});

// Supabase Edge Function: discover-weather-stations
//
// Calls the WeatherLink v2 `/stations` endpoint with the account-level API
// credentials, then upserts any stations we don't already track into the
// `weather_stations` table. Intended to be called on-demand from the admin
// UI so adding a station in the WeatherLink app automatically surfaces it
// on the Castle & Cards weather page.
//
// Required env:
//   WEATHERLINK_API_KEY
//   WEATHERLINK_API_SECRET
//   SUPABASE_URL              (auto)
//   SUPABASE_SERVICE_ROLE_KEY (auto)

// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const WEATHERLINK_BASE = 'https://api.weatherlink.com/v2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

interface DiscoveredStation {
  station_id: number;
  station_id_uuid: string | null;
  station_name: string;
  city: string | null;
  region: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  elevation: number | null;
  time_zone: string | null;
  gateway_type: string | null;
  product_number: string | null;
  subscription_type: string | null;
  recording_interval: number | null;
  firmware_version: string | null;
  registered_date: string | null;
  new: boolean;
}

function asNum(v: any): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function asStr(v: any): string | null {
  if (v === null || v === undefined) return null;
  return String(v);
}
function asTs(v: any): string | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return new Date(n * 1000).toISOString();
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

  // Pull list of stations from WeatherLink account.
  let apiResp: any;
  try {
    const url = `${WEATHERLINK_BASE}/stations?api-key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, { headers: { 'X-Api-Secret': apiSecret } });
    if (!res.ok) {
      const text = await res.text();
      return new Response(
        JSON.stringify({ error: `WeatherLink /stations ${res.status}: ${text}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    apiResp = await res.json();
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: `WeatherLink fetch failed: ${String(e?.message ?? e)}` }),
      { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const remote: any[] = apiResp?.stations ?? [];

  // Pull existing stations so we can annotate which ones are new and
  // preserve any fields that were manually corrected (notably elevation,
  // which WeatherLink consoles sometimes ship with wrong values from the
  // initial setup).
  const { data: existing } = await supabase
    .from('weather_stations')
    .select('station_id, elevation, station_name');
  const existingIds = new Set((existing ?? []).map((s: any) => Number(s.station_id)));
  const existingById = new Map<number, { elevation: number | null; station_name: string | null }>();
  for (const s of (existing ?? []) as any[]) {
    existingById.set(Number(s.station_id), {
      elevation: s.elevation ?? null,
      station_name: s.station_name ?? null,
    });
  }

  const discovered: DiscoveredStation[] = [];
  for (const s of remote) {
    const id = asNum(s.station_id);
    if (id === null) continue;
    const prior = existingById.get(id);
    // Preserve manually-corrected elevation + station name on existing
    // rows. WeatherLink consoles often ship with garbage elevation from
    // initial setup, and users may rename their station too — both should
    // survive a re-run of discover.
    const elevation = prior?.elevation ?? asNum(s.elevation);
    const stationName = prior?.station_name ?? asStr(s.station_name) ?? `Station ${id}`;
    const row = {
      station_id: id,
      station_id_uuid: asStr(s.station_id_uuid),
      station_name: stationName,
      city: asStr(s.city),
      region: asStr(s.region),
      country: asStr(s.country),
      latitude: asNum(s.latitude),
      longitude: asNum(s.longitude),
      elevation,
      time_zone: asStr(s.time_zone),
      gateway_type: asStr(s.gateway_type),
      product_number: asStr(s.product_number),
      subscription_type: asStr(s.subscription_type ?? s.subscription_end_date),
      recording_interval: asNum(s.recording_interval),
      firmware_version: asStr(s.firmware_version ?? null),
      registered_date: asTs(s.registered_date),
    };

    const { error: upsertErr } = await supabase
      .from('weather_stations')
      .upsert(row, { onConflict: 'station_id' });
    if (upsertErr) {
      discovered.push({ ...row, new: false } as DiscoveredStation);
      continue;
    }
    discovered.push({ ...row, new: !existingIds.has(id) });
  }

  return new Response(
    JSON.stringify({
      discovered_at: new Date().toISOString(),
      total: discovered.length,
      new_count: discovered.filter((d) => d.new).length,
      stations: discovered,
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});

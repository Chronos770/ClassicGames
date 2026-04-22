// Supabase Edge Function: weather-proxy
//
// Server-side proxy for external weather APIs (NWS, RainViewer) so browsers
// don't trip CORS or User-Agent requirements.
//
// POST body:
//   { kind: 'nws-forecast',  lat: number, lon: number }
//   { kind: 'nws-hourly',    lat: number, lon: number }
//   { kind: 'nws-alerts',    lat: number, lon: number }
//   { kind: 'nws-point',     lat: number, lon: number }
//   { kind: 'rainviewer' }

// deno-lint-ignore-file no-explicit-any

const NWS_BASE = 'https://api.weather.gov';
const RAINVIEWER_MAPS = 'https://api.rainviewer.com/public/weather-maps.json';

// NWS requires a User-Agent. Identify the app + contact for good API citizenship.
const NWS_UA = 'CastleAndCards/1.0 (sfisherit@gmail.com)';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

async function nwsFetch(url: string) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': NWS_UA,
      Accept: 'application/geo+json',
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`NWS ${res.status}: ${text.slice(0, 500)}`);
  }
  return await res.json();
}

// Simple in-function cache for the /points endpoint (rarely changes per lat/lon)
const pointCache = new Map<string, { at: number; data: any }>();
async function getPoint(lat: number, lon: number) {
  const key = `${lat.toFixed(4)},${lon.toFixed(4)}`;
  const hit = pointCache.get(key);
  if (hit && Date.now() - hit.at < 24 * 3600_000) return hit.data;
  const data = await nwsFetch(`${NWS_BASE}/points/${key}`);
  pointCache.set(key, { at: Date.now(), data });
  return data;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  let body: any = {};
  try {
    body = await req.json();
  } catch (_) { /* ignore */ }

  const kind = String(body.kind ?? '');
  const lat = Number(body.lat);
  const lon = Number(body.lon);

  try {
    let data: any;
    switch (kind) {
      case 'nws-point':
        data = await getPoint(lat, lon);
        break;
      case 'nws-forecast': {
        const point = await getPoint(lat, lon);
        data = await nwsFetch(point.properties.forecast);
        break;
      }
      case 'nws-hourly': {
        const point = await getPoint(lat, lon);
        data = await nwsFetch(point.properties.forecastHourly);
        break;
      }
      case 'nws-alerts':
        data = await nwsFetch(
          `${NWS_BASE}/alerts/active?point=${lat.toFixed(4)},${lon.toFixed(4)}`,
        );
        break;
      case 'rainviewer': {
        const res = await fetch(RAINVIEWER_MAPS);
        if (!res.ok) throw new Error(`RainViewer ${res.status}`);
        data = await res.json();
        break;
      }
      default:
        return new Response(JSON.stringify({ error: `Unknown kind: ${kind}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

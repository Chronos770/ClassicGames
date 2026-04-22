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
//
// Design: always returns HTTP 200, with { ok: true, data } on success or
// { ok: false, error } on failure — that way supabase-js's invoke() doesn't
// blanket-fail the whole request on a transient upstream error. We retry each
// upstream call twice with a small backoff since NWS in particular can return
// flaky 500s during forecast regeneration.

// deno-lint-ignore-file no-explicit-any

const NWS_BASE = 'https://api.weather.gov';
const RAINVIEWER_MAPS = 'https://api.rainviewer.com/public/weather-maps.json';
const NWS_UA = 'CastleAndCards/1.0 (sfisherit@gmail.com)';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchWithRetry(url: string, init: RequestInit, retries = 2): Promise<Response> {
  let lastErr: any;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, init);
      if (res.ok) return res;
      // Retry on 5xx or 429
      if (res.status >= 500 || res.status === 429) {
        lastErr = new Error(`${res.status}: ${(await res.text()).slice(0, 200)}`);
        await sleep(300 * (attempt + 1));
        continue;
      }
      // Non-retryable
      throw new Error(`${res.status}: ${(await res.text()).slice(0, 200)}`);
    } catch (e) {
      lastErr = e;
      if (attempt < retries) await sleep(300 * (attempt + 1));
    }
  }
  throw lastErr;
}

async function nwsFetch(url: string) {
  const res = await fetchWithRetry(url, {
    headers: {
      'User-Agent': NWS_UA,
      Accept: 'application/geo+json',
    },
  });
  return await res.json();
}

const pointCache = new Map<string, { at: number; data: any }>();
async function getPoint(lat: number, lon: number) {
  const key = `${lat.toFixed(4)},${lon.toFixed(4)}`;
  const hit = pointCache.get(key);
  if (hit && Date.now() - hit.at < 24 * 3600_000) return hit.data;
  const data = await nwsFetch(`${NWS_BASE}/points/${key}`);
  pointCache.set(key, { at: Date.now(), data });
  return data;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
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
        const res = await fetchWithRetry(RAINVIEWER_MAPS, {});
        data = await res.json();
        break;
      }
      default:
        return json({ ok: false, error: `Unknown kind: ${kind}` });
    }
    return json({ ok: true, data });
  } catch (e: any) {
    console.error(`weather-proxy ${kind} failed:`, e?.message ?? e);
    return json({ ok: false, error: String(e?.message ?? e).slice(0, 500) });
  }
});

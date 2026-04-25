// Supabase Edge Function: space-weather-proxy
//
// Aggregates several NOAA Space Weather Prediction Center (SWPC) public
// endpoints into a single JSON payload for the web app's Space Weather
// tab. SWPC sends CORS headers for most endpoints but rate limits
// aggressively if a page hits 5+ endpoints in parallel from the browser;
// folding everything into one server-side fetch is friendlier and lets
// us trim large arrays before they cross the wire.
//
// Public, key-free: no env vars required.

// deno-lint-ignore-file no-explicit-any

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

const SWPC = 'https://services.swpc.noaa.gov';

// SWPC "products" endpoints return [["col1","col2",...], [val,val,...], ...]
// — a header row followed by rows. Convert to array of objects.
function tabularToObjects(arr: any): Record<string, any>[] {
  if (!Array.isArray(arr) || arr.length < 2) return [];
  const [headers, ...rows] = arr;
  if (!Array.isArray(headers)) return [];
  return rows.map((row: any) => {
    const obj: Record<string, any> = {};
    if (!Array.isArray(row)) return obj;
    headers.forEach((h: string, i: number) => (obj[h] = row[i]));
    return obj;
  });
}

async function jsonOrNull<T>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': 'ClassicGamesWeather/1.0 (space-weather-proxy)' },
    });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

async function textOrNull(url: string): Promise<string | null> {
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': 'ClassicGamesWeather/1.0 (space-weather-proxy)' },
    });
    if (!r.ok) return null;
    return await r.text();
  } catch {
    return null;
  }
}

// Pull the last N records from a tabular SWPC response.
function tail<T>(arr: T[], n: number): T[] {
  if (!Array.isArray(arr)) return [];
  return arr.slice(Math.max(0, arr.length - n));
}

// Coerce anything to an array so .filter / .map don't throw if NOAA returns
// an unexpected shape (object, scalar, etc).
function asArray<T = any>(v: any): T[] {
  return Array.isArray(v) ? v : [];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    return await handle();
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: String(err),
        stack: err instanceof Error ? err.stack : null,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});

async function handle(): Promise<Response> {

  // Fire all SWPC requests in parallel.
  const [
    kp1m,
    kp3day,
    plasma,
    mag,
    xrays,
    alerts,
    scales,
    threeDayText,
    sunspotReport,
    solarRegions,
  ] = await Promise.all([
    jsonOrNull<any[]>(`${SWPC}/products/noaa-planetary-k-index.json`),
    jsonOrNull<any>(`${SWPC}/products/noaa-planetary-k-index-forecast.json`),
    jsonOrNull<any[]>(`${SWPC}/products/solar-wind/plasma-1-day.json`),
    jsonOrNull<any[]>(`${SWPC}/products/solar-wind/mag-1-day.json`),
    jsonOrNull<any[]>(`${SWPC}/json/goes/primary/xrays-6-hour.json`),
    jsonOrNull<any[]>(`${SWPC}/products/alerts.json`),
    jsonOrNull<any[]>(`${SWPC}/products/noaa-scales.json`),
    textOrNull(`${SWPC}/text/3-day-forecast.txt`),
    jsonOrNull<any[]>(`${SWPC}/json/sunspot_report.json`),
    jsonOrNull<any[]>(`${SWPC}/json/solar_regions.json`),
  ]);

  // ── Kp ─────────────────────────────────────────────────────────
  const kpRows = kp1m ? tabularToObjects(kp1m) : [];
  const kpRecent = tail(kpRows, 24).map((r) => ({
    time: r.time_tag as string,
    kp: Number(r.kp_index),
  }));
  const currentKp = kpRecent[kpRecent.length - 1]?.kp ?? null;

  // ── Solar wind ─────────────────────────────────────────────────
  const plasmaRows = plasma ? tabularToObjects(plasma) : [];
  const magRows = mag ? tabularToObjects(mag) : [];
  // Recent (last 90 minutes) for sparklines; latest for gauges.
  const plasmaRecent = tail(plasmaRows, 90).map((r) => ({
    time: r.time_tag as string,
    density: Number(r.density),
    speed: Number(r.speed),
    temperature: Number(r.temperature),
  }));
  const magRecent = tail(magRows, 90).map((r) => ({
    time: r.time_tag as string,
    bz: Number(r.bz_gsm),
    bt: Number(r.bt),
  }));
  const latestPlasma = plasmaRecent[plasmaRecent.length - 1] ?? null;
  const latestMag = magRecent[magRecent.length - 1] ?? null;

  // ── X-ray flux ─────────────────────────────────────────────────
  // Returns array of { time_tag, satellite, flux, observed_flux, energy }
  // with energy '0.1-0.8nm' (long) and '0.05-0.4nm' (short). Long is the
  // standard for flare classification.
  const xrayLong = asArray(xrays)
    .filter((r: any) => r?.energy === '0.1-0.8nm')
    .map((r: any) => ({ time: r.time_tag, flux: Number(r.flux) }));
  const latestFlux = xrayLong[xrayLong.length - 1]?.flux ?? null;

  // ── Alerts (last 24h) ──────────────────────────────────────────
  const sinceMs = Date.now() - 36 * 3600_000;
  const recentAlerts = asArray(alerts)
    .filter((a: any) => a?.issue_datetime && new Date(a.issue_datetime + 'Z').getTime() >= sinceMs)
    .slice(0, 25)
    .map((a: any) => ({
      issued: a.issue_datetime,
      product_id: a.product_id,
      message: a.message,
    }));

  // ── NOAA G/S/R scales ──────────────────────────────────────────
  // The endpoint returns either an array (newer) or object keyed by date
  // (older format). Normalize to a flat current snapshot.
  let currentScales: { G: number; S: number; R: number } | null = null;
  if (scales) {
    const obj: any = Array.isArray(scales) ? scales[0] ?? null : scales;
    if (obj) {
      const day = obj['0'] ?? obj.today ?? obj;
      const G = Number(day?.G?.Scale ?? day?.G ?? 0);
      const S = Number(day?.S?.Scale ?? day?.S ?? 0);
      const R = Number(day?.R?.Scale ?? day?.R ?? 0);
      if ([G, S, R].every((n) => Number.isFinite(n))) {
        currentScales = { G, S, R };
      }
    }
  }

  // ── Sunspots / active regions ──────────────────────────────────
  // Sunspot report = daily counts; solar_regions = currently visible regions.
  const sunspotArr = asArray(sunspotReport);
  const latestSunspot = sunspotArr.length ? sunspotArr[sunspotArr.length - 1] : null;
  const activeRegionsCount = asArray(solarRegions).filter((r: any) => r?.observed_date).length;

  // ── 3-day discussion text — extract just a couple of headers ───
  let threeDayHeadlines: string[] = [];
  if (threeDayText) {
    threeDayHeadlines = threeDayText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => /:NOAA Geomagnetic|^A\.|^B\.|^C\.|Highest Storm Level/.test(l))
      .slice(0, 8);
  }

  return new Response(
    JSON.stringify({
      fetched_at: new Date().toISOString(),
      kp: {
        current: currentKp,
        recent: kpRecent,
        forecast: kp3day ?? null,
      },
      solar_wind: {
        plasma_recent: plasmaRecent,
        mag_recent: magRecent,
        latest: {
          density: latestPlasma?.density ?? null,
          speed: latestPlasma?.speed ?? null,
          temperature: latestPlasma?.temperature ?? null,
          bz: latestMag?.bz ?? null,
          bt: latestMag?.bt ?? null,
        },
      },
      xray: {
        latest_flux: latestFlux,
        recent: tail(xrayLong, 360), // ~6h at 1-min cadence
      },
      alerts: recentAlerts,
      scales: currentScales,
      sunspots: {
        latest: latestSunspot,
        active_regions_count: activeRegionsCount,
      },
      three_day_headlines: threeDayHeadlines,
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
}

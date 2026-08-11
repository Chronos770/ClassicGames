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
//
// NOTE ON SWPC ENDPOINT CHURN: several endpoints this function relied on
// have moved or changed shape over time (that's what caused most of the
// "no data" states in the UI before this rewrite):
//   - /products/solar-wind/plasma-1-day.json and mag-1-day.json → 410/404,
//     gone. Replaced with the newer /json/rtsw/rtsw_wind_1m.json and
//     rtsw_mag_1m.json (1-min cadence, multiple redundant satellite
//     sources per timestamp — filter `active === true` for the one SWPC
//     is actually using operationally).
//   - /products/noaa-planetary-k-index.json used to be tabular
//     ([[headers],[row],...]); it's now a plain array of objects. Kept
//     tabularToObjects() for endpoints that still use the old shape, but
//     Kp is parsed directly now.
//   - /json/sunspot_report.json is a firehose of individual per-station
//     spot observations (not sorted by date, not a daily SSN total) — a
//     bad fit for "sunspot number". Swapped for
//     /json/solar-cycle/swpc_observed_ssn.json (daily observed SSN) and
//     /json/f107_cm_flux.json (daily 10.7cm radio flux).
// If SWPC moves things again, re-run the discovery pass: `curl
// https://services.swpc.noaa.gov/json/` and `/products/` list directory
// indexes (Apache autoindex), which is how these replacements were found.

// deno-lint-ignore-file no-explicit-any

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

const SWPC = 'https://services.swpc.noaa.gov';

// SWPC "products" endpoints sometimes return [["col1","col2",...], [val,val,...], ...]
// — a header row followed by rows. Convert to array of objects. (Some
// endpoints, like the planetary K-index, have since switched to returning
// plain arrays of objects directly — this function is a no-op for those.)
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

const DEBUG_ERRORS: Record<string, string> = {};

// Some SWPC feeds (rtsw_wind_1m.json, at least) emit bare `NaN` as a
// numeric value — valid in the Python `json.dumps`/JS-literal sense
// they were presumably generated with, but not valid JSON per spec.
// Browsers' `fetch().json()` and Python's `json.loads` both tolerate it
// (which is why this looked fine when spot-checked with curl+python),
// but Deno's strict JSON parser throws `SyntaxError: Unexpected token
// 'N'` on it, silently killing the whole feed via jsonOrNull's catch.
// Fetch as text and neutralize bare NaN/Infinity tokens in value
// position before parsing, rather than trusting every upstream feed to
// emit spec-compliant JSON.
function sanitizeJson(text: string): string {
  return text.replace(/:\s*(-?Infinity|NaN)\b/g, ': null');
}

async function jsonOrNull<T>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': 'ClassicGamesWeather/1.0 (space-weather-proxy)' },
    });
    if (!r.ok) {
      DEBUG_ERRORS[url] = `HTTP ${r.status}`;
      return null;
    }
    const text = await r.text();
    return JSON.parse(sanitizeJson(text)) as T;
  } catch (e) {
    DEBUG_ERRORS[url] = String(e);
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

// Pull the last N records from an array.
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
    rtswWind,
    rtswMag,
    xrays,
    alerts,
    scales,
    threeDayText,
    ssnDaily,
    f107Daily,
    solarRegions,
    ovation,
  ] = await Promise.all([
    jsonOrNull<any[]>(`${SWPC}/products/noaa-planetary-k-index.json`),
    jsonOrNull<any[]>(`${SWPC}/products/noaa-planetary-k-index-forecast.json`),
    jsonOrNull<any[]>(`${SWPC}/json/rtsw/rtsw_wind_1m.json`),
    jsonOrNull<any[]>(`${SWPC}/json/rtsw/rtsw_mag_1m.json`),
    jsonOrNull<any[]>(`${SWPC}/json/goes/primary/xrays-6-hour.json`),
    jsonOrNull<any[]>(`${SWPC}/products/alerts.json`),
    jsonOrNull<any>(`${SWPC}/products/noaa-scales.json`),
    textOrNull(`${SWPC}/text/3-day-forecast.txt`),
    jsonOrNull<any[]>(`${SWPC}/json/solar-cycle/swpc_observed_ssn.json`),
    jsonOrNull<any[]>(`${SWPC}/json/f107_cm_flux.json`),
    jsonOrNull<any[]>(`${SWPC}/json/solar_regions.json`),
    jsonOrNull<any>(`${SWPC}/json/ovation_aurora_latest.json`),
  ]);

  // ── Kp ─────────────────────────────────────────────────────────
  // noaa-planetary-k-index.json now returns a plain array of objects
  // (not the old tabular [[headers],[rows]] shape) with fields
  // {time_tag, Kp, a_running, station_count}. tabularToObjects() would
  // silently return [] for this shape (Array.isArray(headers) is false
  // when headers is actually the first data object), so parse directly
  // and try every plausible field name in case SWPC renames again.
  const kpRows = asArray<any>(kp1m)
    .map((r) => ({ time: r?.time_tag as string, kp: Number(r?.Kp ?? r?.kp ?? r?.kp_index) }))
    .filter((r) => r.time && Number.isFinite(r.kp))
    .sort((a, b) => a.time.localeCompare(b.time));
  const kpRecent = tail(kpRows, 24);
  const currentKp = kpRecent.length ? kpRecent[kpRecent.length - 1].kp : null;

  // 3-day Kp forecast — trimmed to "now onward" (drop the multi-day
  // history NOAA prepends) so the UI can show a compact upcoming strip.
  const nowIso = new Date(Date.now() - 3 * 3600_000).toISOString();
  const kpForecast = asArray<any>(kp3day)
    .map((r) => ({
      time: r?.time_tag as string,
      kp: Number(r?.kp),
      kind: (r?.observed as string) ?? 'predicted',
    }))
    .filter((r) => r.time && Number.isFinite(r.kp) && r.time >= nowIso);

  // ── Solar wind ─────────────────────────────────────────────────
  // Old /products/solar-wind/{plasma,mag}-1-day.json endpoints are gone
  // (404). The current real-time feed is /json/rtsw/rtsw_{wind,mag}_1m
  // .json, which carries redundant rows per timestamp from multiple
  // satellites (IMAP/SOLAR1/ACE/etc) — only the one flagged
  // `active: true` is SWPC's operational reading.
  const activeWind = asArray<any>(rtswWind)
    .filter((r) => r?.active === true && r?.time_tag)
    .map((r) => ({
      time: r.time_tag as string,
      density: Number(r.proton_density),
      speed: Number(r.proton_speed),
      temperature: Number(r.proton_temperature),
    }))
    .sort((a, b) => a.time.localeCompare(b.time));
  const activeMag = asArray<any>(rtswMag)
    .filter((r) => r?.active === true && r?.time_tag)
    .map((r) => ({
      time: r.time_tag as string,
      bz: Number(r.bz_gsm),
      bt: Number(r.bt),
    }))
    .sort((a, b) => a.time.localeCompare(b.time));
  const plasmaRecent = tail(activeWind, 90);
  const magRecent = tail(activeMag, 90);
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

  // ── Alerts (last 36h) ──────────────────────────────────────────
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
  // (older format, still what's live: {"0": {...today}, "1": {...}, ...}).
  // Normalize to a flat current snapshot.
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

  // ── Sunspots ───────────────────────────────────────────────────
  // swpc_observed_ssn.json is a proper daily SSN (sunspot number) time
  // series going back to the 1990s — NOT sorted-guaranteed, so pick by
  // max date rather than array position. Same for the 10.7cm flux feed,
  // which interleaves Morning/Noon/Afternoon readings out of order.
  const ssnRows = asArray<any>(ssnDaily).filter((r) => r?.Obsdate && Number.isFinite(Number(r.swpc_ssn)));
  const latestSsn = ssnRows.reduce<any>((best, r) => (!best || r.Obsdate > best.Obsdate ? r : best), null);
  const f107Rows = asArray<any>(f107Daily).filter((r) => r?.time_tag && Number.isFinite(Number(r.flux)));
  const latestF107 = f107Rows.reduce<any>((best, r) => (!best || r.time_tag > best.time_tag ? r : best), null);

  // Active regions = numbered sunspot groups NOAA currently has under
  // observation. solar_regions.json contains every region ever observed
  // (going back weeks), so count only rows from the most recent
  // observed_date rather than the whole file.
  const regionRows = asArray(solarRegions);
  let latestObsDate: string | null = null;
  for (const r of regionRows as any[]) {
    const d = r?.observed_date;
    if (typeof d === 'string' && (!latestObsDate || d > latestObsDate)) latestObsDate = d;
  }
  const activeRegionsCount = latestObsDate
    ? regionRows.filter((r: any) => r?.observed_date === latestObsDate).length
    : 0;

  // ── 3-day discussion text — extract just a couple of headers ───
  let threeDayHeadlines: string[] = [];
  if (threeDayText) {
    threeDayHeadlines = threeDayText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => /:NOAA Geomagnetic|^A\.|^B\.|^C\.|Highest Storm Level/.test(l))
      .slice(0, 8);
  }

  // ── Aurora oval (OVATION nowcast) ───────────────────────────────
  // NOAA's OVATION Prime model — the closest thing to a "radar" for
  // aurora: a 1°x1° global grid of aurora probability/intensity (0-100),
  // refreshed every ~5 min, forecast ~30-60 min ahead. Full grid is
  // 360x181 = 65,160 points (~900KB); aurora only ever appears at
  // magnetic latitudes above roughly ±35° even in extreme storms, and
  // the low/mid-latitude band is always zero, so we crop to |lat|>=35 and
  // downsample to a 2° grid — keeps visual fidelity for a compact polar
  // plot while cutting payload ~85%.
  let aurora: {
    observation_time: string;
    forecast_time: string;
    resolution_deg: number;
    points: [number, number, number][];
  } | null = null;
  if (ovation && Array.isArray(ovation.coordinates)) {
    const points: [number, number, number][] = [];
    for (const c of ovation.coordinates as any[]) {
      if (!Array.isArray(c) || c.length < 3) continue;
      const lon = Number(c[0]);
      const lat = Number(c[1]);
      const val = Number(c[2]);
      if (!Number.isFinite(lon) || !Number.isFinite(lat) || !Number.isFinite(val)) continue;
      if (Math.abs(lat) < 35) continue;
      if (Math.abs(lat) % 2 !== 0 || Math.abs(lon) % 2 !== 0) continue;
      points.push([lon, lat, val]);
    }
    aurora = {
      observation_time: ovation['Observation Time'] ?? null,
      forecast_time: ovation['Forecast Time'] ?? null,
      resolution_deg: 2,
      points,
    };
  }

  return new Response(
    JSON.stringify({
      fetched_at: new Date().toISOString(),
      kp: {
        current: currentKp,
        recent: kpRecent,
        forecast: kpForecast,
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
        ssn: latestSsn ? Number(latestSsn.swpc_ssn) : null,
        ssn_date: latestSsn?.Obsdate ?? null,
        f10: latestF107 ? Number(latestF107.flux) : null,
        f10_date: latestF107?.time_tag ?? null,
        active_regions_count: activeRegionsCount,
      },
      three_day_headlines: threeDayHeadlines,
      aurora,
      _debug_fetch_errors: DEBUG_ERRORS,
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
}

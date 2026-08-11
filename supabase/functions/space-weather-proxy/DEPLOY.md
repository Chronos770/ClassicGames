# space-weather-proxy — deploy steps

Edge function that powers the **Weather → Space tab**. Aggregates several
NOAA Space Weather Prediction Center (SWPC) public endpoints into a single
JSON payload for the client. Required for the Space tab to show anything.

## Status

- [x] Source committed: `supabase/functions/space-weather-proxy/index.ts`
- [x] Deployed (Supabase project `qjjfrblhnvfmrlpujbzx`, `verify_jwt: false`
      to match `weather-proxy`/`news-proxy`/etc — despite what an earlier
      version of this doc said, none of this project's edge functions
      currently require JWT verification)

No DB migration needed — this function is read-only and uses no DB.

## 2026-08-11 rewrite — most fields were silently empty

A full audit found the function was returning null/empty for Kp, solar
wind, and sunspots — not because it wasn't deployed, but because several
upstream SWPC endpoints had moved or changed shape since this was written,
and failures were swallowed silently by `jsonOrNull`'s catch block:

- `/products/solar-wind/{plasma,mag}-1-day.json` → gone (404). Replaced
  with `/json/rtsw/rtsw_{wind,mag}_1m.json` (filter `active === true`,
  multiple redundant satellite sources per timestamp).
- `/products/noaa-planetary-k-index.json` switched from tabular
  (`[[headers],[row],...]`) to a plain array of objects — the old
  `tabularToObjects()` parse silently returned `[]` for the new shape.
- `/json/sunspot_report.json` is a per-station spot log, not a daily SSN
  total, and isn't date-sorted. Replaced with
  `/json/solar-cycle/swpc_observed_ssn.json` (daily SSN) and
  `/json/f107_cm_flux.json` (daily 10.7cm flux).
- `rtsw_wind_1m.json` occasionally emits bare `NaN` as a numeric value,
  which is invalid strict JSON — Deno's `Response.json()` throws on it
  (though Python/browser JSON parsers silently tolerate it, which is why
  a curl+python spot-check looked fine). Fixed by fetching as text and
  sanitizing `NaN`/`Infinity` before `JSON.parse()`.
- `active_regions_count` was counting the entire multi-week
  `solar_regions.json` archive (~200+) instead of just the most recent
  observed date (~6).

Also added: a NOAA OVATION aurora nowcast grid (`aurora` field) and a
3-day Kp forecast (`kp.forecast`), both now rendered in the UI.

If SWPC moves things again, re-run the discovery pass: `curl
https://services.swpc.noaa.gov/json/` and `.../products/` return Apache
directory listings — that's how the replacements above were found. The
response also includes a `_debug_fetch_errors` field (endpoint URL → error
string) for exactly this kind of troubleshooting, without needing another
round of guess-and-check.

## To deploy

### Option A — Supabase MCP (preferred if available)

If a Supabase MCP server is wired into the Claude session, deploy via its
function-deploy tool with the exact name:

    space-weather-proxy

Body is `supabase/functions/space-weather-proxy/index.ts`. Verify-JWT
should be **on** to match `weather-proxy` / `news-proxy` / etc.

### Option B — Supabase CLI

```sh
supabase functions deploy space-weather-proxy
```

### Option C — Supabase Dashboard

1. Edge Functions → "Deploy a new function"
2. Name: `space-weather-proxy` (exact, lowercase, hyphens)
3. Paste the full file contents
4. Leave Verify JWT on
5. Deploy

## Verify

After deploy, open Weather → Space. The page should populate with current
Kp, solar wind speed/Bz, X-ray flux, alerts, NOAA G/S/R scales, sunspots,
and a daily SDO sun image.

If it errors:
- Functions → space-weather-proxy → Logs — check for fetch failures
- SWPC occasionally rate-limits during major solar events; retry in a few minutes
- Browser DevTools → Network — check the `space-weather-proxy` invocation response

## Rollback

`supabase functions delete space-weather-proxy`. The Space tab will then
show "couldn't load space weather data" empty state — nothing else in the
app depends on it.

## Related files

- `supabase/functions/space-weather-proxy/index.ts` — function source
- `src/lib/spaceWeatherService.ts` — frontend service
- `src/ui/weather/SpaceWeatherTab.tsx` — tab UI

## Data sources (all NOAA SWPC, public, key-free)

- Planetary K index (1-min): `/products/noaa-planetary-k-index.json`
- 3-day Kp forecast: `/products/noaa-planetary-k-index-forecast.json`
- Solar wind plasma (1-day): `/products/solar-wind/plasma-1-day.json`
- Solar wind magnetic field (1-day): `/products/solar-wind/mag-1-day.json`
- GOES X-ray flux (6h): `/json/goes/primary/xrays-6-hour.json`
- Alerts: `/products/alerts.json`
- NOAA scales: `/products/noaa-scales.json`
- 3-day forecast text: `/text/3-day-forecast.txt`
- Sunspot report: `/json/sunspot_report.json`
- Active solar regions: `/json/solar_regions.json`

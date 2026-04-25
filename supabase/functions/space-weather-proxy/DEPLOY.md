# space-weather-proxy — deploy steps

Edge function that powers the **Weather → Space tab**. Aggregates several
NOAA Space Weather Prediction Center (SWPC) public endpoints into a single
JSON payload for the client. Required for the Space tab to show anything.

## Status

- [x] Source committed: `supabase/functions/space-weather-proxy/index.ts`
- [ ] **Function not yet deployed to Supabase project**

No DB migration needed — this function is read-only and uses no DB.

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

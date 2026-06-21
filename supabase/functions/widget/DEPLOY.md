# widget — deploy steps

Edge function that powers the **Android home-screen widget**
(see `android-widget/`). One GET endpoint returns the latest station
reading + NWS forecast + active alert as a single compact JSON shape.

## Status

- [x] Source committed: `supabase/functions/widget/index.ts`
- [x] **Deployed** to project `qjjfrblhnvfmrlpujbzx` (ClassicGames)
      at `https://qjjfrblhnvfmrlpujbzx.supabase.co/functions/v1/widget`
- [x] `verify_jwt: false` (matches the other weather functions; the
      Android client still sends `Authorization: Bearer <anon>` and
      `apikey: <anon>` headers so platform routing works)

## Redeploy

### Option A — Supabase MCP (preferred if available)

Function name: `widget`. Body: contents of `index.ts`. `verify_jwt: false`.

### Option B — Supabase CLI

```sh
supabase functions deploy widget --no-verify-jwt
```

### Option C — Dashboard

1. Dashboard → **Edge Functions** → "Deploy a new function"
2. Name: `widget`
3. Paste contents of `index.ts`
4. **Verify JWT: off**
5. Deploy

## Verify

```sh
curl -H "apikey: $ANON" -H "Authorization: Bearer $ANON" \
  https://qjjfrblhnvfmrlpujbzx.supabase.co/functions/v1/widget
```

Expected shape:

```json
{ "ok": true, "data": {
  "location": "Gilliam",
  "current": { "temp": 70, "feels": 70, "icon": "thunder", "alert": "Flood Watch", ... },
  "forecast": [{ "day": "SUN", "icon": "thunder", "hi": 65, "lo": 65 }, ...]
} }
```

Pass `?station_id=N` to pick a specific station; default is the first
row in `weather_stations` ordered by `station_id`.

## Related files

- `supabase/functions/widget/index.ts` — function source
- `android-widget/` — Glance widget client
- `android-widget/app/src/main/res/values/widget_config.xml` — endpoint + anon key
- `android-widget/app/src/main/kotlin/com/castleandcards/weather/widget/WeatherRepo.kt` — fetch + cache

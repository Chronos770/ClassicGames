# Weather Dashboard Setup

The weather dashboard is built into Castle & Cards at `/weather`, visible only to admins.

## What's wired up

- **Route**: `/weather` in `src/App.tsx` (admin-gated in `WeatherPage.tsx`)
- **Nav link**: "Weather" appears in the header for admin users
- **UI**: `src/ui/WeatherPage.tsx` + `src/ui/weather/*`
- **Data layer**: `src/lib/weatherService.ts` reads from Supabase
- **Migration**: `supabase/migrations/006_weather.sql`
- **Edge Function**: `supabase/functions/ingest-weather/index.ts`

## Three manual steps to go live

Everything that can't be automated from this environment:

### 1. Apply the migration

Open the Supabase SQL Editor for project `qjjfrblhnvfmrlpujbzx` and paste the full contents of `supabase/migrations/006_weather.sql`. Run it. This creates:

- `weather_stations` (seeded with your Walnut Farms station, ID 235190)
- `weather_readings` time-series table
- `weather_latest` view
- Admin-only RLS policies

### 2. Deploy the Edge Function

```bash
# one-time: log in to Supabase
npx supabase@latest login

# from the 05_game_platform directory:
npx supabase@latest link --project-ref qjjfrblhnvfmrlpujbzx

# set WeatherLink credentials as function secrets
npx supabase@latest secrets set \
  WEATHERLINK_API_KEY=xkpzqrlphw06ocjtdhxo1le5exhiisym \
  WEATHERLINK_API_SECRET=oesspr6ggyzmhuolq6webrcriox2rr7v

# deploy the function
npx supabase@latest functions deploy ingest-weather
```

### 3. Schedule it to run every 10 minutes

In the Supabase dashboard, go to **Database → Integrations → pg_cron** (enable if not already) and add a new scheduled job:

- **Name**: `ingest-weather`
- **Schedule**: `*/10 * * * *` (every 10 minutes)
- **SQL**:
  ```sql
  SELECT net.http_post(
    url := 'https://qjjfrblhnvfmrlpujbzx.supabase.co/functions/v1/ingest-weather',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb
  );
  ```

  *Alternative if you don't want to configure `app.settings.service_role_key`*: use the anon key instead — the function doesn't verify auth, it uses the service role from its own env:
  ```sql
  SELECT net.http_post(
    url := 'https://qjjfrblhnvfmrlpujbzx.supabase.co/functions/v1/ingest-weather',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := '{}'::jsonb
  );
  ```

  If `pg_cron` / `pg_net` aren't your thing, you can also use **Supabase Dashboard → Edge Functions → ingest-weather → Schedule** (newer UI) or any external cron that hits the URL.

## Verifying

1. Visit `/weather` while signed in as an admin.
2. If the page is empty, click **Refresh** — it calls the Edge Function once and pulls live data.
3. Every subsequent scheduled run builds historical data for the charts.

## Security notes

- API key/secret are stored as Supabase Function secrets, never shipped to the browser
- `weather_readings` and `weather_stations` have RLS policies allowing SELECT only for admins
- The Edge Function uses `SUPABASE_SERVICE_ROLE_KEY` (auto-provided in Edge runtime) to bypass RLS on writes

## Adding more stations later

Just insert into `weather_stations`:

```sql
INSERT INTO public.weather_stations (station_id, station_name, city, region)
VALUES (<id>, '<name>', '<city>', '<region>');
```

The Edge Function loops over all rows in that table on each run.

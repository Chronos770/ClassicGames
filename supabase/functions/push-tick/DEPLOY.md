# push-tick — deploy steps

Cron-driven function that runs the threshold checks and triggers
push-send for matched users. Should run every 15 minutes via pg_cron.

## Status

- [x] Source committed: `supabase/functions/push-tick/index.ts`
- [ ] **Function deployed**
- [ ] **pg_cron schedule configured**

## Deploy

### Supabase MCP / Dashboard / CLI
Same pattern as the other proxies. Name exactly: `push-tick`. `verify_jwt: false`.
No env vars needed beyond the auto-provided `SUPABASE_URL` /
`SUPABASE_SERVICE_ROLE_KEY`.

```sh
supabase functions deploy push-tick --project-ref <ref>
```

## Schedule with pg_cron

Run this SQL once in the SQL Editor (replace the placeholders with your
project values):

```sql
-- Enable pg_net + pg_cron if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Run push-tick every 15 minutes
SELECT cron.schedule(
  'weather-push-tick',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/push-tick',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <SUPABASE_SERVICE_ROLE_KEY>'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Verify
SELECT * FROM cron.job WHERE jobname = 'weather-push-tick';
```

To remove later:
```sql
SELECT cron.unschedule('weather-push-tick');
```

## Manual test

```sh
curl -X POST https://<PROJECT_REF>.supabase.co/functions/v1/push-tick \
  -H "Authorization: Bearer <SUPABASE_ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Response includes a `results` object showing which alerts (if any) fired.

## Rollback

`supabase functions delete push-tick` and run the cron `unschedule` SQL.

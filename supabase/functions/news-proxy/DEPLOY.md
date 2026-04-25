# news-proxy — deploy steps

Edge function that powers the **Weather → News tab**. Fetches YouTube uploads
RSS feeds for the channels in `weather_news_sources` and returns the latest
videos as JSON. Required for the News tab to show anything.

## Status

- [x] Source committed: `supabase/functions/news-proxy/index.ts`
- [x] DB migration ran: `supabase/migrations/009_weather_news_sources.sql`
      (table + RLS + 2 seed channels)
- [ ] **Function not yet deployed to Supabase project**

## To deploy

Pick whichever path is easiest in the current session.

### Option A — Supabase MCP (preferred if available)

If a Supabase MCP server is wired into the Claude session, use the
`deploy_function` (or equivalent) tool. The function name must be exactly:

    news-proxy

The body is the entire contents of `supabase/functions/news-proxy/index.ts`
in this repo (Deno runtime). Verify-JWT should be **on** (default) — matches
how `weather-proxy`, `ingest-weather`, and `backfill-weather` are configured.

### Option B — Supabase CLI

From the project root with the CLI installed and `supabase link` already run:

```sh
supabase functions deploy news-proxy
```

### Option C — Supabase Dashboard (manual paste)

1. Dashboard → **Edge Functions** → "Deploy a new function"
2. Name: `news-proxy` (exact, lowercase, hyphen)
3. Paste the full contents of `supabase/functions/news-proxy/index.ts`
4. Leave **Verify JWT** on (default)
5. Deploy

## Verify

After deploy, in the app: open Weather → News. The two seed channels
(@stefanburns, @maxvelocitywx) should populate with their latest 3 videos.

If it fails:
- Dashboard → Functions → `news-proxy` → Logs — check for errors
- Browser DevTools → Network — look for the `news-proxy` call
- Common cause: function name typo (must be `news-proxy`, not `news_proxy`)

## Rollback

`supabase functions delete news-proxy`, or delete from the dashboard. The
News tab will then return null/error from `fetchNewsVideos` and show the
empty state — nothing else in the app depends on it.

## Related files

- `supabase/functions/news-proxy/index.ts` — function source
- `supabase/migrations/009_weather_news_sources.sql` — table + seeds
- `src/lib/newsService.ts` — frontend service (calls `supabase.functions.invoke('news-proxy', ...)`)
- `src/ui/weather/NewsTab.tsx` — tab UI

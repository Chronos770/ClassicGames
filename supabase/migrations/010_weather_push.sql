-- 010_weather_push.sql
-- Web Push notification support for the weather dashboard.
--
-- Three tables:
--   weather_push_subscriptions — one row per (user, device) pair, holding
--     the W3C PushSubscription endpoint + keys we need to send pushes to.
--   weather_push_preferences   — one row per user, JSONB-style toggles for
--     each notification kind plus optional quiet hours.
--   weather_push_log           — idempotency log so the cron tick doesn't
--     send the same alert twice.
--
-- TO REVERT: see DROP statements at the bottom.

-- ── Subscriptions ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.weather_push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS weather_push_subscriptions_user_idx
  ON public.weather_push_subscriptions (user_id);

ALTER TABLE public.weather_push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own push subs" ON public.weather_push_subscriptions;
CREATE POLICY "Users can read own push subs" ON public.weather_push_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own push subs" ON public.weather_push_subscriptions;
CREATE POLICY "Users can insert own push subs" ON public.weather_push_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own push subs" ON public.weather_push_subscriptions;
CREATE POLICY "Users can update own push subs" ON public.weather_push_subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own push subs" ON public.weather_push_subscriptions;
CREATE POLICY "Users can delete own push subs" ON public.weather_push_subscriptions
  FOR DELETE USING (auth.uid() = user_id);

-- ── Preferences ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.weather_push_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  rain_incoming    boolean NOT NULL DEFAULT true,
  thunderstorms    boolean NOT NULL DEFAULT true,
  snow_wintry      boolean NOT NULL DEFAULT true,
  severe_alerts    boolean NOT NULL DEFAULT true,
  daily_forecast   boolean NOT NULL DEFAULT true,
  active_rain      boolean NOT NULL DEFAULT false,
  aurora_possible  boolean NOT NULL DEFAULT false,
  major_flare      boolean NOT NULL DEFAULT false,
  -- Quiet hours: NULL means disabled. Severe alerts ignore these.
  quiet_start_hour int,
  quiet_end_hour   int,
  -- IANA timezone string, e.g. 'America/Chicago'
  timezone text NOT NULL DEFAULT 'America/Chicago',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.weather_push_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own push prefs" ON public.weather_push_preferences;
CREATE POLICY "Users can read own push prefs" ON public.weather_push_preferences
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can upsert own push prefs" ON public.weather_push_preferences;
CREATE POLICY "Users can upsert own push prefs" ON public.weather_push_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own push prefs" ON public.weather_push_preferences;
CREATE POLICY "Users can update own push prefs" ON public.weather_push_preferences
  FOR UPDATE USING (auth.uid() = user_id);

-- ── Idempotency log ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.weather_push_log (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  alert_kind text NOT NULL,
  alert_key text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, alert_kind, alert_key)
);

CREATE INDEX IF NOT EXISTS weather_push_log_user_kind_idx
  ON public.weather_push_log (user_id, alert_kind, sent_at DESC);

-- Service-role-only writes; users can read their own log entries.
ALTER TABLE public.weather_push_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own push log" ON public.weather_push_log;
CREATE POLICY "Users can read own push log" ON public.weather_push_log
  FOR SELECT USING (auth.uid() = user_id);

-- ── REVERT ────────────────────────────────────────────────────────
-- DROP TABLE IF EXISTS public.weather_push_log CASCADE;
-- DROP TABLE IF EXISTS public.weather_push_preferences CASCADE;
-- DROP TABLE IF EXISTS public.weather_push_subscriptions CASCADE;

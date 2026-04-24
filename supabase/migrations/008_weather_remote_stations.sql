-- 008_weather_remote_stations.sql
-- Remote / non-API weather stations the user wants to "watch" alongside their
-- own. These are stations whose data we cannot fetch via the WeatherLink v2
-- API (because they're on a different account, or we just want NWS-only
-- forecast for an arbitrary lat/lon). For each:
--   * optional WeatherLink embed URL — iframed in the UI
--   * lat/lon — drives NWS forecast + alerts + sun arc + precip outlook
--
-- Run this manually in Supabase SQL Editor.
--
-- TO REVERT: run the DROP statements at the bottom of this file.

CREATE TABLE IF NOT EXISTS public.weather_remote_stations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  embed_url text,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  region text,
  notes text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS weather_remote_stations_user_idx
  ON public.weather_remote_stations (user_id, sort_order);

ALTER TABLE public.weather_remote_stations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read remote stations" ON public.weather_remote_stations;
CREATE POLICY "Admins can read remote stations" ON public.weather_remote_stations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Admins can insert remote stations" ON public.weather_remote_stations;
CREATE POLICY "Admins can insert remote stations" ON public.weather_remote_stations
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    AND user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Admins can update remote stations" ON public.weather_remote_stations;
CREATE POLICY "Admins can update remote stations" ON public.weather_remote_stations
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    AND user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Admins can delete remote stations" ON public.weather_remote_stations;
CREATE POLICY "Admins can delete remote stations" ON public.weather_remote_stations
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    AND user_id = auth.uid()
  );

DROP TRIGGER IF EXISTS weather_remote_stations_updated_at ON public.weather_remote_stations;
CREATE TRIGGER weather_remote_stations_updated_at
  BEFORE UPDATE ON public.weather_remote_stations
  FOR EACH ROW EXECUTE FUNCTION public.weather_update_updated_at();

-- ── REVERT ─────────────────────────────────────────────────────────
-- To remove this feature entirely, run:
--   DROP TABLE IF EXISTS public.weather_remote_stations CASCADE;

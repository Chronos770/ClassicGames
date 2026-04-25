-- 009_weather_news_sources.sql
-- YouTube channels (and later RSS feeds) shown on the Weather → News tab.
-- Per-admin custom additions plus a couple of global defaults.

CREATE TABLE IF NOT EXISTS public.weather_news_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- NULL = a global default seeded by this migration (visible to all admins).
  -- Otherwise the admin who added it.
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'youtube' CHECK (kind IN ('youtube')),
  handle text NOT NULL,
  label text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS weather_news_sources_user_idx
  ON public.weather_news_sources (user_id, sort_order);

ALTER TABLE public.weather_news_sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read news sources" ON public.weather_news_sources;
CREATE POLICY "Admins can read news sources" ON public.weather_news_sources
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Admins can insert news sources" ON public.weather_news_sources;
CREATE POLICY "Admins can insert news sources" ON public.weather_news_sources
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    AND user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Admins can update own news sources" ON public.weather_news_sources;
CREATE POLICY "Admins can update own news sources" ON public.weather_news_sources
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    AND user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Admins can delete own news sources" ON public.weather_news_sources;
CREATE POLICY "Admins can delete own news sources" ON public.weather_news_sources
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    AND user_id = auth.uid()
  );

DROP TRIGGER IF EXISTS weather_news_sources_updated_at ON public.weather_news_sources;
CREATE TRIGGER weather_news_sources_updated_at
  BEFORE UPDATE ON public.weather_news_sources
  FOR EACH ROW EXECUTE FUNCTION public.weather_update_updated_at();

-- Seed two recommended weather YouTubers as global defaults (user_id NULL).
INSERT INTO public.weather_news_sources (user_id, kind, handle, label, sort_order)
VALUES
  (NULL, 'youtube', '@stefanburns', 'Stefan Burns', 0),
  (NULL, 'youtube', '@maxvelocitywx', 'Max Velocity Wx', 1)
ON CONFLICT DO NOTHING;

-- ── REVERT ─────────────────────────────────────────────────────────
-- DROP TABLE IF EXISTS public.weather_news_sources CASCADE;

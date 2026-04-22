-- 006_weather.sql
-- Weather station data ingestion from Davis Vantage View via WeatherLink v2 API
-- Run this manually in Supabase SQL Editor
--
-- What this creates:
--   * weather_stations         -- metadata for each WeatherLink station we track
--   * weather_readings         -- time-series readings (one row per poll)
--   * weather_latest (view)    -- latest reading per station for fast dashboard loads
--   * ingest_weather_reading() -- SECURITY DEFINER function the Edge Function calls
--   * pg_cron schedule         -- fires the ingest Edge Function every 10 minutes
--
-- RLS: admin-only reads. Service role (used by Edge Function) can write.

-- ── Stations metadata ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.weather_stations (
  station_id bigint PRIMARY KEY,
  station_id_uuid text,
  station_name text NOT NULL,
  city text,
  region text,
  country text,
  latitude double precision,
  longitude double precision,
  elevation double precision,
  time_zone text,
  gateway_type text,
  product_number text,
  subscription_type text,
  recording_interval int,
  firmware_version text,
  registered_date timestamptz,
  last_ingested_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ── Readings (time-series) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.weather_readings (
  id bigserial PRIMARY KEY,
  station_id bigint NOT NULL REFERENCES public.weather_stations(station_id) ON DELETE CASCADE,
  observed_at timestamptz NOT NULL,

  -- Outdoor (ISS / VP2+)
  temp double precision,
  hum double precision,
  dew_point double precision,
  wet_bulb double precision,
  heat_index double precision,
  wind_chill double precision,
  thw_index double precision,
  thsw_index double precision,
  wbgt double precision,

  -- Wind
  wind_speed_last double precision,
  wind_dir_last int,
  wind_speed_avg_last_1_min double precision,
  wind_speed_avg_last_2_min double precision,
  wind_speed_avg_last_10_min double precision,
  wind_speed_hi_last_2_min double precision,
  wind_speed_hi_last_10_min double precision,
  wind_dir_scalar_avg_last_1_min int,
  wind_dir_scalar_avg_last_2_min int,
  wind_dir_scalar_avg_last_10_min int,
  wind_dir_at_hi_speed_last_2_min int,
  wind_dir_at_hi_speed_last_10_min int,
  wind_run_day double precision,

  -- Rain
  rainfall_last_15_min_in double precision,
  rainfall_last_60_min_in double precision,
  rainfall_last_24_hr_in double precision,
  rainfall_day_in double precision,
  rainfall_month_in double precision,
  rainfall_year_in double precision,
  rain_rate_last_in double precision,
  rain_rate_hi_in double precision,
  rain_rate_hi_last_15_min_in double precision,
  rain_storm_current_in double precision,
  rain_storm_last_in double precision,
  rain_storm_current_start_at timestamptz,
  rain_storm_last_start_at timestamptz,
  rain_storm_last_end_at timestamptz,

  -- Solar / UV
  solar_rad double precision,
  solar_energy_day double precision,
  uv_index double precision,
  uv_dose_day double precision,

  -- Indoor
  temp_in double precision,
  hum_in double precision,
  dew_point_in double precision,
  heat_index_in double precision,
  wet_bulb_in double precision,

  -- Barometer
  bar_sea_level double precision,
  bar_absolute double precision,
  bar_trend double precision,

  -- Derived
  hdd_day double precision,
  cdd_day double precision,
  et_day double precision,
  et_month double precision,
  et_year double precision,

  -- Station health
  trans_battery_volt double precision,
  trans_battery_flag int,
  rssi_last int,
  reception_day int,
  battery_percent int,
  battery_voltage int,
  wifi_rssi int,
  console_sw_version text,

  -- Raw copy of the /current response (for fields we don't otherwise map)
  raw jsonb,

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS weather_readings_station_observed_uniq
  ON public.weather_readings(station_id, observed_at);

CREATE INDEX IF NOT EXISTS weather_readings_observed_at_idx
  ON public.weather_readings(observed_at DESC);

CREATE INDEX IF NOT EXISTS weather_readings_station_observed_desc_idx
  ON public.weather_readings(station_id, observed_at DESC);

-- ── Latest-per-station view (fast dashboard loads) ───────────────
CREATE OR REPLACE VIEW public.weather_latest AS
SELECT DISTINCT ON (station_id) *
FROM public.weather_readings
ORDER BY station_id, observed_at DESC;

-- ── RLS ──────────────────────────────────────────────────────────
ALTER TABLE public.weather_stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weather_readings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read stations" ON public.weather_stations;
CREATE POLICY "Admins can read stations" ON public.weather_stations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Admins can read readings" ON public.weather_readings;
CREATE POLICY "Admins can read readings" ON public.weather_readings
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
-- service_role bypasses RLS so the Edge Function can write freely.

-- ── updated_at trigger on stations ───────────────────────────────
CREATE OR REPLACE FUNCTION public.weather_update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS weather_stations_updated_at ON public.weather_stations;
CREATE TRIGGER weather_stations_updated_at
  BEFORE UPDATE ON public.weather_stations
  FOR EACH ROW EXECUTE FUNCTION public.weather_update_updated_at();

-- ── Seed: Walnut Farms station ───────────────────────────────────
INSERT INTO public.weather_stations (
  station_id, station_id_uuid, station_name, city, region, country,
  latitude, longitude, elevation, time_zone, gateway_type, product_number,
  subscription_type, recording_interval, firmware_version, registered_date
) VALUES (
  235190, '18151c2b-bd20-4019-b877-f397227b9174', 'Walnut Farms',
  'Gilliam', 'MO', 'United States of America',
  39.22164, -92.973114, 2542.62, 'America/Chicago',
  'WeatherLink Console', '6313', 'Pro', 15, '1.4.80',
  to_timestamp(1776464379)
)
ON CONFLICT (station_id) DO UPDATE SET
  station_name = EXCLUDED.station_name,
  city = EXCLUDED.city,
  region = EXCLUDED.region,
  country = EXCLUDED.country,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  elevation = EXCLUDED.elevation,
  time_zone = EXCLUDED.time_zone,
  subscription_type = EXCLUDED.subscription_type,
  firmware_version = EXCLUDED.firmware_version;

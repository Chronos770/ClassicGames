-- 011_rain_rate_rolling.sql
-- Add Davis's rolling rain-rate peak fields. The /current endpoint
-- exposes rolling-window peaks beyond the 15-minute one we already had.
-- The 24-hour peak is what the WeatherLink mobile app shows as "HIGH
-- RAIN RATE" for today on the Records screen.

ALTER TABLE public.weather_readings
  ADD COLUMN IF NOT EXISTS rain_rate_hi_last_60_min_in numeric,
  ADD COLUMN IF NOT EXISTS rain_rate_hi_last_24_hr_in numeric;

-- TO REVERT:
-- ALTER TABLE public.weather_readings
--   DROP COLUMN IF EXISTS rain_rate_hi_last_60_min_in,
--   DROP COLUMN IF EXISTS rain_rate_hi_last_24_hr_in;

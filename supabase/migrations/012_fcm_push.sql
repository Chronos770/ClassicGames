-- 012_fcm_push.sql
-- Native FCM push support alongside the existing VAPID/Web Push rows.
--
-- The original weather_push_subscriptions schema (migration 010) had
-- p256dh + auth as NOT NULL because Web Push subscriptions always
-- carry those keys. Native FCM tokens don't have them — the token
-- string itself is everything `push-send` needs to deliver a message.
--
-- Make both columns nullable so FCM tokens (stored with the
-- `endpoint` field set to `fcm:<token>`) live in the same table and
-- the existing read paths keep working.

ALTER TABLE public.weather_push_subscriptions
  ALTER COLUMN p256dh DROP NOT NULL,
  ALTER COLUMN auth DROP NOT NULL;

-- Convenience helper for the push-send function: returns the
-- transport kind so the edge function can fan a single user_id out to
-- the right delivery path (Web Push vs FCM) without parsing strings.
CREATE OR REPLACE FUNCTION public.weather_push_subscriptions_kind(endpoint text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN endpoint LIKE 'fcm:%' THEN 'fcm'
    ELSE 'webpush'
  END
$$;

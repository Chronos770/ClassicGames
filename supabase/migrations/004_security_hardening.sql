-- Security Hardening Migration
-- CRITICAL: Must be run manually in Supabase SQL Editor

-- 1. FIX: Prevent users from self-escalating to admin
--    The old policy allowed updating ANY column including 'role'.
--    New policy: users can update their own profile, but the role column
--    must remain unchanged (matches their current role).

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
  );

-- 2. Add rate-limit-friendly index for invite codes (brute-force mitigation)
CREATE INDEX IF NOT EXISTS idx_rooms_invite_code_recent
  ON public.rooms(invite_code, created_at DESC)
  WHERE invite_code IS NOT NULL;

-- 3. Restrict chat message length at DB level (defense in depth)
ALTER TABLE public.chat_messages
  ADD CONSTRAINT chat_message_length CHECK (char_length(message) <= 500);

-- 4. Add NOT NULL constraint to display_name to prevent empty profiles
ALTER TABLE public.profiles
  ALTER COLUMN display_name SET DEFAULT 'Player';
-- (Can't easily add NOT NULL if existing rows might violate it,
--  but the default ensures new rows always have a name)

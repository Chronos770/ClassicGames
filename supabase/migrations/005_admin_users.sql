-- 005_admin_users.sql
-- Admin functions for viewing user emails and resetting passwords
-- Run this manually in Supabase SQL Editor

-- Ensure pgcrypto is available (usually already enabled on Supabase)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── Get users with email (admin only) ────────────────────────────
-- Joins profiles with auth.users to expose email to admins
CREATE OR REPLACE FUNCTION admin_get_users_with_email(
  search_term text DEFAULT '',
  lim int DEFAULT 50,
  off int DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  display_name text,
  avatar_emoji text,
  role text,
  created_at timestamptz,
  online_at timestamptz,
  email text,
  total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.display_name,
    p.avatar_emoji,
    p.role,
    p.created_at,
    p.online_at,
    u.email,
    COUNT(*) OVER() AS total_count
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE (
    search_term = ''
    OR p.display_name ILIKE '%' || search_term || '%'
    OR u.email ILIKE '%' || search_term || '%'
  )
  ORDER BY p.created_at DESC
  LIMIT lim
  OFFSET off;
END;
$$;

-- ── Set user password (admin only) ───────────────────────────────
-- Updates encrypted_password in auth.users using bcrypt
CREATE OR REPLACE FUNCTION admin_set_user_password(
  target_user_id uuid,
  new_password text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;

  -- Validate password length
  IF length(new_password) < 6 THEN
    RAISE EXCEPTION 'Password must be at least 6 characters';
  END IF;

  -- Update the password
  UPDATE auth.users
  SET encrypted_password = crypt(new_password, gen_salt('bf'))
  WHERE auth.users.id = target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  RETURN true;
END;
$$;

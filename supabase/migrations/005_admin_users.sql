-- 005_admin_users.sql
-- Admin functions for viewing user emails and resetting passwords
-- Run this manually in Supabase SQL Editor
-- NOTE: If re-running, the CREATE OR REPLACE will update existing functions

-- Ensure pgcrypto is available (usually already enabled on Supabase)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── Get users with email (admin only) ────────────────────────────
-- Joins profiles with auth.users to expose email to admins
-- Returns JSON to avoid PostgREST column type mismatch issues
CREATE OR REPLACE FUNCTION admin_get_users_with_email(
  search_term text DEFAULT '',
  lim int DEFAULT 50,
  off int DEFAULT 0
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
  total_count bigint;
BEGIN
  -- Verify caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;

  -- Get total count
  SELECT COUNT(*) INTO total_count
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE (
    search_term = ''
    OR p.display_name ILIKE '%' || search_term || '%'
    OR u.email ILIKE '%' || search_term || '%'
  );

  -- Get paginated results
  SELECT json_build_object(
    'users', COALESCE(json_agg(row_to_json(t)), '[]'::json),
    'total', total_count
  ) INTO result
  FROM (
    SELECT
      p.id,
      p.display_name,
      p.avatar_emoji,
      p.role,
      p.created_at,
      p.online_at,
      u.email
    FROM public.profiles p
    JOIN auth.users u ON u.id = p.id
    WHERE (
      search_term = ''
      OR p.display_name ILIKE '%' || search_term || '%'
      OR u.email ILIKE '%' || search_term || '%'
    )
    ORDER BY p.created_at DESC
    LIMIT lim
    OFFSET off
  ) t;

  RETURN result;
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

  -- Update the password (use extensions schema where Supabase installs pgcrypto)
  UPDATE auth.users
  SET encrypted_password = extensions.crypt(new_password, extensions.gen_salt('bf'))
  WHERE auth.users.id = target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  RETURN true;
END;
$$;

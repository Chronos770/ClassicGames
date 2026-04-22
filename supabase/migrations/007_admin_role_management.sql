-- 007_admin_role_management.sql
-- Allows admins to change other users' roles (promote/demote user <-> admin).
-- RLS on profiles blocks self-role-escalation, so this runs SECURITY DEFINER
-- and double-checks the caller's admin status from within the function body.
--
-- Run this manually in Supabase SQL Editor.

CREATE OR REPLACE FUNCTION admin_set_user_role(
  target_user_id uuid,
  new_role text
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

  -- Validate role
  IF new_role NOT IN ('user', 'admin') THEN
    RAISE EXCEPTION 'Invalid role: must be user or admin';
  END IF;

  -- Prevent an admin from accidentally demoting themselves — if you need to
  -- step down, another admin must do it for you.
  IF target_user_id = auth.uid() AND new_role <> 'admin' THEN
    RAISE EXCEPTION 'Cannot change your own role. Ask another admin.';
  END IF;

  UPDATE public.profiles
  SET role = new_role
  WHERE profiles.id = target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  RETURN true;
END;
$$;

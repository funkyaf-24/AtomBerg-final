-- ============================================================
-- PATCH: Fix Authentication Issues
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. CONFIRM ALL EXISTING USERS (removes "Email not confirmed" blocker)
--    Supabase requires email_confirmed_at to be set for signInWithPassword
--    to succeed, even for users created via the dashboard.
-- ────────────────────────────────────────────────────────────
UPDATE auth.users
SET
  email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
  updated_at = NOW()
WHERE email_confirmed_at IS NULL;

-- Verify
SELECT id, email, email_confirmed_at, created_at
FROM auth.users
ORDER BY created_at;

-- ────────────────────────────────────────────────────────────
-- 2. ENSURE PROFILES EXIST FOR ALL AUTH USERS
--    If the handle_new_user trigger was missing when a user was
--    created (e.g. added directly via Supabase dashboard), their
--    profile row won't exist and role-routing will break.
-- ────────────────────────────────────────────────────────────
INSERT INTO public.profiles (id, email, full_name, role)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
  'employee'::user_role
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- 3. SET CORRECT ROLES FOR KNOWN ACCOUNTS
-- ────────────────────────────────────────────────────────────
UPDATE public.profiles SET role = 'admin'    WHERE email = 'admin@demo.com';
UPDATE public.profiles SET role = 'manager'  WHERE email = 'manager@demo.com';
UPDATE public.profiles SET role = 'employee' WHERE email = 'employee@demo.com';

-- Set your real admin user's role
UPDATE public.profiles SET role = 'admin'    WHERE email = 'indulkarshreeyash@gmail.com';

-- ────────────────────────────────────────────────────────────
-- 4. SET FULL NAMES IF MISSING
-- ────────────────────────────────────────────────────────────
UPDATE public.profiles SET full_name = 'Priya Sharma'  WHERE email = 'admin@demo.com'    AND (full_name IS NULL OR full_name = split_part(email,'@',1));
UPDATE public.profiles SET full_name = 'Arjun Mehta'   WHERE email = 'manager@demo.com'  AND (full_name IS NULL OR full_name = split_part(email,'@',1));
UPDATE public.profiles SET full_name = 'Riya Kapoor'   WHERE email = 'employee@demo.com' AND (full_name IS NULL OR full_name = split_part(email,'@',1));

-- ────────────────────────────────────────────────────────────
-- 5. VERIFY FINAL STATE
-- ────────────────────────────────────────────────────────────
SELECT
  u.email,
  u.email_confirmed_at IS NOT NULL AS is_confirmed,
  p.role,
  p.full_name
FROM auth.users u
JOIN public.profiles p ON p.id = u.id
ORDER BY u.email;

-- Expected output:
--  admin@demo.com             | true | admin    | Priya Sharma
--  employee@demo.com          | true | employee | Riya Kapoor
--  indulkarshreeyash@gmail.com| true | admin    | indulkarshreeyash
--  manager@demo.com           | true | manager  | Arjun Mehta

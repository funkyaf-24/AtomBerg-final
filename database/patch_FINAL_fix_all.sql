-- ============================================================
-- FINAL PATCH — Run this in Supabase SQL Editor
-- Fixes: financial_year mismatch + RLS recursive loop + 
--        ensures all seed data uses the current FY
-- ============================================================

-- ============================================================
-- STEP 1: Compute current financial year (matches app logic)
-- ============================================================
DO $$
DECLARE
  current_fy TEXT;
  yr INT := EXTRACT(YEAR FROM NOW())::INT;
  mo INT := EXTRACT(MONTH FROM NOW())::INT;
BEGIN
  IF mo >= 4 THEN
    current_fy := yr::TEXT || '-' || (yr + 1)::TEXT;
  ELSE
    current_fy := (yr - 1)::TEXT || '-' || yr::TEXT;
  END IF;

  RAISE NOTICE 'Current financial year detected: %', current_fy;

  -- Update ALL goal_sheets to use current financial year
  -- (handles 2025-2026, 2025, or any other stale value)
  UPDATE goal_sheets
  SET financial_year = current_fy
  WHERE financial_year != current_fy;

  RAISE NOTICE 'Updated % rows to financial_year = %', (SELECT COUNT(*) FROM goal_sheets WHERE financial_year = current_fy), current_fy;
END $$;

-- ============================================================
-- STEP 2: Fix RLS — drop the FOR ALL policy that causes recursion
-- Replace with explicit non-overlapping per-operation policies
-- ============================================================

-- Drop any legacy FOR ALL policy on profiles (the recursive one)
DROP POLICY IF EXISTS "Admin manages profiles" ON profiles;

-- Ensure clean split policies exist (safe to re-run):
DROP POLICY IF EXISTS "Admin inserts profiles" ON profiles;
DROP POLICY IF EXISTS "Admin updates all profiles" ON profiles;
DROP POLICY IF EXISTS "Admin deletes profiles" ON profiles;

CREATE POLICY "Admin inserts profiles"
  ON profiles FOR INSERT
  WITH CHECK (current_user_role() = 'admin');

CREATE POLICY "Admin updates all profiles"
  ON profiles FOR UPDATE
  USING (current_user_role() = 'admin')
  WITH CHECK (current_user_role() = 'admin');

CREATE POLICY "Admin deletes profiles"
  ON profiles FOR DELETE
  USING (current_user_role() = 'admin');

-- ============================================================
-- STEP 3: Verify — show what the current state is
-- ============================================================
SELECT
  'goal_sheets' AS tbl,
  financial_year,
  status,
  COUNT(*) AS cnt
FROM goal_sheets
GROUP BY financial_year, status
ORDER BY financial_year, status;

SELECT
  p.email,
  p.role,
  p.is_active,
  m.email AS manager_email
FROM profiles p
LEFT JOIN profiles m ON p.manager_id = m.id
ORDER BY p.role, p.email;

SELECT 'PATCH COMPLETE — all goal_sheets now use current FY, RLS policies fixed' AS result;

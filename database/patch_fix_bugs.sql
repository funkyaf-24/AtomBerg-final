-- ============================================================
-- PATCH: Fix two remaining bugs
--   1. Approved employees missing from Team Dashboard
--   2. Users not appearing in Admin → User Management
-- Run this in Supabase SQL Editor
-- ============================================================

-- ══════════════════════════════════════════════════════════════
-- BUG 1 FIX: financial_year format mismatch
-- ──────────────────────────────────────────────────────────────
-- Root cause:
--   goal_sheets.financial_year DEFAULT is TO_CHAR(NOW(), 'YYYY')
--   which stores plain "2025".
--   But the app's getCurrentFinancialYear() returns "2025-2026".
--   TeamContent.getSheetForYear() matches by exact string equality,
--   so approved sheets are never found → employee appears as "No goal sheet".
-- ══════════════════════════════════════════════════════════════

-- 1a. Fix the column default so new sheets use the correct format
ALTER TABLE goal_sheets
  ALTER COLUMN financial_year
  SET DEFAULT (
    CASE
      WHEN EXTRACT(MONTH FROM NOW()) >= 4
      THEN TO_CHAR(NOW(), 'YYYY') || '-' || TO_CHAR(NOW() + INTERVAL '1 year', 'YYYY')
      ELSE TO_CHAR(NOW() - INTERVAL '1 year', 'YYYY') || '-' || TO_CHAR(NOW(), 'YYYY')
    END
  );

-- 1b. Migrate all existing plain-year rows to "YYYY-(YYYY+1)" format
--     Assumes financial year starts in April (month >= 4).
--     Rows already in "YYYY-YYYY" format are left untouched by the WHERE clause.
UPDATE goal_sheets
SET financial_year = financial_year || '-' || (financial_year::int + 1)::text
WHERE financial_year ~ '^\d{4}$';

-- Verify:
-- SELECT DISTINCT financial_year FROM goal_sheets ORDER BY 1;


-- ══════════════════════════════════════════════════════════════
-- BUG 2 FIX: Admin sees no users in User Management
-- ──────────────────────────────────────────────────────────────
-- Root cause:
--   The "Admin manages profiles" FOR ALL policy covers SELECT too.
--   When PostgREST evaluates it, current_user_role() issues its own
--   SELECT on profiles, which in turn re-enters policy evaluation —
--   a subtle recursive loop that Supabase resolves by returning no rows.
--   Dropping the FOR ALL policy and replacing it with explicit
--   INSERT / UPDATE / DELETE policies eliminates the recursion;
--   the existing "Admin views all" FOR SELECT policy (which PostgREST
--   evaluates independently) then cleanly covers reads.
-- ══════════════════════════════════════════════════════════════

-- 2a. Remove the conflicting catch-all policy
DROP POLICY IF EXISTS "Admin manages profiles" ON profiles;

-- 2b. Replace with explicit non-SELECT policies so SELECT falls solely
--     to the clean "Admin views all" FOR SELECT policy
CREATE POLICY "Admin inserts profiles" ON profiles FOR INSERT
  WITH CHECK (current_user_role() = 'admin');

CREATE POLICY "Admin deletes profiles" ON profiles FOR DELETE
  USING (current_user_role() = 'admin');

-- Note: Admin UPDATE is already covered by the existing
-- "Users update own profile" (own row) + the separate admin UPDATE
-- policy below if you want admins to edit any row:
CREATE POLICY "Admin updates all profiles" ON profiles FOR UPDATE
  USING (current_user_role() = 'admin')
  WITH CHECK (current_user_role() = 'admin');

-- 2c. (Safety) Confirm the SELECT policy that now solely handles admin reads
--     is present. If it was accidentally dropped, recreate it:
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles' AND policyname = 'Admin views all'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Admin views all" ON profiles FOR SELECT
        USING (current_user_role() = 'admin')
    $policy$;
  END IF;
END $$;

-- Verify policies:
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'profiles' ORDER BY cmd, policyname;

SELECT 'Bug patches applied successfully' AS result;

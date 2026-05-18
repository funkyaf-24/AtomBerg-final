-- ============================================================
-- PATCH: Fix RLS policies for manager report visibility
-- Run this in Supabase SQL Editor if you already ran schema.sql
-- ============================================================

-- ── 1. Fix goal_sheets UPDATE policies (add WITH CHECK) ──────
DROP POLICY IF EXISTS "Employees update draft sheets" ON goal_sheets;
DROP POLICY IF EXISTS "Managers update submitted sheets" ON goal_sheets;
DROP POLICY IF EXISTS "Admin updates all sheets" ON goal_sheets;

CREATE POLICY "Employees update draft sheets" ON goal_sheets FOR UPDATE
  USING (employee_id = auth.uid() AND status IN ('draft','rework'))
  WITH CHECK (employee_id = auth.uid());

-- Managers can update submitted sheets to approved OR rework status
CREATE POLICY "Managers update submitted sheets" ON goal_sheets FOR UPDATE
  USING (is_manager_of(employee_id) AND status = 'submitted')
  WITH CHECK (is_manager_of(employee_id));

CREATE POLICY "Admin updates all sheets" ON goal_sheets FOR UPDATE
  USING (current_user_role() = 'admin')
  WITH CHECK (current_user_role() = 'admin');

-- ── 2. Fix financial_year in existing seed data ───────────────
-- If your seed data used '2024-2025', update it to '2025-2026'
-- (adjust to match whatever getCurrentFinancialYear() returns for your region)

UPDATE goal_sheets
SET financial_year = '2025-2026'
WHERE financial_year = '2024-2025';

-- ── 3. Verify manager_id is correctly set ─────────────────────
-- Run this SELECT to confirm employees have manager set:
-- SELECT full_name, email, role, manager_id FROM profiles ORDER BY role;

-- If manager_id is NULL for employees, fix it:
-- UPDATE profiles
-- SET manager_id = (SELECT id FROM profiles WHERE email = 'manager@demo.com')
-- WHERE email IN ('employee@demo.com', 'emp2@demo.com', 'emp3@demo.com');

-- ── 4. Verify RLS is working for manager ─────────────────────
-- Run as manager user to test (use Supabase SQL Editor with RLS enabled):
-- SELECT gs.id, gs.status, p.full_name
-- FROM goal_sheets gs
-- JOIN profiles p ON gs.employee_id = p.id;
-- Should return rows for all employees where manager_id = current user

-- ── Done! ─────────────────────────────────────────────────────
SELECT 'Patch applied successfully' as result;

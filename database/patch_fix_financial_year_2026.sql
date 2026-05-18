-- ============================================================
-- PATCH: Update financial_year to 2026-2027
-- ============================================================
-- The app's getCurrentFinancialYear() now returns "2026-2027"
-- (any date in April 2026 or later). Existing seed data used
-- "2025-2026". This patch migrates all existing rows so the
-- manager dashboard and team pages can find current-year sheets.
-- ============================================================

UPDATE goal_sheets
SET financial_year = '2026-2027'
WHERE financial_year = '2025-2026';

-- Verify
SELECT id, employee_id, financial_year, status FROM goal_sheets ORDER BY financial_year;

SELECT 'financial_year updated to 2026-2027' AS result;

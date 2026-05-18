-- ============================================================
-- SEED DATA — Goal Setting & Tracking Portal
-- Run AFTER creating users in Supabase Auth dashboard
-- Demo password for all accounts: Demo@1234
-- ============================================================

-- Step 1: Create users in Supabase Auth dashboard with these emails:
--   admin@demo.com    (role: admin)
--   manager@demo.com  (role: manager)
--   employee@demo.com (role: employee)
--   emp2@demo.com     (role: employee)
--   emp3@demo.com     (role: employee)

-- Step 2: After creating auth users, run this to set up profiles
-- (Replace UUIDs with actual UUIDs from auth.users table)

-- Update profiles with correct roles and hierarchy
-- This assumes the handle_new_user() trigger already created basic profiles

UPDATE profiles SET
  full_name = 'Priya Sharma',
  role = 'admin',
  department = 'Human Resources',
  designation = 'HR Manager'
WHERE email = 'admin@demo.com';

UPDATE profiles SET
  full_name = 'Arjun Mehta',
  role = 'manager',
  department = 'Engineering',
  designation = 'Engineering Lead'
WHERE email = 'manager@demo.com';

UPDATE profiles SET
  full_name = 'Riya Kapoor',
  role = 'employee',
  department = 'Engineering',
  designation = 'Senior Engineer'
WHERE email = 'employee@demo.com';

UPDATE profiles SET
  full_name = 'Dev Patel',
  role = 'employee',
  department = 'Engineering',
  designation = 'Software Engineer'
WHERE email = 'emp2@demo.com';

UPDATE profiles SET
  full_name = 'Sneha Joshi',
  role = 'employee',
  department = 'Engineering',
  designation = 'Junior Engineer'
WHERE email = 'emp3@demo.com';

-- Set manager for employees
UPDATE profiles SET manager_id = (SELECT id FROM profiles WHERE email = 'manager@demo.com')
WHERE email IN ('employee@demo.com', 'emp2@demo.com', 'emp3@demo.com');

-- ============================================================
-- Compute the CURRENT financial year dynamically (matches app logic)
-- April onwards = current_year-(current_year+1), else (current_year-1)-current_year
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

  RAISE NOTICE 'Current financial year: %', current_fy;

  -- ============================================================
  -- Create sample goal sheet for demo employee (Riya) — approved
  -- ============================================================
  WITH emp AS (SELECT id FROM profiles WHERE email = 'employee@demo.com'),
       sheet AS (
         INSERT INTO goal_sheets (employee_id, financial_year, status, submitted_at)
         SELECT id, current_fy, 'approved', NOW() - INTERVAL '5 days'
         FROM emp
         ON CONFLICT (employee_id, financial_year) DO UPDATE SET status = 'approved', submitted_at = NOW() - INTERVAL '5 days'
         RETURNING id, employee_id
       )
  INSERT INTO goals (sheet_id, thrust_area, title, description, uom, target_value, weightage, sequence)
  SELECT s.id, v.thrust_area, v.title, v.description, v.uom::uom_type, v.target_value, v.weightage, v.seq
  FROM sheet s,
  (VALUES
    ('Revenue Growth',    'Increase quarterly ARR by 20%',    'Drive net new ARR through upsell and new customer acquisition', 'numeric_higher_better', 20, 25, 1),
    ('Customer Success',  'Achieve NPS score of 70+',         'Improve customer satisfaction through proactive support',       'numeric_higher_better', 70, 20, 2),
    ('Product Development','Release 3 major features',        'Deliver planned roadmap features on time',                     'numeric_higher_better', 3,  20, 3),
    ('Process Excellence','Reduce bug escape rate to <5%',    'Improve QA processes to catch more defects pre-release',       'numeric_lower_better',  5,  15, 4),
    ('Team Development',  'Complete advanced certification',  'AWS Solutions Architect Professional certification',            'zero_based',            NULL,20, 5)
  ) AS v(thrust_area, title, description, uom, target_value, weightage, seq)
  ON CONFLICT DO NOTHING;

  -- ============================================================
  -- Add quarterly updates for Q1 and Q2 (only if not already present)
  -- ============================================================
  INSERT INTO quarterly_updates (goal_id, quarter, actual_value, status, progress_pct, notes)
  SELECT g.id, vals.quarter, vals.actual_value, vals.status::progress_status, vals.progress_pct, vals.notes
  FROM goals g
  JOIN goal_sheets gs ON g.sheet_id = gs.id
  JOIN profiles p ON gs.employee_id = p.id
  JOIN (VALUES
    ('Increase quarterly ARR by 20%', 'Q1', 12,   'on_track',  60,  'On track, strong pipeline'),
    ('Increase quarterly ARR by 20%', 'Q2', 18,   'on_track',  90,  'Excellent progress, 2 enterprise deals closed'),
    ('Achieve NPS score of 70+',      'Q1', 65,   'on_track',  93,  'Survey sent to 200 customers'),
    ('Achieve NPS score of 70+',      'Q2', 72,   'completed', 100, 'Target exceeded!'),
    ('Release 3 major features',      'Q1', 1,    'on_track',  33,  'Auth module shipped'),
    ('Reduce bug escape rate to <5%', 'Q1', 8,    'on_track',  63,  'Improved test coverage to 78%'),
    ('Complete advanced certification','Q1', 0,   'on_track',  100, 'Exam booked for Q2')
  ) AS vals(title, quarter, actual_value, status, progress_pct, notes)
  ON g.title = vals.title
  WHERE p.email = 'employee@demo.com' AND gs.financial_year = current_fy
  ON CONFLICT DO NOTHING;

  -- ============================================================
  -- Add manager comment (only if not already present)
  -- ============================================================
  INSERT INTO manager_comments (sheet_id, author_id, comment)
  SELECT gs.id,
    (SELECT id FROM profiles WHERE email = 'manager@demo.com'),
    'Great goal sheet! Revenue target looks ambitious but achievable with the current pipeline. I have approved this sheet.'
  FROM goal_sheets gs
  JOIN profiles p ON gs.employee_id = p.id
  WHERE p.email = 'employee@demo.com' AND gs.financial_year = current_fy
  ON CONFLICT DO NOTHING;

  -- ============================================================
  -- Create a SUBMITTED sheet for emp2 (Dev Patel) so manager can review
  -- ============================================================
  WITH emp2 AS (SELECT id FROM profiles WHERE email = 'emp2@demo.com'),
       sheet2 AS (
         INSERT INTO goal_sheets (employee_id, financial_year, status, submitted_at)
         SELECT id, current_fy, 'submitted', NOW() - INTERVAL '2 hours'
         FROM emp2
         ON CONFLICT (employee_id, financial_year) DO UPDATE SET status = 'submitted', submitted_at = NOW() - INTERVAL '2 hours'
         RETURNING id
       )
  INSERT INTO goals (sheet_id, thrust_area, title, uom, target_value, weightage, sequence)
  VALUES
    ((SELECT id FROM sheet2), 'Revenue Growth',      'Close 5 enterprise accounts',                 'numeric_higher_better', 5,   30, 1),
    ((SELECT id FROM sheet2), 'Product Development', 'Migrate legacy system to microservices',       'zero_based',            NULL,30, 2),
    ((SELECT id FROM sheet2), 'Team Development',    'Mentor 2 junior engineers',                   'numeric_higher_better', 2,   20, 3),
    ((SELECT id FROM sheet2), 'Process Excellence',  'Improve deployment frequency to daily',       'numeric_higher_better', 365, 20, 4)
  ON CONFLICT DO NOTHING;

END $$;

-- ============================================================
-- Done! Test credentials:
-- admin@demo.com    / Demo@1234 → Admin dashboard
-- manager@demo.com  / Demo@1234 → Manager dashboard
-- employee@demo.com / Demo@1234 → Employee dashboard (approved sheet)
-- emp2@demo.com     / Demo@1234 → Employee with submitted sheet
-- ============================================================

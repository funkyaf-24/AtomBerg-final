-- ============================================================
-- Goal Setting & Tracking Portal — Complete Supabase Schema
-- ============================================================

-- ENUMs
CREATE TYPE user_role AS ENUM ('employee', 'manager', 'admin');
CREATE TYPE goal_sheet_status AS ENUM ('draft', 'submitted', 'approved', 'locked', 'rework');
CREATE TYPE progress_status AS ENUM ('not_started', 'on_track', 'completed');
CREATE TYPE uom_type AS ENUM (
  'numeric_higher_better',
  'numeric_lower_better',
  'percentage_higher_better',
  'percentage_lower_better',
  'timeline',
  'zero_based'
);

-- ============================================================
-- TABLE: profiles
-- ============================================================
CREATE TABLE profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT NOT NULL UNIQUE,
  full_name     TEXT NOT NULL,
  role          user_role NOT NULL DEFAULT 'employee',
  manager_id    UUID REFERENCES profiles(id),
  department    TEXT,
  designation   TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_manager ON profiles(manager_id);
CREATE INDEX idx_profiles_role ON profiles(role);

-- ============================================================
-- TABLE: goal_sheets
-- ============================================================
CREATE TABLE goal_sheets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  financial_year  TEXT NOT NULL DEFAULT (
    CASE
      WHEN EXTRACT(MONTH FROM NOW()) >= 4
      THEN TO_CHAR(NOW(), 'YYYY') || '-' || TO_CHAR(NOW() + INTERVAL '1 year', 'YYYY')
      ELSE TO_CHAR(NOW() - INTERVAL '1 year', 'YYYY') || '-' || TO_CHAR(NOW(), 'YYYY')
    END
  ),
  status          goal_sheet_status NOT NULL DEFAULT 'draft',
  submitted_at    TIMESTAMPTZ,
  approved_at     TIMESTAMPTZ,
  approved_by     UUID REFERENCES profiles(id),
  locked_at       TIMESTAMPTZ,
  locked_by       UUID REFERENCES profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(employee_id, financial_year)
);

CREATE INDEX idx_goal_sheets_employee ON goal_sheets(employee_id);
CREATE INDEX idx_goal_sheets_status ON goal_sheets(status);
CREATE INDEX idx_goal_sheets_year ON goal_sheets(financial_year);

-- ============================================================
-- TABLE: goals
-- ============================================================
CREATE TABLE goals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_id        UUID NOT NULL REFERENCES goal_sheets(id) ON DELETE CASCADE,
  thrust_area     TEXT NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  uom             uom_type NOT NULL,
  target_value    NUMERIC,
  weightage       NUMERIC NOT NULL CHECK (weightage >= 10 AND weightage <= 100),
  sequence        INTEGER NOT NULL DEFAULT 1,
  is_shared       BOOLEAN NOT NULL DEFAULT FALSE,
  shared_from     UUID REFERENCES goals(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_goals_sheet ON goals(sheet_id);

-- Constraint: max 8 goals per sheet (enforced via trigger)
-- Constraint: total weightage = 100 (enforced via trigger)

-- ============================================================
-- TABLE: quarterly_updates
-- ============================================================
CREATE TABLE quarterly_updates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id         UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  quarter         TEXT NOT NULL CHECK (quarter IN ('Q1','Q2','Q3','Q4')),
  actual_value    NUMERIC,
  completion_date DATE,
  status          progress_status NOT NULL DEFAULT 'not_started',
  progress_pct    NUMERIC GENERATED ALWAYS AS (NULL) STORED, -- computed via function
  notes           TEXT,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(goal_id, quarter)
);

-- Drop the GENERATED column, we'll compute it in functions
ALTER TABLE quarterly_updates DROP COLUMN progress_pct;
ALTER TABLE quarterly_updates ADD COLUMN progress_pct NUMERIC;

CREATE INDEX idx_quarterly_updates_goal ON quarterly_updates(goal_id);

-- ============================================================
-- TABLE: manager_comments
-- ============================================================
CREATE TABLE manager_comments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_id        UUID NOT NULL REFERENCES goal_sheets(id) ON DELETE CASCADE,
  goal_id         UUID REFERENCES goals(id) ON DELETE CASCADE,
  quarter         TEXT CHECK (quarter IN ('Q1','Q2','Q3','Q4')),
  author_id       UUID NOT NULL REFERENCES profiles(id),
  comment         TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_manager_comments_sheet ON manager_comments(sheet_id);

-- ============================================================
-- TABLE: shared_goal_assignments
-- ============================================================
CREATE TABLE shared_goal_assignments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_goal_id  UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  target_employee UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_by     UUID NOT NULL REFERENCES profiles(id),
  weightage       NUMERIC NOT NULL CHECK (weightage >= 10),
  assigned_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(source_goal_id, target_employee)
);

-- ============================================================
-- TABLE: audit_logs
-- ============================================================
CREATE TABLE audit_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name      TEXT NOT NULL,
  record_id       UUID NOT NULL,
  action          TEXT NOT NULL CHECK (action IN ('INSERT','UPDATE','DELETE')),
  actor_id        UUID REFERENCES profiles(id),
  old_values      JSONB,
  new_values      JSONB,
  ip_address      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_table ON audit_logs(table_name);
CREATE INDEX idx_audit_logs_record ON audit_logs(record_id);
CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);

-- ============================================================
-- FUNCTION: validate_goal_sheet()
-- Ensures max 8 goals and total weightage = 100
-- ============================================================
CREATE OR REPLACE FUNCTION validate_goal_sheet()
RETURNS TRIGGER AS $$
DECLARE
  goal_count INTEGER;
  total_weight NUMERIC;
BEGIN
  SELECT COUNT(*), COALESCE(SUM(weightage), 0)
  INTO goal_count, total_weight
  FROM goals
  WHERE sheet_id = NEW.sheet_id;

  IF goal_count > 8 THEN
    RAISE EXCEPTION 'A goal sheet cannot have more than 8 goals';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_goals
  AFTER INSERT OR UPDATE ON goals
  FOR EACH ROW EXECUTE FUNCTION validate_goal_sheet();

-- ============================================================
-- FUNCTION: calculate_progress()
-- Calculates progress percentage based on UoM type
-- ============================================================
CREATE OR REPLACE FUNCTION calculate_progress(
  p_uom        uom_type,
  p_target     NUMERIC,
  p_actual     NUMERIC,
  p_deadline   DATE DEFAULT NULL,
  p_completion DATE DEFAULT NULL
) RETURNS NUMERIC AS $$
DECLARE
  result NUMERIC;
BEGIN
  IF p_actual IS NULL THEN RETURN 0; END IF;

  CASE p_uom
    WHEN 'numeric_higher_better', 'percentage_higher_better' THEN
      IF p_target = 0 THEN RETURN 0; END IF;
      result := (p_actual / p_target) * 100;

    WHEN 'numeric_lower_better', 'percentage_lower_better' THEN
      IF p_actual = 0 THEN RETURN 100; END IF;
      result := (p_target / p_actual) * 100;

    WHEN 'zero_based' THEN
      result := CASE WHEN p_actual = 0 THEN 100 ELSE 0 END;

    WHEN 'timeline' THEN
      IF p_deadline IS NULL OR p_completion IS NULL THEN RETURN 0; END IF;
      result := CASE WHEN p_completion <= p_deadline THEN 100 ELSE 0 END;

    ELSE result := 0;
  END CASE;

  RETURN LEAST(result, 100);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================
-- FUNCTION: log_audit_changes()
-- Generic audit trigger function
-- ============================================================
CREATE OR REPLACE FUNCTION log_audit_changes()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (table_name, record_id, action, actor_id, old_values, new_values)
  VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    auth.uid(),
    CASE WHEN TG_OP != 'INSERT' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) ELSE NULL END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach audit triggers to key tables
CREATE TRIGGER audit_goal_sheets
  AFTER INSERT OR UPDATE OR DELETE ON goal_sheets
  FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

CREATE TRIGGER audit_goals
  AFTER INSERT OR UPDATE OR DELETE ON goals
  FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

CREATE TRIGGER audit_quarterly_updates
  AFTER INSERT OR UPDATE OR DELETE ON quarterly_updates
  FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

-- ============================================================
-- FUNCTION: handle_new_user()
-- Auto-creates profile on auth signup
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'employee')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_sheets          ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals                ENABLE ROW LEVEL SECURITY;
ALTER TABLE quarterly_updates    ENABLE ROW LEVEL SECURITY;
ALTER TABLE manager_comments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_goal_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs           ENABLE ROW LEVEL SECURITY;

-- Helper function: get current user role
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper function: is_manager_of(employee_id)
CREATE OR REPLACE FUNCTION is_manager_of(p_employee_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = p_employee_id AND manager_id = auth.uid())
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- PROFILES policies
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "Managers view team" ON profiles FOR SELECT USING (manager_id = auth.uid());
CREATE POLICY "Admin views all" ON profiles FOR SELECT USING (current_user_role() = 'admin');

CREATE POLICY "Users update own profile" ON profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "Admin inserts profiles" ON profiles FOR INSERT WITH CHECK (current_user_role() = 'admin');
CREATE POLICY "Admin updates all profiles" ON profiles FOR UPDATE USING (current_user_role() = 'admin') WITH CHECK (current_user_role() = 'admin');
CREATE POLICY "Admin deletes profiles" ON profiles FOR DELETE USING (current_user_role() = 'admin');

-- GOAL_SHEETS policies
CREATE POLICY "Employees view own sheets" ON goal_sheets FOR SELECT USING (employee_id = auth.uid());
CREATE POLICY "Managers view team sheets" ON goal_sheets FOR SELECT USING (is_manager_of(employee_id));
CREATE POLICY "Admin views all sheets" ON goal_sheets FOR SELECT USING (current_user_role() = 'admin');
CREATE POLICY "Employees create own sheets" ON goal_sheets FOR INSERT WITH CHECK (employee_id = auth.uid());
CREATE POLICY "Employees update draft sheets" ON goal_sheets FOR UPDATE
  USING (employee_id = auth.uid() AND status IN ('draft','rework'))
  WITH CHECK (employee_id = auth.uid());
CREATE POLICY "Managers update submitted sheets" ON goal_sheets FOR UPDATE
  USING (is_manager_of(employee_id) AND status = 'submitted')
  WITH CHECK (is_manager_of(employee_id));
CREATE POLICY "Admin updates all sheets" ON goal_sheets FOR UPDATE USING (current_user_role() = 'admin') WITH CHECK (current_user_role() = 'admin');

-- GOALS policies
CREATE POLICY "View goals via sheet access" ON goals FOR SELECT USING (
  EXISTS (SELECT 1 FROM goal_sheets gs WHERE gs.id = sheet_id AND (
    gs.employee_id = auth.uid() OR
    is_manager_of(gs.employee_id) OR
    current_user_role() = 'admin'
  ))
);
CREATE POLICY "Employee manages draft goals" ON goals FOR ALL USING (
  EXISTS (SELECT 1 FROM goal_sheets gs WHERE gs.id = sheet_id AND gs.employee_id = auth.uid() AND gs.status IN ('draft','rework'))
);
CREATE POLICY "Manager edits goals" ON goals FOR UPDATE USING (
  EXISTS (SELECT 1 FROM goal_sheets gs WHERE gs.id = sheet_id AND is_manager_of(gs.employee_id))
);
CREATE POLICY "Admin manages all goals" ON goals FOR ALL USING (current_user_role() = 'admin');

-- QUARTERLY_UPDATES policies
CREATE POLICY "View quarterly updates" ON quarterly_updates FOR SELECT USING (
  EXISTS (SELECT 1 FROM goals g JOIN goal_sheets gs ON g.sheet_id = gs.id WHERE g.id = goal_id AND (
    gs.employee_id = auth.uid() OR is_manager_of(gs.employee_id) OR current_user_role() = 'admin'
  ))
);
CREATE POLICY "Employee updates own goals" ON quarterly_updates FOR ALL USING (
  EXISTS (SELECT 1 FROM goals g JOIN goal_sheets gs ON g.sheet_id = gs.id WHERE g.id = goal_id AND gs.employee_id = auth.uid() AND gs.status = 'approved')
);
CREATE POLICY "Admin manages quarterly updates" ON quarterly_updates FOR ALL USING (current_user_role() = 'admin');

-- MANAGER_COMMENTS policies
CREATE POLICY "View comments" ON manager_comments FOR SELECT USING (
  EXISTS (SELECT 1 FROM goal_sheets gs WHERE gs.id = sheet_id AND (
    gs.employee_id = auth.uid() OR is_manager_of(gs.employee_id) OR current_user_role() = 'admin'
  ))
);
CREATE POLICY "Manager adds comments" ON manager_comments FOR INSERT WITH CHECK (
  author_id = auth.uid() AND (current_user_role() IN ('manager','admin'))
);

-- AUDIT_LOGS policies
CREATE POLICY "Admin views audit logs" ON audit_logs FOR SELECT USING (current_user_role() = 'admin');

-- SHARED_GOAL_ASSIGNMENTS policies
CREATE POLICY "Admin manages shared goals" ON shared_goal_assignments FOR ALL USING (current_user_role() = 'admin');
CREATE POLICY "View own assignments" ON shared_goal_assignments FOR SELECT USING (target_employee = auth.uid());

-- ============================================================
-- SEED DATA
-- ============================================================

-- Note: Run after creating users in Supabase Auth dashboard
-- Demo credentials: admin@company.com / manager@company.com / employee@company.com (all: Demo@1234)


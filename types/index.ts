// ============================================================
// Goal Setting & Tracking Portal — Type Definitions
// ============================================================

export type UserRole = 'employee' | 'manager' | 'admin'
export type GoalSheetStatus = 'draft' | 'submitted' | 'approved' | 'locked' | 'rework'
export type ProgressStatus = 'not_started' | 'on_track' | 'completed'
export type Quarter = 'Q1' | 'Q2' | 'Q3' | 'Q4'

export type UomType =
  | 'numeric_higher_better'
  | 'numeric_lower_better'
  | 'percentage_higher_better'
  | 'percentage_lower_better'
  | 'timeline'
  | 'zero_based'

// ============================================================
// Database Row Types
// ============================================================

export interface Profile {
  id: string
  email: string
  full_name: string
  role: UserRole
  manager_id: string | null
  department: string | null
  designation: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface GoalSheet {
  id: string
  employee_id: string
  financial_year: string
  status: GoalSheetStatus
  submitted_at: string | null
  approved_at: string | null
  approved_by: string | null
  locked_at: string | null
  locked_by: string | null
  created_at: string
  updated_at: string
}

export interface Goal {
  id: string
  sheet_id: string
  thrust_area: string
  title: string
  description: string | null
  uom: UomType
  target_value: number | null
  weightage: number
  sequence: number
  is_shared: boolean
  shared_from: string | null
  created_at: string
  updated_at: string
}

export interface QuarterlyUpdate {
  id: string
  goal_id: string
  quarter: Quarter
  actual_value: number | null
  completion_date: string | null
  status: ProgressStatus
  progress_pct: number | null
  notes: string | null
  updated_at: string
}

export interface ManagerComment {
  id: string
  sheet_id: string
  goal_id: string | null
  quarter: Quarter | null
  author_id: string
  comment: string
  created_at: string
  author?: Profile
}

export interface AuditLog {
  id: string
  table_name: string
  record_id: string
  action: 'INSERT' | 'UPDATE' | 'DELETE'
  actor_id: string | null
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  ip_address: string | null
  created_at: string
  actor?: Profile
}

export interface SharedGoalAssignment {
  id: string
  source_goal_id: string
  target_employee: string
  assigned_by: string
  weightage: number
  assigned_at: string
}

// ============================================================
// Composed / UI Types
// ============================================================

export interface GoalSheetWithDetails extends GoalSheet {
  employee?: Profile
  goals?: GoalWithUpdates[]
  comments?: ManagerComment[]
  total_weightage?: number
}

export interface GoalWithUpdates extends Goal {
  quarterly_updates?: QuarterlyUpdate[]
  overall_progress?: number
}

export interface TeamMemberSummary {
  profile: Profile
  sheet: GoalSheet | null
  goal_count: number
  total_weightage: number
  avg_progress: number
}

// ============================================================
// Form Types (Zod schemas live in lib/validations.ts)
// ============================================================

export interface GoalFormData {
  thrust_area: string
  title: string
  description?: string
  uom: UomType
  target_value?: number
  weightage: number
}

export interface QuarterlyUpdateFormData {
  actual_value?: number
  completion_date?: string
  status: ProgressStatus
  notes?: string
}

export interface ManagerCommentFormData {
  comment: string
  goal_id?: string
  quarter?: Quarter
}

// ============================================================
// Utility Types
// ============================================================

export type ActionResult<T = void> =
  | { success: true; data: T; message?: string }
  | { success: false; error: string }

export const UOM_LABELS: Record<UomType, string> = {
  numeric_higher_better: 'Numeric (Higher is Better)',
  numeric_lower_better: 'Numeric (Lower is Better)',
  percentage_higher_better: 'Percentage (Higher is Better)',
  percentage_lower_better: 'Percentage (Lower is Better)',
  timeline: 'Timeline',
  zero_based: 'Zero-Based',
}

export const STATUS_LABELS: Record<GoalSheetStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  approved: 'Approved',
  locked: 'Locked',
  rework: 'Rework',
}

export const PROGRESS_LABELS: Record<ProgressStatus, string> = {
  not_started: 'Not Started',
  on_track: 'On Track',
  completed: 'Completed',
}

export const QUARTERS: Quarter[] = ['Q1', 'Q2', 'Q3', 'Q4']

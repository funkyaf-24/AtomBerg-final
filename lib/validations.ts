import { z } from 'zod'

// ============================================================
// Goal Form Schema
// ============================================================
export const goalSchema = z.object({
  thrust_area: z.string().min(2, 'Thrust area is required').max(100),
  title: z.string().min(3, 'Goal title is required').max(200),
  description: z.string().max(500).optional(),
  uom: z.enum([
    'numeric_higher_better',
    'numeric_lower_better',
    'percentage_higher_better',
    'percentage_lower_better',
    'timeline',
    'zero_based',
  ]),
  target_value: z.coerce.number().optional(),
  weightage: z.coerce
    .number()
    .min(10, 'Minimum weightage is 10%')
    .max(100, 'Maximum weightage is 100%'),
})

export type GoalSchema = z.infer<typeof goalSchema>

// ============================================================
// Goal Sheet Submit Validation
// ============================================================
export const goalSheetSubmitSchema = z.object({
  sheet_id: z.string().uuid(),
})

// ============================================================
// Quarterly Update Schema
// ============================================================
export const quarterlyUpdateSchema = z.object({
  actual_value: z.coerce.number().optional(),
  completion_date: z.string().optional(),
  status: z.enum(['not_started', 'on_track', 'completed']),
  notes: z.string().max(500).optional(),
})

export type QuarterlyUpdateSchema = z.infer<typeof quarterlyUpdateSchema>

// ============================================================
// Manager Comment Schema
// ============================================================
export const managerCommentSchema = z.object({
  comment: z.string().min(5, 'Comment must be at least 5 characters').max(1000),
  goal_id: z.string().uuid().optional(),
  quarter: z.enum(['Q1', 'Q2', 'Q3', 'Q4']).optional(),
})

export type ManagerCommentSchema = z.infer<typeof managerCommentSchema>

// ============================================================
// User Profile Schema (Admin)
// ============================================================
export const userProfileSchema = z.object({
  full_name: z.string().min(2).max(100),
  email: z.string().email(),
  role: z.enum(['employee', 'manager', 'admin']),
  manager_id: z.string().uuid().optional().nullable(),
  department: z.string().max(100).optional(),
  designation: z.string().max(100).optional(),
})

export type UserProfileSchema = z.infer<typeof userProfileSchema>

// ============================================================
// Login Schema
// ============================================================
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export type LoginSchema = z.infer<typeof loginSchema>

// ============================================================
// Shared Goal Assignment Schema
// ============================================================
export const sharedGoalAssignmentSchema = z.object({
  source_goal_id: z.string().uuid(),
  target_employee_ids: z.array(z.string().uuid()).min(1, 'Select at least one employee'),
  weightage: z.coerce.number().min(10).max(100),
})

export type SharedGoalAssignmentSchema = z.infer<typeof sharedGoalAssignmentSchema>

'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { quarterlyUpdateSchema } from '@/lib/validations'
import { calculateProgress } from '@/lib/utils'
import type { ActionResult, Quarter, UomType } from '@/types'

// ============================================================
// Save quarterly update
// ============================================================
export async function saveQuarterlyUpdate(
  goalId: string,
  quarter: Quarter,
  formData: unknown
): Promise<ActionResult> {
  const supabase = await createClient()

  const parsed = quarterlyUpdateSchema.safeParse(formData)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message }
  }

  // Get goal to calculate progress
  const { data: goal } = await supabase
    .from('goals')
    .select('uom, target_value')
    .eq('id', goalId)
    .single()

  const progress = goal
    ? calculateProgress(
        goal.uom as UomType,
        goal.target_value,
        parsed.data.actual_value,
        undefined,
        parsed.data.completion_date
      )
    : 0

  // Upsert quarterly update
  const { error } = await supabase
    .from('quarterly_updates')
    .upsert(
      {
        goal_id: goalId,
        quarter,
        ...parsed.data,
        progress_pct: Math.round(progress * 10) / 10,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'goal_id,quarter' }
    )

  if (error) return { success: false, error: error.message }

  revalidatePath('/employee/dashboard')
  return { success: true, data: undefined, message: `${quarter} update saved` }
}

// ============================================================
// ADMIN: Unlock a goal sheet
// ============================================================
export async function unlockGoalSheet(sheetId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { success: false, error: 'Not authenticated' }

  const { error } = await supabase
    .from('goal_sheets')
    .update({ status: 'approved', locked_at: null, locked_by: null })
    .eq('id', sheetId)
    .eq('status', 'locked')

  if (error) return { success: false, error: error.message }

  revalidatePath('/admin/dashboard')
  return { success: true, data: undefined, message: 'Goal sheet unlocked' }
}

// ============================================================
// ADMIN: Lock a goal sheet
// ============================================================
export async function lockGoalSheet(sheetId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { success: false, error: 'Not authenticated' }

  const { error } = await supabase
    .from('goal_sheets')
    .update({
      status: 'locked',
      locked_at: new Date().toISOString(),
      locked_by: user.id,
    })
    .eq('id', sheetId)
    .eq('status', 'approved')

  if (error) return { success: false, error: error.message }

  revalidatePath('/admin/dashboard')
  return { success: true, data: undefined, message: 'Goal sheet locked' }
}

// ============================================================
// ADMIN: Get all goal sheets with employee details
// ============================================================
export async function getAllGoalSheets(year?: string) {
  const supabase = await createClient()

  let query = supabase
    .from('goal_sheets')
    .select(`
      *,
      employee:profiles!goal_sheets_employee_id_fkey (
        id, full_name, email, department, designation,
        manager:profiles!profiles_manager_id_fkey (full_name)
      ),
      goals (id, weightage, quarterly_updates (progress_pct))
    `)
    .order('created_at', { ascending: false })

  if (year) query = query.eq('financial_year', year)

  const { data, error } = await query

  if (error) return { success: false as const, error: error.message }
  return { success: true as const, data: data ?? [] }
}

// ============================================================
// ADMIN: Get audit logs
// ============================================================
export async function getAuditLogs(options?: {
  table?: string
  limit?: number
  offset?: number
}) {
  const supabase = await createClient()

  let query = supabase
    .from('audit_logs')
    .select(`
      *,
      actor:profiles!audit_logs_actor_id_fkey (full_name, email)
    `)
    .order('created_at', { ascending: false })
    .limit(options?.limit ?? 50)

  if (options?.table) query = query.eq('table_name', options.table)
  if (options?.offset) query = query.range(options.offset, options.offset + (options?.limit ?? 50) - 1)

  const { data, error } = await query

  if (error) return { success: false as const, error: error.message }
  return { success: true as const, data: data ?? [] }
}

// ============================================================
// ADMIN: Export report data
// ============================================================
export async function getReportData(year: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('goal_sheets')
    .select(`
      financial_year, status,
      employee:profiles!goal_sheets_employee_id_fkey (
        full_name, email, department, designation,
        manager:profiles!profiles_manager_id_fkey (full_name)
      ),
      goals (
        thrust_area, title, uom, target_value, weightage,
        quarterly_updates (quarter, actual_value, progress_pct, status)
      )
    `)
    .eq('financial_year', year)

  if (error) return { success: false as const, error: error.message }

  // Flatten for CSV export
  const rows = (data ?? []).flatMap(sheet => {
    const employee = sheet.employee as Record<string, unknown>
    const manager = (employee?.manager as Record<string, unknown>)?.full_name ?? '—'

    return (sheet.goals as Record<string, unknown>[]).map(goal => ({
      financial_year: sheet.financial_year,
      employee_name: employee?.full_name,
      employee_email: employee?.email,
      department: employee?.department,
      designation: employee?.designation,
      manager_name: manager,
      sheet_status: sheet.status,
      thrust_area: goal.thrust_area,
      goal_title: goal.title,
      uom: goal.uom,
      target_value: goal.target_value ?? '—',
      weightage: goal.weightage,
      q1_actual: '',
      q1_progress: '',
      q2_actual: '',
      q2_progress: '',
      q3_actual: '',
      q3_progress: '',
      q4_actual: '',
      q4_progress: '',
    }))
  })

  return { success: true as const, data: rows }
}

// ============================================================
// ADMIN: Assign shared goal
// ============================================================
export async function assignSharedGoal(
  sourceGoalId: string,
  targetEmployeeIds: string[],
  weightage: number
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { success: false, error: 'Not authenticated' }

  const assignments = targetEmployeeIds.map(emp => ({
    source_goal_id: sourceGoalId,
    target_employee: emp,
    assigned_by: user.id,
    weightage,
  }))

  const { error } = await supabase
    .from('shared_goal_assignments')
    .upsert(assignments, { onConflict: 'source_goal_id,target_employee' })

  if (error) return { success: false, error: error.message }

  revalidatePath('/admin/shared-goals')
  return { success: true, data: undefined, message: `Shared goal assigned to ${targetEmployeeIds.length} employee(s)` }
}

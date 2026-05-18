'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { goalSchema } from '@/lib/validations'
import type { ActionResult, Goal } from '@/types'

// ============================================================
// Get or create goal sheet for current user & year
// ============================================================
export async function getOrCreateGoalSheet(financialYear: string): Promise<ActionResult<{ sheet_id: string }>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { success: false, error: 'Not authenticated' }

  // Check existing sheet
  const { data: existing } = await supabase
    .from('goal_sheets')
    .select('id, status')
    .eq('employee_id', user.id)
    .eq('financial_year', financialYear)
    .single()

  if (existing) {
    return { success: true, data: { sheet_id: existing.id } }
  }

  // Create new sheet
  const { data: newSheet, error } = await supabase
    .from('goal_sheets')
    .insert({ employee_id: user.id, financial_year: financialYear })
    .select('id')
    .single()

  if (error || !newSheet) {
    return { success: false, error: error?.message ?? 'Failed to create goal sheet' }
  }

  return { success: true, data: { sheet_id: newSheet.id } }
}

// ============================================================
// Get goals for a sheet
// ============================================================
export async function getGoalsForSheet(sheetId: string): Promise<ActionResult<Goal[]>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('sheet_id', sheetId)
    .order('sequence')

  if (error) return { success: false, error: error.message }
  return { success: true, data: data ?? [] }
}

// ============================================================
// Create a goal
// ============================================================
export async function createGoal(
  sheetId: string,
  formData: unknown
): Promise<ActionResult<Goal>> {
  const supabase = await createClient()

  // Validate
  const parsed = goalSchema.safeParse(formData)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message }
  }

  // Check max 8 goals
  const { count } = await supabase
    .from('goals')
    .select('id', { count: 'exact', head: true })
    .eq('sheet_id', sheetId)

  if ((count ?? 0) >= 8) {
    return { success: false, error: 'Maximum 8 goals allowed per goal sheet' }
  }

  // Check total weightage won't exceed 100
  const { data: existing } = await supabase
    .from('goals')
    .select('weightage')
    .eq('sheet_id', sheetId)

  const currentTotal = existing?.reduce((sum, g) => sum + g.weightage, 0) ?? 0
  if (currentTotal + parsed.data.weightage > 100) {
    return {
      success: false,
      error: `Adding ${parsed.data.weightage}% would exceed 100%. Remaining: ${100 - currentTotal}%`
    }
  }

  const { data, error } = await supabase
    .from('goals')
    .insert({
      sheet_id: sheetId,
      ...parsed.data,
      sequence: (count ?? 0) + 1,
    })
    .select()
    .single()

  if (error || !data) return { success: false, error: error?.message ?? 'Failed to create goal' }

  revalidatePath('/employee/dashboard')
  return { success: true, data }
}

// ============================================================
// Update a goal
// ============================================================
export async function updateGoal(
  goalId: string,
  formData: unknown
): Promise<ActionResult<Goal>> {
  const supabase = await createClient()

  const parsed = goalSchema.safeParse(formData)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message }
  }

  // Verify sheet is in editable state
  const { data: goal } = await supabase
    .from('goals')
    .select('sheet_id, goal_sheets(status)')
    .eq('id', goalId)
    .single()

  const sheetStatus = (goal?.goal_sheets as { status: string } | null)?.status
  if (!['draft', 'rework'].includes(sheetStatus ?? '')) {
    return { success: false, error: 'Goal sheet is not in an editable state' }
  }

  // Re-check weightage (excluding this goal)
  const { data: siblings } = await supabase
    .from('goals')
    .select('weightage')
    .eq('sheet_id', goal!.sheet_id)
    .neq('id', goalId)

  const otherTotal = siblings?.reduce((sum, g) => sum + g.weightage, 0) ?? 0
  if (otherTotal + parsed.data.weightage > 100) {
    return {
      success: false,
      error: `Weightage exceeds 100%. Available: ${100 - otherTotal}%`
    }
  }

  const { data, error } = await supabase
    .from('goals')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', goalId)
    .select()
    .single()

  if (error || !data) return { success: false, error: error?.message ?? 'Failed to update goal' }

  revalidatePath('/employee/dashboard')
  return { success: true, data }
}

// ============================================================
// Delete a goal
// ============================================================
export async function deleteGoal(goalId: string): Promise<ActionResult> {
  const supabase = await createClient()

  const { error } = await supabase.from('goals').delete().eq('id', goalId)

  if (error) return { success: false, error: error.message }

  revalidatePath('/employee/dashboard')
  return { success: true, data: undefined }
}

// ============================================================
// Submit goal sheet
// ============================================================
export async function submitGoalSheet(sheetId: string): Promise<ActionResult> {
  const supabase = await createClient()

  // Validate total weightage = 100
  const { data: goals } = await supabase
    .from('goals')
    .select('weightage')
    .eq('sheet_id', sheetId)

  if (!goals || goals.length === 0) {
    return { success: false, error: 'Add at least one goal before submitting' }
  }

  const total = goals.reduce((sum, g) => sum + g.weightage, 0)
  if (Math.abs(total - 100) > 0.01) {
    return { success: false, error: `Total weightage must be 100%. Currently: ${total}%` }
  }

  const { error } = await supabase
    .from('goal_sheets')
    .update({
      status: 'submitted',
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', sheetId)
    .in('status', ['draft', 'rework'])

  if (error) return { success: false, error: error.message }

  revalidatePath('/employee/dashboard')
  return { success: true, data: undefined, message: 'Goal sheet submitted for review' }
}

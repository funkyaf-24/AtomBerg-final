'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { managerCommentSchema } from '@/lib/validations'
import type { ActionResult } from '@/types'

// ============================================================
// Get team submissions (for manager dashboard)
// ============================================================
export async function getTeamSubmissions() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { success: false as const, error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('profiles')
    .select(`
      *,
      goal_sheets (
        id, status, financial_year, submitted_at,
        goals (id, weightage)
      )
    `)
    .eq('manager_id', user.id)
    .eq('is_active', true)

  if (error) return { success: false as const, error: error.message }
  return { success: true as const, data: data ?? [] }
}

// ============================================================
// Get sheet details for review
// ============================================================
export async function getSheetForReview(sheetId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('goal_sheets')
    .select(`
      *,
      employee:profiles!goal_sheets_employee_id_fkey (
        id, full_name, email, department, designation
      ),
      goals (
        *,
        quarterly_updates (*)
      ),
      manager_comments (
        *,
        author:profiles!manager_comments_author_id_fkey (full_name, role)
      )
    `)
    .eq('id', sheetId)
    .single()

  if (error) return { success: false as const, error: error.message }
  return { success: true as const, data }
}

// ============================================================
// Approve goal sheet
// ============================================================
export async function approveGoalSheet(sheetId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { success: false, error: 'Not authenticated' }

  // First verify this manager owns this sheet's employee, OR is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const { data: sheet } = await supabase
    .from('goal_sheets')
    .select('id, status, employee_id')
    .eq('id', sheetId)
    .single()

  if (!sheet) return { success: false, error: 'Goal sheet not found' }
  if (sheet.status !== 'submitted') return { success: false, error: 'Sheet is not in submitted status' }

  if (profile?.role !== 'admin') {
    // Verify manager owns this employee
    const { data: emp } = await supabase
      .from('profiles')
      .select('manager_id')
      .eq('id', sheet.employee_id)
      .single()

    if (emp?.manager_id !== user.id) {
      return { success: false, error: 'You are not authorized to approve this sheet' }
    }
  }

  const { error } = await supabase
    .from('goal_sheets')
    .update({
      status: 'approved',
      approved_at: new Date().toISOString(),
      approved_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', sheetId)

  if (error) return { success: false, error: error.message }

  revalidatePath('/manager/dashboard')
  revalidatePath('/manager/team')
  revalidatePath(`/manager/review/${sheetId}`)
  return { success: true, data: undefined, message: 'Goal sheet approved successfully' }
}

// ============================================================
// Send back for rework
// ============================================================
export async function sendForRework(sheetId: string, reason: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { success: false, error: 'Not authenticated' }

  // Verify ownership
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const { data: sheet } = await supabase
    .from('goal_sheets')
    .select('id, status, employee_id')
    .eq('id', sheetId)
    .single()

  if (!sheet) return { success: false, error: 'Goal sheet not found' }
  if (sheet.status !== 'submitted') return { success: false, error: 'Sheet is not in submitted status' }

  if (profile?.role !== 'admin') {
    const { data: emp } = await supabase
      .from('profiles')
      .select('manager_id')
      .eq('id', sheet.employee_id)
      .single()

    if (emp?.manager_id !== user.id) {
      return { success: false, error: 'You are not authorized to review this sheet' }
    }
  }

  // Update sheet status
  const { error } = await supabase
    .from('goal_sheets')
    .update({
      status: 'rework',
      updated_at: new Date().toISOString(),
    })
    .eq('id', sheetId)

  if (error) return { success: false, error: error.message }

  // Add rework comment
  await supabase.from('manager_comments').insert({
    sheet_id: sheetId,
    author_id: user.id,
    comment: `[Rework Required] ${reason}`,
  })

  revalidatePath('/manager/dashboard')
  revalidatePath(`/manager/review/${sheetId}`)
  return { success: true, data: undefined, message: 'Sheet sent back for rework' }
}

// ============================================================
// Add manager comment
// ============================================================
export async function addManagerComment(
  sheetId: string,
  formData: unknown
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { success: false, error: 'Not authenticated' }

  const parsed = managerCommentSchema.safeParse(formData)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message }
  }

  const { error } = await supabase.from('manager_comments').insert({
    sheet_id: sheetId,
    author_id: user.id,
    ...parsed.data,
  })

  if (error) return { success: false, error: error.message }

  revalidatePath(`/manager/review/${sheetId}`)
  return { success: true, data: undefined, message: 'Comment added' }
}

// ============================================================
// Quarterly check-in comment
// ============================================================
export async function addQuarterlyComment(
  sheetId: string,
  goalId: string,
  quarter: string,
  comment: string
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { success: false, error: 'Not authenticated' }

  const { error } = await supabase.from('manager_comments').insert({
    sheet_id: sheetId,
    goal_id: goalId,
    quarter,
    author_id: user.id,
    comment,
  })

  if (error) return { success: false, error: error.message }

  revalidatePath(`/manager/review/${sheetId}`)
  return { success: true, data: undefined, message: 'Check-in comment added' }
}

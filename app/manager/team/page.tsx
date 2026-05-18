import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { TeamContent } from '@/components/manager/TeamContent'
import { getCurrentFinancialYear } from '@/lib/utils'

export default async function TeamPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile || !['manager', 'admin'].includes(profile.role)) redirect('/employee/dashboard')

  const year = getCurrentFinancialYear()

  // Step 1: fetch direct-report profiles.
  // NOTE: profiles → goal_sheets has THREE foreign keys (employee_id, approved_by, locked_by).
  // PostgREST cannot infer which FK to use for a reverse join from profiles, so the nested
  // select `goal_sheets(...)` with no FK hint returns a PostgREST error → data = null → [].
  // Fix: fetch profiles first, then fetch goal_sheets in a second query using the
  // unambiguous forward direction (goal_sheets!goal_sheets_employee_id_fkey) joined back.
  const { data: members } = await supabase
    .from('profiles')
    .select('id, full_name, email, department, designation, role, is_active, manager_id, created_at, updated_at')
    .eq('manager_id', user.id)
    .eq('is_active', true)
    .order('full_name')

  const memberIds = (members ?? []).map(m => m.id)

  // Step 2: fetch all goal sheets for those members, with FK hint to resolve the ambiguity.
  // goal_sheets!goal_sheets_employee_id_fkey tells PostgREST exactly which FK to use.
  let sheets: any[] = []
  if (memberIds.length > 0) {
    const { data: sheetData } = await supabase
      .from('goal_sheets')
      .select(`
        id, employee_id, status, financial_year, submitted_at, approved_at,
        goals (
          id, weightage, thrust_area,
          quarterly_updates (quarter, progress_pct, status)
        )
      `)
      .in('employee_id', memberIds)
    sheets = sheetData ?? []
  }

  // Step 3: merge — attach goal_sheets array to each member profile.
  const team = (members ?? []).map(m => ({
    ...m,
    goal_sheets: sheets.filter(s => s.employee_id === m.id),
  }))

  return (
    <div className="flex min-h-screen">
      <Sidebar profile={profile} />
      <main className="flex-1 lg:ml-60 pt-14 lg:pt-0">
        <TeamContent team={team} year={year} managerName={profile.full_name} />
      </main>
    </div>
  )
}

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { ManagerDashboardContent } from '@/components/manager/ManagerDashboardContent'
import { getCurrentFinancialYear } from '@/lib/utils'

export default async function ManagerDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile || !['manager', 'admin'].includes(profile.role)) {
    redirect('/employee/dashboard')
  }

  const currentYear = getCurrentFinancialYear()

  // FIX: profiles→goal_sheets has THREE FKs (employee_id, approved_by, locked_by).
  // A single nested select from profiles has no way to know which FK to use → PostgREST
  // errors → data = null → team = [] → "0 direct reports".
  // Solution: two-step query (same pattern as PendingReviews which already works).

  // Step 1: direct-report profiles
  const { data: members } = await supabase
    .from('profiles')
    .select('*')
    .eq('manager_id', user.id)
    .eq('is_active', true)
    .order('full_name')

  const memberIds = (members ?? []).map((m: any) => m.id)

  // Step 2: goal sheets for those members (forward direction — unambiguous)
  let sheets: any[] = []
  if (memberIds.length > 0) {
    const { data: sheetData } = await supabase
      .from('goal_sheets')
      .select('id, employee_id, status, financial_year, submitted_at, goals (id, weightage, quarterly_updates (progress_pct))')
      .in('employee_id', memberIds)
    sheets = sheetData ?? []
  }

  // Step 3: merge
  const team = (members ?? []).map((m: any) => ({
    ...m,
    goal_sheets: sheets.filter((s: any) => s.employee_id === m.id),
  }))

  return (
    <div className="flex min-h-screen">
      <Sidebar profile={profile} />
      <main className="flex-1 lg:ml-60 pt-14 lg:pt-0">
        <ManagerDashboardContent profile={profile} team={team} currentYear={currentYear} />
      </main>
    </div>
  )
}

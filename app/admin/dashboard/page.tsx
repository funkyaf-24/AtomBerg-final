import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { AdminDashboardContent } from '@/components/admin/AdminDashboardContent'
import { getCurrentFinancialYear } from '@/lib/utils'

export default async function AdminDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') redirect('/employee/dashboard')

  const year = getCurrentFinancialYear()

  // Summary stats
  const [
    { count: totalEmployees },
    { count: pendingCount },
    { count: approvedCount },
    { count: lockedCount },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'employee').eq('is_active', true),
    supabase.from('goal_sheets').select('*', { count: 'exact', head: true }).eq('status', 'submitted').eq('financial_year', year),
    supabase.from('goal_sheets').select('*', { count: 'exact', head: true }).eq('status', 'approved').eq('financial_year', year),
    supabase.from('goal_sheets').select('*', { count: 'exact', head: true }).eq('status', 'locked').eq('financial_year', year),
  ])

  // Recent sheets — avoid self-join on profiles (PostgREST errors on ambiguous self-FK).
  // Step 1: fetch sheets with employee info (no manager self-join here)
  const { data: rawSheets } = await supabase
    .from('goal_sheets')
    .select(`
      id, status, financial_year, submitted_at, updated_at, employee_id,
      employee:profiles!goal_sheets_employee_id_fkey (
        full_name, email, department, manager_id
      ),
      goals (id)
    `)
    .eq('financial_year', year)
    .order('updated_at', { ascending: false })
    .limit(20)

  // Step 2: collect unique manager_ids, fetch their names in one query
  const managerIds = [...new Set(
    (rawSheets ?? []).map((s: any) => s.employee?.manager_id).filter(Boolean)
  )]
  let managerMap: Record<string, string> = {}
  if (managerIds.length > 0) {
    const { data: managers } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', managerIds)
    ;(managers ?? []).forEach((m: any) => { managerMap[m.id] = m.full_name })
  }

  // Step 3: merge manager name onto each sheet's employee
  const recentSheets = (rawSheets ?? []).map((s: any) => ({
    ...s,
    employee: s.employee ? {
      ...s.employee,
      manager: s.employee.manager_id ? { full_name: managerMap[s.employee.manager_id] ?? null } : null,
    } : null,
  }))

  return (
    <div className="flex min-h-screen">
      <Sidebar profile={profile} />
      <main className="flex-1 lg:ml-60 pt-14 lg:pt-0">
        <AdminDashboardContent
          profile={profile}
          year={year}
          stats={{ totalEmployees: totalEmployees ?? 0, pendingCount: pendingCount ?? 0, approvedCount: approvedCount ?? 0, lockedCount: lockedCount ?? 0 }}
          recentSheets={recentSheets}
        />
      </main>
    </div>
  )
}

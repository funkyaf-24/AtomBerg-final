import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { AdminDashboardContent } from '@/components/admin/AdminDashboardContent'
import { getCurrentFinancialYear } from '@/lib/utils'

export default async function AllGoalSheetsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile || profile.role !== 'admin') redirect('/employee/dashboard')

  const year = getCurrentFinancialYear()

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

  const { data: recentSheets } = await supabase
    .from('goal_sheets')
    .select(`
      id, status, financial_year, submitted_at, updated_at,
      employee:profiles!goal_sheets_employee_id_fkey (
        full_name, email, department,
        manager:profiles!profiles_manager_id_fkey (full_name)
      ),
      goals (id)
    `)
    .order('updated_at', { ascending: false })

  return (
    <div className="flex min-h-screen">
      <Sidebar profile={profile} />
      <main className="flex-1 lg:ml-60 pt-14 lg:pt-0">
        <AdminDashboardContent
          profile={profile}
          year={year}
          stats={{ totalEmployees: totalEmployees ?? 0, pendingCount: pendingCount ?? 0, approvedCount: approvedCount ?? 0, lockedCount: lockedCount ?? 0 }}
          recentSheets={recentSheets ?? []}
        />
      </main>
    </div>
  )
}

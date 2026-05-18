import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { ReportsContent } from '@/components/admin/ReportsContent'

export default async function ReportsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile || profile.role !== 'admin') redirect('/employee/dashboard')

  // Get full report data
  const { data: reportData } = await supabase
    .from('goal_sheets')
    .select(`
      id, financial_year, status, submitted_at,
      employee:profiles!goal_sheets_employee_id_fkey (
        full_name, email, department, designation,
        manager:profiles!profiles_manager_id_fkey (full_name)
      ),
      goals (
        id, thrust_area, title, uom, target_value, weightage, is_shared,
        quarterly_updates (quarter, actual_value, progress_pct, status, notes)
      )
    `)
    .order('financial_year', { ascending: false })
    .order('updated_at', { ascending: false })

  // Department analytics
  const { data: deptStats } = await supabase
    .from('profiles')
    .select('department, goal_sheets(status)')
    .eq('role', 'employee')
    .eq('is_active', true)

  return (
    <div className="flex min-h-screen">
      <Sidebar profile={profile} />
      <main className="flex-1 lg:ml-60 pt-14 lg:pt-0">
        <ReportsContent reportData={reportData ?? []} deptStats={deptStats ?? []} />
      </main>
    </div>
  )
}

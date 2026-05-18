import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { SharedGoalsContent } from '@/components/admin/SharedGoalsContent'

export default async function SharedGoalsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile || profile.role !== 'admin') redirect('/employee/dashboard')

  // Fetch all approved goals to share from
  const { data: approvedGoals } = await supabase
    .from('goals')
    .select(`
      id, title, thrust_area, weightage,
      goal_sheets!inner (status, financial_year,
        employee:profiles!goal_sheets_employee_id_fkey (full_name, email)
      )
    `)
    .eq('goal_sheets.status', 'approved')
    .order('title')

  // Fetch existing assignments
  const { data: assignments } = await supabase
    .from('shared_goal_assignments')
    .select(`
      *,
      source_goal:goals (title, thrust_area),
      employee:profiles!shared_goal_assignments_target_employee_fkey (full_name, email),
      assigner:profiles!shared_goal_assignments_assigned_by_fkey (full_name)
    `)
    .order('assigned_at', { ascending: false })

  // All employees for assignment target
  const { data: employees } = await supabase
    .from('profiles')
    .select('id, full_name, email, department')
    .eq('role', 'employee')
    .eq('is_active', true)
    .order('full_name')

  return (
    <div className="flex min-h-screen">
      <Sidebar profile={profile} />
      <main className="flex-1 lg:ml-60 pt-14 lg:pt-0">
        <SharedGoalsContent
          approvedGoals={approvedGoals ?? []}
          assignments={assignments ?? []}
          employees={employees ?? []}
        />
      </main>
    </div>
  )
}

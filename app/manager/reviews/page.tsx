import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { PendingReviewsContent } from '@/components/manager/PendingReviewsContent'

export default async function PendingReviewsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile || !['manager', 'admin'].includes(profile.role)) redirect('/employee/dashboard')

  let pending

  if (profile.role === 'admin') {
    // Admin sees ALL submitted sheets
    const { data } = await supabase
      .from('goal_sheets')
      .select(`
        *,
        employee:profiles!goal_sheets_employee_id_fkey (
          id, full_name, email, department, designation
        ),
        goals (id, weightage, thrust_area, title)
      `)
      .eq('status', 'submitted')
      .order('submitted_at', { ascending: true })
    pending = data ?? []
  } else {
    // Manager: get their team members first, then their submitted sheets
    const { data: teamMembers } = await supabase
      .from('profiles')
      .select('id')
      .eq('manager_id', user.id)
      .eq('is_active', true)

    const teamIds = (teamMembers ?? []).map(m => m.id)

    if (teamIds.length === 0) {
      pending = []
    } else {
      const { data } = await supabase
        .from('goal_sheets')
        .select(`
          *,
          employee:profiles!goal_sheets_employee_id_fkey (
            id, full_name, email, department, designation
          ),
          goals (id, weightage, thrust_area, title)
        `)
        .eq('status', 'submitted')
        .in('employee_id', teamIds)
        .order('submitted_at', { ascending: true })
      pending = data ?? []
    }
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar profile={profile} />
      <main className="flex-1 lg:ml-60 pt-14 lg:pt-0">
        <PendingReviewsContent sheets={pending} />
      </main>
    </div>
  )
}

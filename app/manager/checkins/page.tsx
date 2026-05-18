import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { CheckInsContent } from '@/components/manager/CheckInsContent'
import { getCurrentFinancialYear } from '@/lib/utils'

export default async function CheckInsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile || !['manager', 'admin'].includes(profile.role)) redirect('/employee/dashboard')

  const year = getCurrentFinancialYear()

  // Get approved team sheets with full goal + progress data
  const { data: team } = await supabase
    .from('profiles')
    .select(`
      id, full_name, email, department, designation,
      goal_sheets!inner (
        id, status, financial_year,
        goals (
          id, title, thrust_area, uom, target_value, weightage,
          quarterly_updates (*),
          manager_comments: manager_comments (
            id, quarter, comment, created_at,
            author: profiles!manager_comments_author_id_fkey (full_name)
          )
        )
      )
    `)
    .eq('manager_id', user.id)
    .eq('is_active', true)
    .in('goal_sheets.status', ['approved', 'locked'])
    .eq('goal_sheets.financial_year', year)

  return (
    <div className="flex min-h-screen">
      <Sidebar profile={profile} />
      <main className="flex-1 lg:ml-60 pt-14 lg:pt-0">
        <CheckInsContent managerId={user.id} team={team ?? []} year={year} />
      </main>
    </div>
  )
}

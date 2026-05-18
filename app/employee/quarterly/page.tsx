import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { QuarterlyPage } from '@/components/goals/QuarterlyPage'
import { getCurrentFinancialYear } from '@/lib/utils'

export default async function QuarterlyUpdatesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/auth/login')

  const year = getCurrentFinancialYear()

  const { data: sheet } = await supabase
    .from('goal_sheets')
    .select(`*, goals(*, quarterly_updates(*))`)
    .eq('employee_id', user.id)
    .eq('financial_year', year)
    .single()

  return (
    <div className="flex min-h-screen">
      <Sidebar profile={profile} />
      <main className="flex-1 lg:ml-60 pt-14 lg:pt-0">
        <QuarterlyPage profile={profile} sheet={sheet} year={year} />
      </main>
    </div>
  )
}

import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { SheetReviewContent } from '@/components/manager/SheetReviewContent'

export default async function SheetReviewPage({ params }: { params: Promise<{ sheetId: string }> }) {
  const { sheetId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile || !['manager', 'admin'].includes(profile.role)) redirect('/employee/dashboard')

  const { data: sheet, error } = await supabase
    .from('goal_sheets')
    .select(`
      *,
      employee:profiles!goal_sheets_employee_id_fkey (
        id, full_name, email, department, designation
      ),
      goals (
        *, quarterly_updates (*)
      ),
      manager_comments (
        *, author:profiles!manager_comments_author_id_fkey (full_name, role)
      )
    `)
    .eq('id', sheetId)
    .single()

  // If RLS blocked it or not found, show not found
  if (!sheet || error) notFound()

  // Extra safety: verify manager owns this employee (skip for admin)
  if (profile.role === 'manager') {
    const emp = sheet.employee as { id: string } | null
    if (emp) {
      const { data: empProfile } = await supabase
        .from('profiles')
        .select('manager_id')
        .eq('id', emp.id)
        .single()

      if (empProfile?.manager_id !== user.id) {
        redirect('/manager/dashboard')
      }
    }
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar profile={profile} />
      <main className="flex-1 lg:ml-60 pt-14 lg:pt-0">
        <SheetReviewContent sheet={sheet} reviewer={profile} />
      </main>
    </div>
  )
}

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role ?? 'employee'
  const map: Record<string, string> = {
    employee: '/employee/dashboard',
    manager: '/manager/dashboard',
    admin: '/admin/dashboard',
  }

  redirect(map[role] ?? '/employee/dashboard')
}

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { AuditLogsContent } from '@/components/admin/AuditLogsContent'

export default async function AuditLogsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile || profile.role !== 'admin') redirect('/employee/dashboard')

  const { data: logs } = await supabase
    .from('audit_logs')
    .select(`*, actor:profiles!audit_logs_actor_id_fkey (full_name, email)`)
    .order('created_at', { ascending: false })
    .limit(100)

  return (
    <div className="flex min-h-screen">
      <Sidebar profile={profile} />
      <main className="flex-1 lg:ml-60 pt-14 lg:pt-0">
        <AuditLogsContent logs={logs ?? []} />
      </main>
    </div>
  )
}

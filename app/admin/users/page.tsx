import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { UsersContent } from '@/components/admin/UsersContent'

export default async function UsersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile || profile.role !== 'admin') redirect('/employee/dashboard')

  // FIX: the self-join hint `profiles!profiles_manager_id_fkey` causes PostgREST to
  // error on some Supabase versions because it can't resolve a self-referential embed
  // using an FK hint in all cases. Use a two-step query instead: fetch all profiles,
  // then resolve manager names in a second pass using the already-loaded data.

  // Step 1: fetch all profiles without the self-join
  const { data: allProfiles } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, department, designation, is_active, manager_id, created_at, updated_at')
    .order('full_name')

  const profileList = allProfiles ?? []

  // Step 2: build a lookup map and attach manager name inline
  const profileMap = new Map(profileList.map((p: any) => [p.id, p]))
  const users = profileList.map((p: any) => ({
    ...p,
    manager: p.manager_id ? (profileMap.get(p.manager_id) ?? null) : null,
  }))

  const managers = users.filter((u: any) => ['manager', 'admin'].includes(u.role))

  return (
    <div className="flex min-h-screen">
      <Sidebar profile={profile} />
      <main className="flex-1 lg:ml-60 pt-14 lg:pt-0">
        <UsersContent users={users} managers={managers} />
      </main>
    </div>
  )
}

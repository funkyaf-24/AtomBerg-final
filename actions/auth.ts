'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function login(email: string, password: string) {
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { success: false as const, error: 'Invalid email or password' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', (await supabase.auth.getUser()).data.user!.id)
    .single()

  const roleMap: Record<string, string> = {
    employee: '/employee/dashboard',
    manager: '/manager/dashboard',
    admin: '/admin/dashboard',
  }

  return {
    success: true as const,
    redirectTo: roleMap[profile?.role ?? 'employee'] ?? '/employee/dashboard',
  }
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/auth/login')
}

'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function login(email: string, password: string) {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  })

  if (error) {
    // Distinguish common error cases so the UI can show a helpful message.
    // Supabase error codes: https://supabase.com/docs/reference/javascript/auth-error-codes
    const msg = error.message ?? ''

    if (
      msg.toLowerCase().includes('email not confirmed') ||
      msg.toLowerCase().includes('not confirmed')
    ) {
      return {
        success: false as const,
        error:
          'Your email address has not been confirmed. Please check your inbox ' +
          'or ask an admin to confirm your account in the Supabase dashboard.',
      }
    }

    // Log the real error server-side for debugging without leaking details to the client
    console.error('[login] Supabase auth error:', error.message, '| status:', error.status)

    return {
      success: false as const,
      error: 'Invalid email or password. Please try again.',
    }
  }

  // Auth succeeded — look up role
  const userId = data.user?.id
  if (!userId) {
    return { success: false as const, error: 'Login failed. Please try again.' }
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()

  if (profileError) {
    console.error('[login] Profile lookup error:', profileError.message)
    // Auth is fine, fall back to employee dashboard
  }

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

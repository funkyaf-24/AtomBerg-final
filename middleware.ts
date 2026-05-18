import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Step 1: write to request so subsequent server reads see them
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          // Step 2: rebuild the response with the updated request
          supabaseResponse = NextResponse.next({ request })
          // Step 3: write to the response so the browser stores the cookies
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: calling getUser() here refreshes the session token and
  // re-sets the auth cookies on every request — DO NOT remove this.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname

  // ── Public paths ────────────────────────────────────────────────────────────
  const publicPaths = ['/auth/login', '/auth/signup']
  if (publicPaths.includes(path)) {
    if (user) {
      // Already logged in — send to dashboard (role redirect happens there)
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return supabaseResponse
  }

  // ── Not authenticated ────────────────────────────────────────────────────────
  if (!user) {
    const loginUrl = new URL('/auth/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  // ── Role-based path protection ───────────────────────────────────────────────
  // Use service-role or anon — RLS "Admin views all" policy covers admins,
  // but for middleware we only need the user's own profile row which is always
  // accessible via "Users can view own profile".
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role ?? 'employee'

  if (path.startsWith('/admin') && role !== 'admin') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  if (path.startsWith('/manager') && !['manager', 'admin'].includes(role)) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // ── Root / generic dashboard → role-specific dashboard ──────────────────────
  if (path === '/dashboard' || path === '/') {
    const dashboardMap: Record<string, string> = {
      employee: '/employee/dashboard',
      manager: '/manager/dashboard',
      admin: '/admin/dashboard',
    }
    return NextResponse.redirect(
      new URL(dashboardMap[role] ?? '/employee/dashboard', request.url)
    )
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     *  - _next/static  (static assets)
     *  - _next/image   (image optimisation)
     *  - favicon.ico
     *  - public image files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

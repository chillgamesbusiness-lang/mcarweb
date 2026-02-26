import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Auth guard middleware — runs at the edge before every matched request.
 *
 * Rules:
 *  - Unauthenticated users trying to reach /admin or /inspector → /login
 *  - Authenticated users on /login → their home panel (role resolved in layout)
 *  - Everything else passes through; role-level checks are in the layouts.
 *
 * We also refresh the session cookie here so it never silently expires
 * mid-session (Supabase SSR requirement).
 */
export async function middleware(request: NextRequest) {
  // Build a mutable response so we can forward refreshed cookies
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Forward cookies onto the request AND the response
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: use getUser() not getSession() — getSession() trusts the cookie
  // without re-validating with Supabase Auth; getUser() does a server round-trip.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  const isAdminRoute     = pathname.startsWith('/admin')
  const isInspectorRoute = pathname.startsWith('/inspector')
  const isLoginPage      = pathname === '/login'

  // ── Protected routes: must be authenticated ─────────────────────────────
  if ((isAdminRoute || isInspectorRoute) && !user) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // ── Already logged in: skip the login page ───────────────────────────────
  // Role-based redirect (admin vs inspector) is handled in the login action
  // and in the individual layouts — middleware just gets them out of /login.
  if (isLoginPage && user) {
    const homeUrl = request.nextUrl.clone()
    homeUrl.pathname = '/admin'
    homeUrl.search = ''
    return NextResponse.redirect(homeUrl)
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match /admin, /inspector, and /login — but skip static assets and
     * Next.js internals so they're never blocked.
     */
    '/admin/:path*',
    '/inspector/:path*',
    '/login',
  ],
}

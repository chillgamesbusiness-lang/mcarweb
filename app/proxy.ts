import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  // Guard: if Supabase env vars are missing, pass through without crashing
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session — must happen before any other logic
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // ── Unauthenticated: bounce to /login ───────────────────────────────────────
  if (!user && (pathname.startsWith('/admin') || pathname.startsWith('/inspector'))) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // ── Authenticated: enforce role-based access ─────────────────────────────────
  if (user && (pathname === '/login' || pathname.startsWith('/admin') || pathname.startsWith('/inspector'))) {
    // Look up role — use service role key if available (bypasses RLS), else anon client
    let role: string | undefined
    try {
      const client = process.env.SUPABASE_SERVICE_ROLE_KEY
        ? createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY,
            { cookies: { getAll: () => [], setAll: () => {} } }
          )
        : supabase

      const { data: profile } = await client
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

      role = profile?.role as string | undefined
    } catch {
      // If role lookup fails, let request through — layout guards will handle it
      return supabaseResponse
    }

    // Redirect away from /login if already authenticated with a valid role
    if (pathname === '/login' && (role === 'admin' || role === 'inspector')) {
      const from = request.nextUrl.searchParams.get('from')
      const dest = request.nextUrl.clone()
      if (from && from.startsWith('/admin') && role === 'admin') {
        dest.pathname = from
      } else if (from && from.startsWith('/inspector') && role === 'inspector') {
        dest.pathname = from
      } else {
        dest.pathname = role === 'admin' ? '/admin' : '/inspector'
      }
      dest.search = ''
      return NextResponse.redirect(dest)
    }

    // Admin-only routes — redirect non-admins
    if (pathname.startsWith('/admin') && role === 'inspector') {
      const dest = request.nextUrl.clone()
      dest.pathname = '/inspector'
      return NextResponse.redirect(dest)
    }

    // Inspector-only routes — redirect non-inspectors
    if (pathname.startsWith('/inspector') && role === 'admin') {
      const dest = request.nextUrl.clone()
      dest.pathname = '/admin'
      return NextResponse.redirect(dest)
    }

    // Unknown role on protected routes → let layout guards handle it
    // (no sign-out here — avoids aggressive sign-out on transient DB failures)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimisation)
     * - favicon.ico
     * - Public API routes
     * - Offer funnel pages (public, no auth required)
     */
    '/((?!_next/static|_next/image|favicon.ico|api/lookup|api/leads|api/appointments|api/upload-photos|api/vehicle|offer).*)',
  ],
}

/**
 * Supabase SSR session refresh middleware.
 *
 * Required for Supabase Auth to work correctly in Next.js App Router:
 *   - Refreshes the auth session token on every matched request so it
 *     doesn't silently expire between page loads.
 *   - Sets the refreshed cookie on the response so server components and
 *     layouts receive a valid session on the very next request (critical
 *     after a Server Action redirect, e.g. the login flow).
 *   - Redirects unauthenticated requests away from protected routes.
 *
 * NOTE: Uses the Supabase client directly (not the app helpers) to avoid
 * running assertProductionEnv on every middleware invocation.
 */

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
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
          // Write cookies back on both the request (for downstream server
          // components in this render) and the response (for the browser).
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // getUser() validates the session server-side and refreshes the token if
  // it is close to expiry, writing the new tokens via setAll above.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Redirect unauthenticated requests to /login
  if (
    !user &&
    (pathname.startsWith('/admin') || pathname.startsWith('/inspector'))
  ) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('error', 'session_expired')
    return NextResponse.redirect(loginUrl)
  }

  return response
}

export const config = {
  matcher: ['/admin/:path*', '/inspector/:path*'],
}

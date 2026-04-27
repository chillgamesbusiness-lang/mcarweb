import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { assertProductionEnv } from '@/lib/env'

/**
 * Server-side Supabase client using the anon key.
 * Reads the user's session cookie — use for data access in Server Components and Route Handlers.
 */
export async function createClient() {
  assertProductionEnv('supabase-anon-client')
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) throw new Error('Supabase URL or anon key not configured')

  const cookieStore = await cookies()

  return createServerClient(
    url,
    anonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // setAll called from a Server Component — session refresh handled by middleware
          }
        },
      },
    }
  )
}

/**
 * Server-side Supabase client using the service role key.
 * Bypasses RLS — only use in trusted server contexts (API routes, server actions writing audit log, etc.).
 * NEVER expose service role key to the client.
 */
export function createServiceClient() {
  assertProductionEnv('supabase-service-client')
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) throw new Error('Supabase URL or service role key not configured')

  return createServerClient(
    url,
    serviceKey,
    {
      cookies: {
        getAll: () => [],
        setAll: () => {},
      },
    }
  )
}

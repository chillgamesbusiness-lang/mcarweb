'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { checkOtpRateLimit } from '@/lib/rateLimit'

export async function login(formData: FormData) {
  try {
    // ── Brute-force / credential-stuffing guard ───────────────────────────
    const headersList = await headers()
    const ip =
      headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      headersList.get('x-real-ip') ||
      'unknown'

    // Fail-open: a Redis outage must not block all staff logins.
    // The auth check below is the real security gate.
    let rateLimitAllowed = true
    try {
      const rl = await checkOtpRateLimit(`login:${ip}`, 10, 300)
      rateLimitAllowed = rl.allowed
    } catch (rlErr) {
      console.error('[login] Rate-limit check failed (fail-open):', rlErr)
    }

    if (!rateLimitAllowed) {
      redirect('/login?error=too_many_attempts')
    }

    const supabase = await createClient()

    const email = formData.get('email') as string
    const password = formData.get('password') as string

    const { data: signInData, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error || !signInData.user) {
      redirect('/login?error=invalid_credentials')
    }

    // Use service client for role lookup — bypasses RLS circular policy on users table
    const svc = createServiceClient()
    const { data: profile } = await svc
      .from('users')
      .select('role')
      .eq('id', signInData.user.id)
      .single()

    revalidatePath('/', 'layout')
    redirect(profile?.role === 'admin' ? '/admin' : '/inspector')
  } catch (err) {
    // Re-throw Next.js internal redirect/notFound — these must not be swallowed
    if (
      typeof err === 'object' &&
      err !== null &&
      'digest' in err &&
      typeof (err as { digest: unknown }).digest === 'string' &&
      (err as { digest: string }).digest.startsWith('NEXT_REDIRECT')
    ) {
      throw err
    }
    console.error('[login] Unexpected error:', err)
    redirect('/login?error=server_error')
  }
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}

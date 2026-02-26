'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { checkOtpRateLimit } from '@/lib/rateLimit'

export async function login(formData: FormData) {
  // ── Brute-force / credential-stuffing guard ───────────────────────────
  const headersList = await headers()
  const ip =
    headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headersList.get('x-real-ip') ||
    'unknown'

  const rl = await checkOtpRateLimit(`login:${ip}`, 10, 300) // 10 attempts per 5 min
  if (!rl.allowed) {
    redirect('/login?error=too_many_attempts')
  }

  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    redirect('/login?error=invalid_credentials')
  }

  // Fetch role to direct the user to the right panel
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login?error=no_user')

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  revalidatePath('/', 'layout')
  redirect(profile?.role === 'admin' ? '/admin' : '/inspector')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}

/**
 * Dev user seeder — creates one admin and one inspector account for local development.
 *
 * Usage:
 *   npx tsx scripts/seed-dev-users.ts
 *
 * Defaults:
 *   admin@mcar.dev / mcaradmin2026!
 *   inspector@mcar.dev / mcarinspect2026!
 *
 * Optional overrides:
 *   DEV_ADMIN_EMAIL, DEV_ADMIN_PASSWORD
 *   DEV_INSPECTOR_EMAIL, DEV_INSPECTOR_PASSWORD
 *
 * Requires .env.local (or environment) to have:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Safe to re-run — existing users are skipped, not duplicated.
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

interface DevUser {
  email: string
  password: string
  name: string
  role: 'admin' | 'inspector'
}

const DEV_USERS: DevUser[] = [
  {
    email: process.env.DEV_ADMIN_EMAIL ?? 'admin@mcar.dev',
    password: process.env.DEV_ADMIN_PASSWORD ?? 'mcaradmin2026!',
    name: 'Dev Admin',
    role: 'admin',
  },
  {
    email: process.env.DEV_INSPECTOR_EMAIL ?? 'inspector@mcar.dev',
    password: process.env.DEV_INSPECTOR_PASSWORD ?? 'mcarinspect2026!',
    name: 'Dev Inspector',
    role: 'inspector',
  },
]

async function findAuthUserByEmail(email: string) {
  const targetEmail = email.toLowerCase()
  let page = 1

  while (true) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw error

    const existing = data.users.find((user) => user.email?.toLowerCase() === targetEmail)
    if (existing) return existing
    if (data.users.length < 1000) return null

    page += 1
  }
}

async function seedUser(user: DevUser) {
  if (user.password.length < 6) {
    throw new Error(`Password for ${user.email} must be at least 6 characters`)
  }

  // 1. Create or repair the auth user.
  const existingAuthUser = await findAuthUserByEmail(user.email)
  let userId = existingAuthUser?.id

  if (userId) {
    const { error: updateErr } = await sb.auth.admin.updateUserById(userId, {
      password: user.password,
      email_confirm: true,
      user_metadata: { name: user.name },
      ban_duration: 'none',
    })
    if (updateErr) throw updateErr
    console.log(`  ✅ Auth user updated/reactivated: ${user.email} (${userId})`)
  } else {
    const { data: created, error: createErr } = await sb.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: { name: user.name },
    })

    if (createErr) throw createErr
    if (!created.user) throw new Error(`Auth user was not returned for ${user.email}`)

    userId = created.user.id
    console.log(`  ✅ Auth user created: ${user.email} (${userId})`)
  }

  // Guard against old deactivated profile rows with the same email but a deleted auth user.
  const { data: existingProfile, error: profileLookupErr } = await sb
    .from('users')
    .select('id')
    .eq('email', user.email)
    .maybeSingle()

  if (profileLookupErr) throw profileLookupErr
  if (existingProfile?.id && existingProfile.id !== userId) {
    throw new Error(
      `public.users already has ${user.email} attached to a different auth id. ` +
      'Use a different DEV_*_EMAIL value or reconcile that profile manually.'
    )
  }

  // 2. Upsert the public.users row
  const { error: upsertErr } = await sb
    .from('users')
    .upsert(
      {
        id: userId,
        name: user.name,
        email: user.email,
        role: user.role,
        is_active: true,
      },
      { onConflict: 'id' }
    )

  if (upsertErr) throw upsertErr
  console.log(`  ✅ public.users row upserted: ${user.email} → role=${user.role}`)
}

async function main() {
  console.log('\n🌱 Seeding dev users...\n')

  for (const user of DEV_USERS) {
    console.log(`[${user.role.toUpperCase()}] ${user.email}`)
    try {
      await seedUser(user)
    } catch (err) {
      console.error(`  ❌ Failed for ${user.email}:`, err)
      process.exit(1)
    }
  }

  console.log('\n✅ Done.\n')
  console.log('Credentials:')
  for (const u of DEV_USERS) {
    console.log(`  ${u.role.padEnd(10)} ${u.email}  /  ${u.password}`)
  }
}

main()

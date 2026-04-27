/**
 * Dev user seeder — creates one admin and one inspector account for local development.
 *
 * Usage:
 *   npx tsx scripts/seed-dev-users.ts
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
    email: 'admin@dev.local',
    password: 'devAdmin123!',
    name: 'Dev Admin',
    role: 'admin',
  },
  {
    email: 'inspector@dev.local',
    password: 'devInspector123!',
    name: 'Dev Inspector',
    role: 'inspector',
  },
]

async function seedUser(user: DevUser) {
  // 1. Create (or retrieve) the auth user
  const { data: created, error: createErr } =
    await sb.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: { name: user.name },
    })

  let userId: string

  if (createErr) {
    if (createErr.message.includes('already been registered')) {
      // User exists — look up their id
      const { data: list, error: listErr } = await sb.auth.admin.listUsers()
      if (listErr) throw listErr
      const existing = list.users.find((u) => u.email === user.email)
      if (!existing) throw new Error(`Cannot find existing user: ${user.email}`)
      userId = existing.id
      console.log(`  ⚠️  Auth user already exists — skipping create (${user.email})`)
    } else {
      throw createErr
    }
  } else {
    userId = created.user.id
    console.log(`  ✅ Auth user created: ${user.email} (${userId})`)
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

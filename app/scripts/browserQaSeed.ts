import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const command = process.argv[2] ?? 'create'

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

function passwordFor(seed: string) {
  return `MCar-${seed}-BrowserQA!`
}

async function deauthorizeStaffUser(userId: string) {
  await supabase.from('users').update({ is_active: false }).eq('id', userId)
  const deleteResult = await supabase.auth.admin.deleteUser(userId)
  if (deleteResult.error) {
    await supabase.auth.admin.updateUserById(userId, {
      password: `Disabled-${randomUUID()}-Staff!`,
      ban_duration: '876000h',
    })
  }
}

async function createStaffUser(email: string, password: string, role: 'admin' | 'inspector') {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: `Browser QA ${role}` },
  })

  if (error || !data.user) throw new Error(error?.message ?? `Failed to create ${role}`)

  const { error: profileError } = await supabase.from('users').upsert({
    id: data.user.id,
    name: `Browser QA ${role}`,
    email,
    role,
    is_active: true,
  }, { onConflict: 'id' })

  if (profileError) throw new Error(profileError.message)
  return data.user.id
}

async function cleanup() {
  const { data: leads } = await supabase
    .from('leads')
    .select('id, pending_photo_urls')
    .eq('source', 'browser_qa')

  const leadIds = (leads ?? []).map((lead) => lead.id as string)
  if (leadIds.length > 0) {
    const photoPaths = new Set<string>()
    for (const lead of leads ?? []) {
      for (const path of (lead.pending_photo_urls as string[] | null) ?? []) photoPaths.add(path)
    }

    const { data: inspections } = await supabase
      .from('inspections')
      .select('photo_urls')
      .in('lead_id', leadIds)

    for (const inspection of inspections ?? []) {
      for (const path of (inspection.photo_urls as string[] | null) ?? []) photoPaths.add(path)
    }

    if (photoPaths.size > 0) {
      await supabase.storage.from('inspection-photos').remove([...photoPaths])
    }

    await supabase.from('appointments').delete().in('lead_id', leadIds)
    await supabase.from('inspections').delete().in('lead_id', leadIds)
    await supabase.from('audit_log').delete().in('lead_id', leadIds)
    await supabase.from('leads').delete().in('id', leadIds)
  }

  const { data: users } = await supabase
    .from('users')
    .select('id, email')
    .or('email.like.browser-qa-admin-%@example.invalid,email.like.browser-qa-inspector-%@example.invalid')

  for (const user of users ?? []) {
    await deauthorizeStaffUser(user.id as string)
  }

  console.log(JSON.stringify({ cleanedLeadCount: leadIds.length, deauthorizedUserCount: users?.length ?? 0 }))
}

async function create() {
  const seed = Date.now().toString()
  const shortSeed = seed.slice(-6)
  const adminEmail = `browser-qa-admin-${seed}@example.invalid`
  const inspectorEmail = `browser-qa-inspector-${seed}@example.invalid`
  const adminPassword = passwordFor(`Admin-${shortSeed}`)
  const inspectorPassword = passwordFor(`Inspector-${shortSeed}`)

  const adminUserId = await createStaffUser(adminEmail, adminPassword, 'admin')
  const inspectorUserId = await createStaffUser(inspectorEmail, inspectorPassword, 'inspector')

  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .insert({
      seller_name: `Browser QA Seller ${shortSeed}`,
      seller_phone: `07123${shortSeed}`,
      seller_email: `browser-qa-${seed}@example.invalid`,
      seller_postcode: 'SW1A 1AA',
      reg: `QA${shortSeed.slice(-5)}`,
      make: 'FORD',
      model: 'FOCUS',
      year: 2020,
      fuel: 'petrol',
      transmission: 'manual',
      colour: 'Blue',
      mileage: 42000,
      condition: 'good',
      estimated_min: 4000,
      estimated_max: 5000,
      status: 'appointment_booked',
      finance_status: 'not_checked',
      assigned_inspector_id: inspectorUserId,
      source: 'browser_qa',
      consent_marketing: false,
      consent_data_processing: true,
    })
    .select('id')
    .single()

  if (leadError || !lead) throw new Error(leadError?.message ?? 'Failed to create lead')

  const startAt = new Date(Date.now() + 48 * 60 * 60 * 1000)
  const endAt = new Date(startAt.getTime() + 45 * 60 * 1000)
  const { data: appointment, error: appointmentError } = await supabase
    .from('appointments')
    .insert({
      lead_id: lead.id,
      type: 'in_person',
      start_at: startAt.toISOString(),
      end_at: endAt.toISOString(),
      status: 'booked',
      location_or_link: 'Browser QA appointment',
      booking_submit_id: `browser-qa-${randomUUID()}`,
    })
    .select('id')
    .single()

  if (appointmentError || !appointment) {
    throw new Error(appointmentError?.message ?? 'Failed to create appointment')
  }

  console.log(JSON.stringify({
    seed,
    adminEmail,
    adminPassword,
    adminUserId,
    inspectorEmail,
    inspectorPassword,
    inspectorUserId,
    leadId: lead.id,
    appointmentId: appointment.id,
  }))
}

async function main() {
  if (command === 'cleanup') {
    await cleanup()
    return
  }
  if (command !== 'create') throw new Error(`Unknown command: ${command}`)
  await create()
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
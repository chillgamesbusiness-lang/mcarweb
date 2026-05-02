import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function main() {
  const { data: leads, error: leadsError } = await supabase
    .from('leads')
    .select('id, pending_photo_urls')
    .in('source', ['browser_qa', 'admin_audit_script'])

  if (leadsError) throw new Error(leadsError.message)

  const leadIds = (leads ?? []).map((lead) => lead.id as string)
  const photoPaths = new Set<string>()

  for (const lead of leads ?? []) {
    for (const path of (lead.pending_photo_urls as string[] | null) ?? []) photoPaths.add(path)
  }

  if (leadIds.length > 0) {
    const { data: inspections, error: inspectionsError } = await supabase
      .from('inspections')
      .select('photo_urls')
      .in('lead_id', leadIds)

    if (inspectionsError) throw new Error(inspectionsError.message)

    for (const inspection of inspections ?? []) {
      for (const path of (inspection.photo_urls as string[] | null) ?? []) photoPaths.add(path)
    }

    if (photoPaths.size > 0) {
      const { error: storageError } = await supabase.storage.from('inspection-photos').remove([...photoPaths])
      if (storageError) console.warn(`Storage cleanup warning: ${storageError.message}`)
    }

    await supabase.from('appointments').delete().in('lead_id', leadIds)
    await supabase.from('inspections').delete().in('lead_id', leadIds)
    await supabase.from('audit_log').delete().in('lead_id', leadIds)
    await supabase.from('notes').delete().in('lead_id', leadIds)
    await supabase.from('leads').delete().in('id', leadIds)
  }

  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, email')
    .or('email.like.browser-qa-admin-%@example.invalid,email.like.browser-qa-inspector-%@example.invalid,email.like.audit-admin-%@example.invalid,email.like.audit-inspector-%@example.invalid,email.eq.admin@dev.local,email.eq.inspector@dev.local')

  if (usersError) throw new Error(usersError.message)

  for (const user of users ?? []) {
    await supabase.from('users').update({ is_active: false }).eq('id', user.id)
    const deleteResult = await supabase.auth.admin.deleteUser(user.id as string)
    if (deleteResult.error) {
      await supabase.auth.admin.updateUserById(user.id as string, {
        password: `Disabled-${randomUUID()}-Staff!`,
        ban_duration: '876000h',
      })
    }
  }

  console.log(JSON.stringify({
    cleanedLeadCount: leadIds.length,
    deauthorizedUserCount: users?.length ?? 0,
    cleanedPhotoCount: photoPaths.size,
  }))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import {
  bulkAssignInspector,
  bulkDeleteLeads,
  bulkUpdateAppointmentStatus,
  bulkUpdateLeadFinanceStatus,
  bulkUpdateLeadStatus,
} from '../lib/adminDbMutations'
import { writeAuditLog } from '../lib/auditLog'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

let failed = 0

function assert(name: string, ok: boolean, detail = '') {
  if (ok) {
    console.log(`PASS ${name}`)
  } else {
    failed += 1
    console.error(`FAIL ${name}${detail ? ` - ${detail}` : ''}`)
  }
}

async function createAuthUser(email: string, role: 'admin' | 'inspector') {
  const { data, error } = await sb.auth.admin.createUser({
    email,
    password: `MCar-${randomUUID()}-Test!`,
    email_confirm: true,
    user_metadata: { name: `Audit ${role}` },
  })

  if (error || !data.user) throw new Error(error?.message ?? `Failed to create ${role} auth user`)

  const { error: profileError } = await sb.from('users').upsert({
    id: data.user.id,
    name: `Audit ${role}`,
    email,
    role,
    is_active: true,
  }, { onConflict: 'id' })

  if (profileError) throw new Error(profileError.message)
  return data.user.id
}

async function deauthorizeAuthUser(userId: string) {
  await sb.from('users').update({ is_active: false }).eq('id', userId)
  const deleteResult = await sb.auth.admin.deleteUser(userId)
  if (deleteResult.error) {
    await sb.auth.admin.updateUserById(userId, {
      password: `Disabled-${randomUUID()}-Staff!`,
      ban_duration: '876000h',
    })
  }
}

async function checkRequiredColumn(table: string, column: string) {
  const { error } = await sb.from(table).select(column).limit(1)
  assert(`schema has ${table}.${column}`, !error, error?.message)
  return !error
}

async function checkLeadStatusValue(status: string) {
  const { error } = await sb.from('leads').select('id').eq('status', status).limit(1)
  assert(`schema accepts leads.status=${status}`, !error, error?.message)
  return !error
}

async function createLead(seed: string) {
  const { data, error } = await sb
    .from('leads')
    .insert({
      seller_name: `Audit Seller ${seed}`,
      seller_phone: `07123${seed.padStart(6, '0').slice(0, 6)}`,
      seller_email: `audit-${seed}@example.invalid`,
      seller_postcode: 'SW1A 1AA',
      reg: `AUD${seed.slice(-4).toUpperCase()}`,
      make: 'FORD',
      model: 'FOCUS',
      year: 2020,
      fuel: 'petrol',
      transmission: 'manual',
      mileage: 42000,
      condition: 'good',
      estimated_min: 4000,
      estimated_max: 5000,
      status: 'new',
      finance_status: 'not_checked',
      source: 'admin_audit_script',
      consent_marketing: false,
      consent_data_processing: true,
    })
    .select('id')
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Failed to create lead')
  return data.id as string
}

async function createAppointment(leadId: string) {
  const startAt = new Date(Date.now() + 48 * 60 * 60 * 1000)
  const endAt = new Date(startAt.getTime() + 45 * 60 * 1000)
  const { data, error } = await sb
    .from('appointments')
    .insert({
      lead_id: leadId,
      type: 'in_person',
      start_at: startAt.toISOString(),
      end_at: endAt.toISOString(),
      status: 'booked',
      location_or_link: 'Audit script',
      booking_submit_id: `audit-${randomUUID()}`,
    })
    .select('id')
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Failed to create appointment')
  return data.id as string
}

async function submitInspectionEquivalent(leadId: string, inspectorUserId: string) {
  const pendingPhotos = [
    `inspections/${leadId}/front.jpg`,
    `inspections/${leadId}/interior.jpg`,
  ]
  const checklistJson = {
    Bodywork_Paintwork: 'good',
    'Bodywork_Panel gaps': 'good',
    'Bodywork_Dents / scratches': 'ok',
    Bodywork_Windscreen: 'good',
    'Interior_Seats / upholstery': 'good',
    'Interior_Dashboard / trim': 'good',
    Interior_Electronics: 'good',
    Interior_Boot: 'ok',
    Mechanical_Engine: 'good',
    Mechanical_Gearbox: 'good',
    Mechanical_Brakes: 'ok',
    Mechanical_Suspension: 'good',
    'Tyres_Front left': 'good',
    'Tyres_Front right': 'good',
    'Tyres_Rear left': 'ok',
    'Tyres_Rear right': 'ok',
  }

  const { data: beforeLead, error: beforeError } = await sb
    .from('leads')
    .update({ pending_photo_urls: pendingPhotos })
    .eq('id', leadId)
    .select('status')
    .single()
  if (beforeError || !beforeLead) throw new Error(beforeError?.message ?? 'Failed to prepare inspection lead')

  const { data: inspection, error: inspectionError } = await sb
    .from('inspections')
    .insert({
      lead_id: leadId,
      inspector_id: inspectorUserId,
      checklist_json: checklistJson,
      photo_urls: pendingPhotos,
      recommended_offer: 4550,
      notes: 'Verifier inspection notes',
      submitted_at: new Date().toISOString(),
    })
    .select('id')
    .single()
  if (inspectionError || !inspection) throw new Error(inspectionError?.message ?? 'Failed to create inspection')

  const { error: leadUpdateError } = await sb
    .from('leads')
    .update({ status: 'inspected', pending_photo_urls: [] })
    .eq('id', leadId)
  if (leadUpdateError) throw new Error(leadUpdateError.message)

  await writeAuditLog(sb, {
    leadId,
    action: 'inspection_submitted',
    actorUserId: inspectorUserId,
    actorKind: 'inspector',
    newValue: { recommended_offer: 4550, photo_count: pendingPhotos.length },
  }, { area: 'inspection', blocking: true })

  await writeAuditLog(sb, {
    leadId,
    action: 'status_change',
    actorUserId: inspectorUserId,
    actorKind: 'inspector',
    oldValue: { status: beforeLead.status },
    newValue: { status: 'inspected' },
  }, { area: 'inspection', blocking: true })

  return { id: inspection.id as string, photoUrls: pendingPhotos, recommendedOffer: 4550 }
}

async function main() {
  const schemaOk = [
    await checkRequiredColumn('audit_log', 'actor_kind'),
    await checkRequiredColumn('appointments', 'booking_submit_id'),
    await checkRequiredColumn('leads', 'pending_photo_urls'),
    await checkRequiredColumn('inspections', 'photo_urls'),
    await checkRequiredColumn('inspections', 'recommended_offer'),
    await checkLeadStatusValue('verified'),
    await checkLeadStatusValue('offer_made'),
    await checkLeadStatusValue('expired'),
    await checkLeadStatusValue('no_response'),
  ].every(Boolean)

  if (!schemaOk) {
    console.error('Schema prerequisites failed. Apply sql-migration/patch_admin_inspector_stability.sql, then rerun this verifier.')
    process.exit(1)
  }

  const suffix = Date.now().toString()
  const createdLeadIds: string[] = []
  let adminUserId: string | null = null
  let inspectorUserId: string | null = null

  try {
    adminUserId = await createAuthUser(`audit-admin-${suffix}@example.invalid`, 'admin')
    inspectorUserId = await createAuthUser(`audit-inspector-${suffix}@example.invalid`, 'inspector')
    const actor = { userId: adminUserId }

    const leadId = await createLead(suffix.slice(-6))
    createdLeadIds.push(leadId)

    const assignResult = await bulkAssignInspector(sb, actor, [leadId], inspectorUserId)
    assert('forward lead to inspector succeeds', assignResult.success && assignResult.affectedCount === 1, assignResult.message)

    const { data: assignedLead } = await sb
      .from('leads')
      .select('assigned_inspector_id')
      .eq('id', leadId)
      .single()
    assert('database stores assigned inspector', assignedLead?.assigned_inspector_id === inspectorUserId)

    const { data: inspectorQueue } = await sb
      .from('leads')
      .select('id')
      .eq('assigned_inspector_id', inspectorUserId)
      .eq('id', leadId)
      .maybeSingle()
    assert('assigned lead is query-visible for inspector queue', inspectorQueue?.id === leadId)

    const invalidAssign = await bulkAssignInspector(sb, actor, [leadId], randomUUID())
    assert('forwarding rejects non-existent inspector', !invalidAssign.success && invalidAssign.failures[0]?.code === 'inspector_not_found')

    const statusResult = await bulkUpdateLeadStatus(sb, actor, [leadId], 'appointment_booked')
    assert('bulk lead status update succeeds', statusResult.success && statusResult.affectedCount === 1, statusResult.message)

    const financeResult = await bulkUpdateLeadFinanceStatus(sb, actor, [leadId], 'clear')
    assert('bulk finance update succeeds', financeResult.success && financeResult.affectedCount === 1, financeResult.message)

    const appointmentId = await createAppointment(leadId)
    const appointmentResult = await bulkUpdateAppointmentStatus(sb, actor, [appointmentId], 'cancelled')
    assert('bulk appointment status update succeeds', appointmentResult.success && appointmentResult.affectedCount === 1, appointmentResult.message)

    const { data: leadAfterCancel } = await sb.from('leads').select('status').eq('id', leadId).single()
    assert('cancelled booked appointment moves lead back to contacted', leadAfterCancel?.status === 'contacted', String(leadAfterCancel?.status))

    const inspection = await submitInspectionEquivalent(leadId, inspectorUserId)
    const { data: adminInspection } = await sb
      .from('inspections')
      .select('lead_id, inspector_id, recommended_offer, photo_urls, notes, submitted_at')
      .eq('id', inspection.id)
      .single()
    assert('inspector recommendation is stored for admin review', adminInspection?.recommended_offer === inspection.recommendedOffer)
    assert('inspector photos are stored for admin review', (adminInspection?.photo_urls ?? []).length === inspection.photoUrls.length)
    assert('inspection is linked to assigned inspector and lead', adminInspection?.lead_id === leadId && adminInspection?.inspector_id === inspectorUserId)

    const { data: inspectedLead } = await sb
      .from('leads')
      .select('status, pending_photo_urls')
      .eq('id', leadId)
      .single()
    assert('inspection submission marks lead inspected and clears pending photos', inspectedLead?.status === 'inspected' && (inspectedLead.pending_photo_urls ?? []).length === 0)

    const { data: inspectionAuditRows } = await sb
      .from('audit_log')
      .select('id, action')
      .eq('lead_id', leadId)
      .in('action', ['inspection_submitted', 'status_change'])
    assert('inspection handoff is audit logged', (inspectionAuditRows ?? []).some((row) => row.action === 'inspection_submitted'))

    const deleteLeadA = await createLead(`${suffix.slice(-5)}a`)
    const deleteLeadB = await createLead(`${suffix.slice(-5)}b`)
    createdLeadIds.push(deleteLeadA, deleteLeadB)

    const deleteResult = await bulkDeleteLeads(sb, actor, [deleteLeadA, deleteLeadB])
    assert(
      'bulk delete leads succeeds',
      deleteResult.success && deleteResult.affectedCount === 2,
      `${deleteResult.message}; failures=${JSON.stringify(deleteResult.failures)}`
    )

    const { data: deletedRows } = await sb.from('leads').select('id').in('id', [deleteLeadA, deleteLeadB])
    assert('database confirms deleted leads are gone', (deletedRows ?? []).length === 0, JSON.stringify(deletedRows ?? []))

    const { data: deleteAuditRows } = await sb
      .from('audit_log')
      .select('id')
      .eq('action', 'lead_deleted')
      .in('lead_id', [deleteLeadA, deleteLeadB])
    assert('lead deletions are audit logged', (deleteAuditRows ?? []).length === 2, JSON.stringify(deleteAuditRows ?? []))
  } finally {
    if (createdLeadIds.length > 0) await sb.from('leads').delete().in('id', createdLeadIds)
    if (adminUserId) await deauthorizeAuthUser(adminUserId)
    if (inspectorUserId) await deauthorizeAuthUser(inspectorUserId)
  }

  if (failed > 0) process.exit(1)
}

main().catch((error) => {
  console.error('Fatal:', error instanceof Error ? error.message : error)
  process.exit(1)
})
'use server'

import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function submitInspection(formData: FormData) {
  const authClient = await createClient()

  const {
    data: { user },
  } = await authClient.auth.getUser()

  if (!user) redirect('/login')

  const leadId = formData.get('lead_id') as string
  const recommendedOffer = formData.get('recommended_offer')
  const notes = formData.get('notes') as string

  // Validate leadId is UUID format
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!leadId || !UUID_RE.test(leadId)) {
    throw new Error('Invalid lead ID')
  }

  // Validate notes length
  if (notes && notes.length > 2000) {
    throw new Error('Notes must be 2000 characters or fewer')
  }

  // 1. Verify lead is assigned to this inspector
  const serviceClient = createServiceClient()
  const { data: lead, error: leadError } = await serviceClient
    .from('leads')
    .select('id, status, pending_photo_urls')
    .eq('id', leadId)
    .eq('assigned_inspector_id', user.id)
    .single()

  if (leadError || !lead) {
    throw new Error('Lead not found or not assigned to you')
  }

  // 2. Idempotency: if inspection already submitted, redirect cleanly
  const { data: existingInspection } = await serviceClient
    .from('inspections')
    .select('id, submitted_at')
    .eq('lead_id', leadId)
    .maybeSingle()

  if (existingInspection?.submitted_at) {
    redirect('/inspector')
  }

  // 3. Build checklist_json from all checklist_* form fields
  const checklistJson: Record<string, string> = {}
  for (const [key, value] of formData.entries()) {
    if (key.startsWith('checklist_') && value) {
      const jsonKey = key.replace('checklist_', '')
      checklistJson[jsonKey] = value as string
    }
  }

  // ── Server-side checklist validation ──────────────────────────────────
  const EXPECTED_SECTIONS = ['Bodywork', 'Interior', 'Mechanical', 'Tyres'] as const
  const EXPECTED_FIELDS: Record<string, string[]> = {
    Bodywork: ['Paintwork', 'Panel gaps', 'Dents / scratches', 'Windscreen'],
    Interior: ['Seats / upholstery', 'Dashboard / trim', 'Electronics', 'Boot'],
    Mechanical: ['Engine', 'Gearbox', 'Brakes', 'Suspension'],
    Tyres: ['Front left', 'Front right', 'Rear left', 'Rear right'],
  }
  const VALID_RATINGS = ['good', 'ok', 'poor', 'na']

  const missingFields: string[] = []
  for (const section of EXPECTED_SECTIONS) {
    for (const field of EXPECTED_FIELDS[section]) {
      const val = checklistJson[`${section}_${field}`]
      if (!val || !VALID_RATINGS.includes(val)) {
        missingFields.push(`${section} > ${field}`)
      }
    }
  }

  if (missingFields.length > 0) {
    throw new Error(`Incomplete checklist — missing: ${missingFields.join(', ')}`)
  }

  // Recommended offer bounds check (£0 – £500,000)
  const offerNum = recommendedOffer ? Number(recommendedOffer) : null
  if (offerNum !== null && (isNaN(offerNum) || offerNum < 0 || offerNum > 500000)) {
    throw new Error('Recommended offer must be between £0 and £500,000')
  }

  // 4. Get pending photos from lead
  const pendingPhotos: string[] = (lead as Record<string, unknown>).pending_photo_urls as string[] ?? []
  const previousStatus = lead.status

  // 5. Insert or update inspection
  let dbError
  if (existingInspection) {
    const { error } = await serviceClient
      .from('inspections')
      .update({
        checklist_json: checklistJson,
        recommended_offer: recommendedOffer ? Number(recommendedOffer) : null,
        notes: notes || null,
        photo_urls: pendingPhotos,
        submitted_at: new Date().toISOString(),
      })
      .eq('id', existingInspection.id)
    dbError = error
  } else {
    const { error } = await serviceClient
      .from('inspections')
      .insert({
        lead_id: leadId,
        inspector_id: user.id,
        checklist_json: checklistJson,
        recommended_offer: recommendedOffer ? Number(recommendedOffer) : null,
        notes: notes || null,
        photo_urls: pendingPhotos,
        submitted_at: new Date().toISOString(),
      })
    dbError = error
  }

  if (dbError) {
    console.error('[inspection] DB error:', dbError)
    throw new Error('Failed to submit inspection. Please try again.')
  }

  // 6. Update lead: status = inspected, clear pending photos
  await serviceClient
    .from('leads')
    .update({
      status: 'inspected',
      pending_photo_urls: [],
    })
    .eq('id', leadId)

  // 7. Audit log
  await serviceClient.from('audit_log').insert([
    {
      lead_id: leadId,
      action: 'inspection_submitted',
      actor_user_id: user.id,
      new_value: {
        recommended_offer: recommendedOffer ? Number(recommendedOffer) : null,
        photo_count: pendingPhotos.length,
      },
    },
    {
      lead_id: leadId,
      action: 'status_change',
      actor_user_id: user.id,
      old_value: { status: previousStatus },
      new_value: { status: 'inspected' },
    },
  ])

  redirect('/inspector')
}

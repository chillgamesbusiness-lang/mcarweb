import { notFound, redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { isValidStatusTransition, VALID_STATUS_TRANSITIONS } from '@/lib/types'
import type { AppointmentStatus, LeadStatus } from '@/lib/types'
import OutcomeForm from './OutcomeForm'
import { SubmitButton } from '@/app/components/SubmitButton'
import { recordTransaction } from '@/lib/calibrationStore'
import { validateUuid } from '@/lib/inputHardening'
import { writeAuditLog } from '@/lib/auditLog'

interface LeadDetailPageProps {
  params: Promise<{ id: string }>
}

const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  booked: 'Booked',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No-show',
}

function formatStatus(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

export default async function AdminLeadDetailPage({ params }: LeadDetailPageProps) {
  const { id } = await params

  // Validate UUID format before querying DB
  const idCheck = validateUuid(id)
  if (!idCheck.valid) notFound()

  const supabase = createServiceClient()

  const { data: lead, error } = await supabase
    .from('leads')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !lead) notFound()

  const [
    { data: appointment },
    { data: inspection },
    { data: notes },
    { data: auditLog },
    { data: snapshot },
    { data: inspectors },
  ] = await Promise.all([
    supabase.from('appointments').select('*').eq('lead_id', id).maybeSingle(),
    supabase.from('inspections').select('*').eq('lead_id', id).maybeSingle(),
    supabase.from('notes').select('*').eq('lead_id', id).order('created_at', { ascending: false }),
    supabase.from('audit_log').select('*').eq('lead_id', id).order('created_at', { ascending: false }),
    supabase.from('valuation_snapshots').select('*').eq('lead_id', id).maybeSingle(),
    createServiceClient().from('users').select('id, name, email').eq('role', 'inspector').eq('is_active', true),
  ])

  // Generate signed URLs for inspection photos
  let inspectionPhotoUrls: string[] = []
  const photoPaths = inspection?.photo_urls as string[] | null
  if (photoPaths && photoPaths.length > 0) {
    const serviceClient = createServiceClient()
    const { data } = await serviceClient.storage
      .from('inspection-photos')
      .createSignedUrls(photoPaths, 3600)
    inspectionPhotoUrls = (data ?? []).map((item) => item.signedUrl).filter(Boolean) as string[]
  }

  const profitSim = (snapshot as Record<string, unknown>)?.profit_simulation as {
    estimatedRetail: number; sellCostPct: number; reconEstimate: number;
    expectedProfitMin: number; expectedProfitMid: number; expectedProfitMax: number;
    profitRiskBand: string; guardrailTriggered: boolean; guardrailReason: string | null;
  } | null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profitSimV4 = (snapshot as Record<string, unknown>)?.profit_simulation_v4 as any | null

  // ── Outcome server action ─────────────────────────────────────────────
  async function submitOutcome(formData: FormData) {
    'use server'
    // Re-verify auth at invocation time (session may have expired since render)
    const authClient = await createClient()
    const { data: { user: caller } } = await authClient.auth.getUser()
    if (!caller) redirect('/login')
    const { data: callerProfile } = await createServiceClient().from('users').select('role').eq('id', caller.id).single()
    if (callerProfile?.role !== 'admin') redirect('/login')
    const leadId = formData.get('leadId') as string
    const outcome = formData.get('outcome') as string
    const reason = formData.get('reason_if_lost') as string | null
    const finalOfferRaw = formData.get('final_offer') as string | null
    const actualPurchaseRaw = formData.get('actual_purchase_price') as string | null
    const actualResaleRaw = formData.get('actual_resale_price') as string | null
    const actualReconRaw = formData.get('actual_recon_cost') as string | null
    const daysToSaleRaw = formData.get('days_to_sale') as string | null

    if (!outcome || !['won', 'lost'].includes(outcome)) return

    const svc = createServiceClient()

    // Fetch current lead status for transition validation
    const { data: currentLead } = await svc
      .from('leads')
      .select('status')
      .eq('id', leadId)
      .single()

    const currentStatus = (currentLead?.status ?? 'new') as LeadStatus
    const targetStatus = outcome as LeadStatus

    // Validate transition (log if invalid but still allow — admin override)
    if (!isValidStatusTransition(currentStatus, targetStatus)) {
      console.warn(
        `[admin] Invalid status transition: ${currentStatus} → ${targetStatus} for lead ${leadId} (allowed by admin override)`
      )
      // Audit log
      await writeAuditLog(svc, {
        leadId,
        action: 'status_change',
        actorUserId: caller.id,
        actorKind: 'admin',
        oldValue: { status: currentStatus, warning: 'invalid_transition' },
        newValue: { status: targetStatus },
      }, { area: 'admin_leads', blocking: true })
    }

    const updateData: Record<string, unknown> = {
      outcome,
      outcome_at: new Date().toISOString(),
      status: outcome as 'won' | 'lost',
    }

    const parseIntSafe = (v: string | null): number | null => {
      if (!v) return null
      const n = parseInt(v, 10)
      return !isNaN(n) && n >= 0 ? n : null
    }

    if (outcome === 'won') {
      const finalOffer = parseIntSafe(finalOfferRaw)
      if (finalOffer !== null) updateData.final_offer = finalOffer

      const actualPurchase = parseIntSafe(actualPurchaseRaw)
      if (actualPurchase !== null) updateData.actual_purchase_price = actualPurchase

      const actualResale = parseIntSafe(actualResaleRaw)
      if (actualResale !== null) updateData.actual_resale_price = actualResale

      const actualRecon = parseIntSafe(actualReconRaw)
      if (actualRecon !== null) updateData.actual_recon_cost = actualRecon

      const daysToSale = parseIntSafe(daysToSaleRaw)
      if (daysToSale !== null) updateData.days_to_sale = daysToSale
    }

    if (outcome === 'lost' && reason) {
      updateData.reason_if_lost = reason
    }

    await svc.from('leads').update(updateData).eq('id', leadId)

    // ── Record calibration transaction if purchase price available ──────
    if (outcome === 'won' && updateData.actual_purchase_price) {
      // Fetch snapshot for calibration context
      const { data: snap } = await svc
        .from('valuation_snapshots')
        .select('input_vehicle, input_condition, input_postcode, result_midpoint')
        .eq('lead_id', leadId)
        .maybeSingle()

      if (snap) {
        const vp = snap.input_vehicle as { make: string; model: string; year: number; fuel: string }
        recordTransaction({
          id: leadId,
          submission: {
            vehicleProfile: vp,
            condition: snap.input_condition as string,
            postcode: snap.input_postcode as string,
          },
          valuation: { midpoint: snap.result_midpoint as number },
          actual_purchase_price: updateData.actual_purchase_price as number,
          actual_resale_price: (updateData.actual_resale_price as number) ?? null,
          recon_cost: (updateData.actual_recon_cost as number) ?? null,
          days_to_sale: (updateData.days_to_sale as number) ?? null,
        }).catch(err => console.error('[calibration-record] failed:', err))
      }
    }

    // Audit log
    await writeAuditLog(svc, {
      leadId,
      action: 'outcome_recorded',
      actorUserId: caller.id,
      actorKind: 'admin',
      oldValue: { status: currentStatus },
      newValue: updateData,
    }, { area: 'admin_leads', blocking: true })

    redirect(`/admin/leads/${leadId}`)
  }

  // ── Add note server action ───────────────────────────────────────────
  async function submitNote(formData: FormData) {
    'use server'

    const authClient = await createClient()
    const { data: { user: caller } } = await authClient.auth.getUser()
    if (!caller) redirect('/login')
    const { data: callerProfile } = await createServiceClient().from('users').select('role').eq('id', caller.id).single()
    if (callerProfile?.role !== 'admin') redirect('/login')

    const leadId = formData.get('leadId') as string
    const body = (formData.get('body') as string)?.trim()

    if (!leadId || !body || body.length < 1 || body.length > 5000) return

    const svc = createServiceClient()

    await svc.from('notes').insert({
      lead_id: leadId,
      author_user_id: caller.id,
      body,
    })

    await writeAuditLog(svc, {
      leadId,
      action: 'note_added',
      actorUserId: caller.id,
      actorKind: 'admin',
      newValue: { body: body.slice(0, 100) },
    }, { area: 'admin_leads', blocking: true })

    redirect(`/admin/leads/${leadId}`)
  }

  // ── Assign inspector server action ───────────────────────────────────
  async function submitAssignInspector(formData: FormData) {
    'use server'

    const authClient = await createClient()
    const { data: { user: caller } } = await authClient.auth.getUser()
    if (!caller) redirect('/login')
    const { data: callerProfile } = await createServiceClient().from('users').select('role').eq('id', caller.id).single()
    if (callerProfile?.role !== 'admin') redirect('/login')

    const leadId = formData.get('leadId') as string
    const inspectorId = formData.get('inspector_id') as string

    if (!leadId) return

    const svc = createServiceClient()

    const { data: currentLead } = await svc
      .from('leads')
      .select('assigned_inspector_id, status')
      .eq('id', leadId)
      .single()

    const prevInspector = currentLead?.assigned_inspector_id ?? null
    const newInspector = inspectorId || null
    const currentStatus = (currentLead?.status ?? 'new') as LeadStatus

    if (prevInspector === newInspector) {
      redirect(`/admin/leads/${leadId}`)
    }

    await svc
      .from('leads')
      .update({ assigned_inspector_id: newInspector })
      .eq('id', leadId)

    await writeAuditLog(svc, {
      leadId,
      action: 'assignment_change',
      actorUserId: caller.id,
      actorKind: 'admin',
      oldValue: { assigned_inspector_id: prevInspector },
      newValue: {
        assigned_inspector_id: newInspector,
        inspector_queue_visible: Boolean(newInspector && !['won', 'lost', 'expired'].includes(currentStatus)),
      },
    }, { area: 'admin_leads', blocking: true })

    redirect(`/admin/leads/${leadId}`)
  }

  // ── Change finance status server action ───────────────────────────────
  async function submitFinanceStatus(formData: FormData) {
    'use server'

    const authClient = await createClient()
    const { data: { user: caller } } = await authClient.auth.getUser()
    if (!caller) redirect('/login')
    const { data: callerProfile } = await createServiceClient().from('users').select('role').eq('id', caller.id).single()
    if (callerProfile?.role !== 'admin') redirect('/login')

    const leadId = formData.get('leadId') as string
    const newFinanceStatus = formData.get('finance_status') as string

    if (!leadId || !newFinanceStatus || !['not_checked', 'clear', 'finance_found'].includes(newFinanceStatus)) return

    const svc = createServiceClient()

    const { data: currentLead } = await svc
      .from('leads')
      .select('finance_status')
      .eq('id', leadId)
      .single()

    const prevStatus = currentLead?.finance_status ?? 'not_checked'

    if (prevStatus === newFinanceStatus) {
      redirect(`/admin/leads/${leadId}`)
    }

    await svc
      .from('leads')
      .update({ finance_status: newFinanceStatus })
      .eq('id', leadId)

    await writeAuditLog(svc, {
      leadId,
      action: 'finance_change',
      actorUserId: caller.id,
      actorKind: 'admin',
      oldValue: { finance_status: prevStatus },
      newValue: { finance_status: newFinanceStatus },
    }, { area: 'admin_leads', blocking: true })

    redirect(`/admin/leads/${leadId}`)
  }

  // ── Status change server action ───────────────────────────────────────
  async function submitStatusChange(formData: FormData) {
    'use server'
    const authClient = await createClient()
    const { data: { user: caller } } = await authClient.auth.getUser()
    if (!caller) redirect('/login')
    const { data: callerProfile } = await createServiceClient().from('users').select('role').eq('id', caller.id).single()
    if (callerProfile?.role !== 'admin') redirect('/login')
    const leadId = formData.get('leadId') as string
    const newStatus = formData.get('status') as LeadStatus

    if (!leadId || !newStatus) return

    const svc = createServiceClient()

    const { data: currentLead } = await svc
      .from('leads')
      .select('status')
      .eq('id', leadId)
      .single()

    const currentStatus = (currentLead?.status ?? 'new') as LeadStatus

    if (currentStatus === newStatus) {
      redirect(`/admin/leads/${leadId}`)
    }

    // Validate transition
    if (!isValidStatusTransition(currentStatus, newStatus)) {
      console.warn(
        `[admin] Invalid status transition attempted: ${currentStatus} → ${newStatus} for lead ${leadId}`
      )
      // Log but allow (admin override) — surface in audit log with warning
      await writeAuditLog(svc, {
        leadId,
        action: 'status_change',
        actorUserId: caller.id,
        actorKind: 'admin',
        oldValue: { status: currentStatus, warning: 'invalid_transition_override' },
        newValue: { status: newStatus },
      }, { area: 'admin_leads', blocking: true })
    }

    await svc
      .from('leads')
      .update({ status: newStatus })
      .eq('id', leadId)

    await writeAuditLog(svc, {
      leadId,
      action: 'status_change',
      actorUserId: caller.id,
      actorKind: 'admin',
      oldValue: { status: currentStatus },
      newValue: { status: newStatus },
    }, { area: 'admin_leads', blocking: true })

    redirect(`/admin/leads/${leadId}`)
  }

  // ── Appointment status server action ─────────────────────────────────
  async function submitAppointmentStatus(formData: FormData) {
    'use server'
    const authClient = await createClient()
    const { data: { user: caller } } = await authClient.auth.getUser()
    if (!caller) redirect('/login')
    const { data: callerProfile } = await createServiceClient().from('users').select('role').eq('id', caller.id).single()
    if (callerProfile?.role !== 'admin') redirect('/login')

    const leadId = formData.get('leadId') as string
    const appointmentId = formData.get('appointmentId') as string
    const newStatus = formData.get('status') as AppointmentStatus

    if (!leadId || !appointmentId || !['booked', 'completed', 'cancelled', 'no_show'].includes(newStatus)) return

    const svc = createServiceClient()
    const [appointmentResult, leadResult] = await Promise.all([
      svc.from('appointments').select('status').eq('id', appointmentId).eq('lead_id', leadId).single(),
      svc.from('leads').select('status').eq('id', leadId).single(),
    ])

    const prevAppointmentStatus = appointmentResult.data?.status as AppointmentStatus | undefined
    const prevLeadStatus = (leadResult.data?.status ?? 'new') as LeadStatus

    if (!prevAppointmentStatus || prevAppointmentStatus === newStatus) {
      redirect(`/admin/leads/${leadId}`)
    }

    let nextLeadStatus: LeadStatus | null = null
    if (newStatus === 'cancelled' && prevLeadStatus === 'appointment_booked') nextLeadStatus = 'contacted'
    if (newStatus === 'no_show' && prevLeadStatus === 'appointment_booked') nextLeadStatus = 'no_response'

    await svc.from('appointments').update({ status: newStatus }).eq('id', appointmentId).eq('lead_id', leadId)
    if (nextLeadStatus) {
      await svc.from('leads').update({ status: nextLeadStatus }).eq('id', leadId)
    }

    await writeAuditLog(svc, {
      leadId,
      action: 'status_change',
      actorUserId: caller.id,
      actorKind: 'admin',
      oldValue: { appointment_status: prevAppointmentStatus, lead_status: prevLeadStatus },
      newValue: { appointment_status: newStatus, lead_status: nextLeadStatus ?? prevLeadStatus },
    }, { area: 'admin_leads', blocking: true })

    redirect(`/admin/leads/${leadId}`)
  }

  // ── Delete lead server action ─────────────────────────────────────────
  async function submitDeleteLead(formData: FormData) {
    'use server'
    const authClient = await createClient()
    const { data: { user: caller } } = await authClient.auth.getUser()
    if (!caller) redirect('/login')
    const { data: callerProfile } = await createServiceClient().from('users').select('role').eq('id', caller.id).single()
    if (callerProfile?.role !== 'admin') redirect('/login')

    const leadId = formData.get('leadId') as string
    const confirm = ((formData.get('confirm') as string) ?? '').trim()
    if (!leadId || confirm !== 'DELETE') return

    const svc = createServiceClient()
    const [{ data: targetLead }, { data: targetInspections }] = await Promise.all([
      svc.from('leads').select('pending_photo_urls').eq('id', leadId).maybeSingle(),
      svc.from('inspections').select('photo_urls').eq('lead_id', leadId),
    ])

    const photoPaths = new Set<string>()
    ;((targetLead as Record<string, unknown> | null)?.pending_photo_urls as string[] | undefined)?.forEach((path) => photoPaths.add(path))
    ;(targetInspections ?? []).forEach((inspection) => {
      ((inspection as Record<string, unknown>).photo_urls as string[] | undefined)?.forEach((path) => photoPaths.add(path))
    })

    if (photoPaths.size > 0) {
      await svc.storage.from('inspection-photos').remove([...photoPaths])
    }

    const { error: deleteError } = await svc.from('leads').delete().eq('id', leadId)
    if (deleteError) throw new Error('Failed to delete client record. Please try again.')

    redirect('/admin/leads')
  }

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-5xl mx-auto">
      {/* ── Header — dossier style: reg as hero, metadata inline ─── */}
      <div className="mb-8 sm:mb-10">
        <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-warm-gray mb-2">Lead Detail</p>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground leading-none mb-2">
          {lead.reg}
        </h1>
        <p className="text-sm sm:text-[15px] text-foreground/70 flex flex-wrap gap-x-1">
          <span>{lead.seller_name}</span>
          <span className="text-warm-gray">·</span>
          <span>{lead.make ?? '—'} {lead.model ?? ''}</span>
          <span className="text-warm-gray">·</span>
          <span className="text-warm-gray">{new Date(lead.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
        </p>
      </div>

      {/* ── Vehicle + Seller: two cards side by side ─────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 mb-6 sm:mb-8">
        <div className="card-premium p-5 sm:p-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-warm-gray mb-3 flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-gold" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.147-.504 1.147-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H14.25m0 0V5.625m0 8.625h-2.875" /></svg>
            Vehicle
          </p>
          <dl className="space-y-2">
            <DL label="Year" value={lead.year?.toString() ?? '—'} />
            <DL label="Fuel" value={lead.fuel ?? '—'} />
            <DL label="Transmission" value={lead.transmission ?? '—'} />
            <DL label="Mileage" value={lead.mileage ? `${lead.mileage.toLocaleString()} mi` : '—'} />
            <DL label="Condition" value={lead.condition} />
          </dl>
        </div>
        <div className="card-premium p-5 sm:p-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-warm-gray mb-3 flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-gold" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
            Seller
          </p>
          <dl className="space-y-2">
            <DL label="Email" value={<a href={`mailto:${lead.seller_email}`} className="text-gold hover:underline">{lead.seller_email}</a>} />
            <DL label="Phone" value={<a href={`tel:${lead.seller_phone}`} className="text-gold hover:underline">{lead.seller_phone}</a>} />
            <DL label="Postcode" value={lead.seller_postcode} />
          </dl>
        </div>
      </div>

      {/* ── Valuation — hero numbers in card ──────────────────────── */}
      <div className="card-premium p-5 sm:p-7 mb-6 sm:mb-8">
        <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-warm-gray mb-5 flex items-center gap-2">
          <svg className="w-3.5 h-3.5 text-gold" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          Valuation
        </p>
        {snapshot ? (
          <>
            {/* Big 3 values — responsive strip */}
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-10 mb-6">
              <div className="text-center sm:text-left">
                <p className="text-xs text-warm-gray mb-1">Min</p>
                <p className="text-xl sm:text-2xl font-bold tracking-tight text-green-600">£{snapshot.result_min?.toLocaleString()}</p>
              </div>
              <div className="text-center sm:text-left">
                <p className="text-xs text-warm-gray mb-1">Midpoint</p>
                <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">£{snapshot.result_midpoint?.toLocaleString()}</p>
              </div>
              <div className="text-center sm:text-left">
                <p className="text-xs text-warm-gray mb-1">Max</p>
                <p className="text-xl sm:text-2xl font-bold tracking-tight text-green-600">£{snapshot.result_max?.toLocaleString()}</p>
              </div>
            </div>

            {/* Metadata chips */}
            <div className="flex flex-wrap gap-3 sm:gap-6 text-sm">
              <div>
                <span className="text-warm-gray">Confidence</span>
                <span className="ml-2 font-semibold text-foreground">{snapshot.confidence_score}/100</span>
              </div>
              <div>
                <span className="text-warm-gray">Risk</span>
                <span className={`ml-2 font-semibold ${
                  snapshot.risk_tier === 'low' ? 'text-green-600' :
                  snapshot.risk_tier === 'medium' ? 'text-amber-600' : 'text-red-600'
                }`}>
                  {snapshot.risk_tier?.toUpperCase()}
                </span>
              </div>
              <div>
                <span className="text-warm-gray">Auto-Quote</span>
                <span className={`ml-2 font-semibold ${snapshot.auto_quote ? 'text-green-600' : 'text-red-600'}`}>
                  {snapshot.auto_quote ? 'Yes' : 'Manual Review'}
                </span>
              </div>
              <div>
                <span className="text-warm-gray">Market</span>
                <span className="ml-2 font-semibold text-foreground">£{snapshot.market_value_used?.toLocaleString()}</span>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-[var(--card-border)]">
              <DL label="Snapshot" value={new Date(snapshot.created_at).toLocaleString('en-GB')} />
            </div>

            {(profitSimV4 || profitSim) && (
              <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700 block mb-2">Profit model archived</span>
                <p className="text-sm leading-relaxed text-amber-900">
                  Projected profit outputs are hidden until enough realised purchase, recon, and resale outcomes exist. Use the valuation range, inspection findings, and recorded outcomes for decisions.
                </p>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-warm-gray">No valuation snapshot recorded.</p>
        )}
      </div>

      {/* ── Outcome card ──────────────────────────────────────── */}
      <div className="card-premium p-5 sm:p-7 mb-6 sm:mb-8">
        <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-warm-gray mb-5 flex items-center gap-2">
          <svg className="w-3.5 h-3.5 text-gold" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          Outcome
        </p>
        {lead.outcome ? (
          <div>
            <div className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium mb-3 ${
              lead.outcome === 'won' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {lead.outcome === 'won' ? (
                <><svg className="inline w-4 h-4 mr-1 -mt-0.5 text-green-700" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>Won</>
              ) : (
                <><svg className="inline w-4 h-4 mr-1 -mt-0.5 text-red-700" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>Lost</>
              )}
            </div>
            {lead.outcome === 'won' && lead.final_offer && (
              <DL label="Final Price" value={`£${lead.final_offer.toLocaleString()}`} />
            )}
            {lead.outcome === 'lost' && lead.reason_if_lost && (
              <DL label="Reason" value={lead.reason_if_lost.replace(/_/g, ' ')} />
            )}
            {lead.outcome_at && (
              <DL label="Recorded" value={new Date(lead.outcome_at).toLocaleString('en-GB')} />
            )}
            {lead.outcome === 'won' && lead.final_offer && snapshot && (
              <div className="mt-3 p-3 bg-blue-50 rounded-xl">
                <p className="text-xs text-blue-600 mb-1">Engine vs Actual</p>
                <p className="text-sm text-blue-900">
                  Midpoint was £{snapshot.result_midpoint?.toLocaleString()} — 
                  final was £{lead.final_offer.toLocaleString()} (
                  {lead.final_offer >= snapshot.result_midpoint
                    ? `+£${(lead.final_offer - snapshot.result_midpoint).toLocaleString()}`
                    : `-£${(snapshot.result_midpoint - lead.final_offer).toLocaleString()}`
                  })
                </p>
              </div>
            )}
          </div>
        ) : (
          <OutcomeForm
            leadId={lead.id}
            currentOutcome={lead.outcome}
            currentReason={lead.reason_if_lost}
            currentFinalOffer={lead.final_offer}
            currentActualPurchase={lead.actual_purchase_price ?? null}
            currentActualResale={lead.actual_resale_price ?? null}
            currentReconCost={lead.actual_recon_cost ?? null}
            currentDaysToSale={lead.days_to_sale ?? null}
            submitOutcome={submitOutcome}
          />
        )}
      </div>

      {/* ── CRM State card ──────────────────────────────────── */}
      <div className="card-premium p-5 sm:p-7 mb-6 sm:mb-8">
        <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-warm-gray mb-5 flex items-center gap-2">
          <svg className="w-3.5 h-3.5 text-gold" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" /></svg>
          CRM State
        </p>

        <div className="flex flex-wrap gap-4 sm:gap-8 mb-6 text-sm">
          <div><span className="text-warm-gray">Status</span> <span className="ml-2 font-semibold text-foreground capitalize">{lead.status}</span></div>
          <div><span className="text-warm-gray">Finance</span> <span className="ml-2 font-semibold text-foreground capitalize">{(lead.finance_status ?? 'not_checked').replace(/_/g, ' ')}</span></div>
          <div><span className="text-warm-gray">Inspector</span> <span className="ml-2 font-semibold text-foreground">{
            (() => {
              const insp = inspectors?.find((i: { id: string; name: string; email: string }) => i.id === lead.assigned_inspector_id)
              return insp ? insp.name : 'Unassigned'
            })()
          }</span></div>
        </div>

        {/* 3 forms — responsive: 1 col mobile, 3 cols desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Inspector assignment */}
          <form action={submitAssignInspector} className="p-4 rounded-xl bg-[var(--surface-warm)] border border-[var(--card-border)]">
            <input type="hidden" name="leadId" value={lead.id} />
            <label htmlFor="inspector_id" className="block text-xs text-warm-gray mb-1.5 font-medium">Inspector</label>
            <select
              id="inspector_id"
              name="inspector_id"
              defaultValue={lead.assigned_inspector_id ?? ''}
              className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-foreground focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20"
            >
              <option value="">Unassigned</option>
              {inspectors?.map((insp: { id: string; name: string; email: string }) => (
                <option key={insp.id} value={insp.id}>{insp.name}</option>
              ))}
            </select>
            <p className="mt-2 text-[11px] leading-snug text-warm-gray/70">Assigned non-terminal leads appear in the inspector queue.</p>
            <SubmitButton
              loadingText="Forwarding…"
              className="mt-3 w-full rounded-lg gradient-gold px-3 py-2 text-xs font-bold text-white shadow-sm hover:shadow-md transition-all"
            >
              Forward
            </SubmitButton>
          </form>

          {/* Finance */}
          <form action={submitFinanceStatus} className="p-4 rounded-xl bg-[var(--surface-warm)] border border-[var(--card-border)]">
            <input type="hidden" name="leadId" value={lead.id} />
            <label htmlFor="finance_status" className="block text-xs text-warm-gray mb-1.5 font-medium">Finance</label>
            <select
              id="finance_status"
              name="finance_status"
              defaultValue={lead.finance_status ?? 'not_checked'}
              className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-foreground focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20"
            >
              <option value="not_checked">Not Checked</option>
              <option value="clear">Clear</option>
              <option value="finance_found">Finance Found</option>
            </select>
            <SubmitButton
              loadingText="…"
              className="mt-3 w-full rounded-lg gradient-gold px-3 py-2 text-xs font-bold text-white shadow-sm hover:shadow-md transition-all"
            >
              Update
            </SubmitButton>
          </form>

          {/* Status */}
          {(() => {
            const currentStatus = lead.status as LeadStatus
            const allowedTransitions = VALID_STATUS_TRANSITIONS[currentStatus] ?? []
            if (allowedTransitions.length === 0) return (
              <div className="p-4 rounded-xl bg-[var(--surface-warm)] border border-[var(--card-border)]">
                <label className="block text-xs text-warm-gray mb-1.5 font-medium">Status</label>
                <p className="text-xs text-warm-gray/60 mt-2">Terminal state — no transitions</p>
              </div>
            )
            return (
              <form action={submitStatusChange} className="p-4 rounded-xl bg-[var(--surface-warm)] border border-[var(--card-border)]">
                <input type="hidden" name="leadId" value={lead.id} />
                <label htmlFor="status" className="block text-xs text-warm-gray mb-1.5 font-medium">Status</label>
                <select
                  id="status"
                  name="status"
                  defaultValue=""
                  className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-foreground focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20"
                >
                  <option value="" disabled>Select…</option>
                  {allowedTransitions.map((s) => (
                    <option key={s} value={s}>
                      {formatStatus(s)}
                    </option>
                  ))}
                </select>
                <SubmitButton
                  loadingText="…"
                  className="mt-3 w-full rounded-lg gradient-gold px-3 py-2 text-xs font-bold text-white shadow-sm hover:shadow-md transition-all"
                >
                  Update
                </SubmitButton>
              </form>
            )
          })()}
        </div>
      </div>

      {/* ── Appointment card ──────────────────────────────── */}
      <div className="card-premium p-5 sm:p-7 mb-6 sm:mb-8">
        <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-warm-gray mb-4 flex items-center gap-2">
          <svg className="w-3.5 h-3.5 text-gold" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>
          Appointment
        </p>
        {appointment ? (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-8 text-sm">
              <div><span className="text-warm-gray">Type</span> <span className="ml-2 text-foreground capitalize">{appointment.type.replace('_', '-')}</span></div>
              <div><span className="text-warm-gray">When</span> <span className="ml-2 text-foreground">{new Date(appointment.start_at).toLocaleString('en-GB', { timeZone: 'Europe/London' })}</span></div>
              <div><span className="text-warm-gray">Status</span> <span className="ml-2 text-foreground">{APPOINTMENT_STATUS_LABELS[appointment.status as AppointmentStatus]}</span></div>
            </div>
            {appointment.status === 'booked' && (
              <form action={submitAppointmentStatus} className="flex flex-wrap gap-2 border-t border-[var(--card-border)] pt-4">
                <input type="hidden" name="leadId" value={lead.id} />
                <input type="hidden" name="appointmentId" value={appointment.id} />
                <SubmitButton
                  name="status"
                  value="cancelled"
                  loadingText="Cancelling…"
                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 transition-all hover:bg-red-100"
                >
                  Cancel Booking
                </SubmitButton>
                <SubmitButton
                  name="status"
                  value="completed"
                  loadingText="Updating…"
                  className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs font-bold text-green-700 transition-all hover:bg-green-100"
                >
                  Mark Completed
                </SubmitButton>
                <SubmitButton
                  name="status"
                  value="no_show"
                  loadingText="Updating…"
                  className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700 transition-all hover:bg-amber-100"
                >
                  No-show
                </SubmitButton>
              </form>
            )}
          </div>
        ) : (
          <p className="text-sm text-warm-gray/60">No appointment booked.</p>
        )}
      </div>

      {/* ── Inspection card ──────────────────────────────── */}
      <div className="card-premium p-5 sm:p-7 mb-6 sm:mb-8">
        <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-warm-gray mb-4 flex items-center gap-2">
          <svg className="w-3.5 h-3.5 text-gold" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" /></svg>
          Inspection
        </p>
        {inspection ? (
          <div>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-8 text-sm mb-4">
              <div><span className="text-warm-gray">Offer</span> <span className="ml-2 font-semibold text-foreground">{inspection.recommended_offer ? `£${inspection.recommended_offer.toLocaleString()}` : '—'}</span></div>
              <div><span className="text-warm-gray">Submitted</span> <span className="ml-2 text-foreground">{inspection.submitted_at ? new Date(inspection.submitted_at).toLocaleString('en-GB') : 'Pending'}</span></div>
            </div>

            {inspection.notes && (
              <p className="text-sm text-foreground/70 mb-4 italic">&ldquo;{inspection.notes}&rdquo;</p>
            )}

            {inspectionPhotoUrls.length > 0 && (
              <div className="mt-3">
                <span className="text-sm text-warm-gray block mb-2">
                  Photos ({inspectionPhotoUrls.length})
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {inspectionPhotoUrls.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt={`Inspection photo ${i + 1}`}
                        className="w-full aspect-square object-cover rounded-xl border border-[var(--card-border)] hover:opacity-80 transition-opacity"
                      />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {inspection.checklist_json && Object.keys(inspection.checklist_json as Record<string, string>).length > 0 && (
              <div className="mt-4">
                <span className="text-sm text-warm-gray block mb-2">Checklist</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {Object.entries(inspection.checklist_json as Record<string, string>).map(([key, val]) => (
                    <div key={key} className="flex gap-2 text-sm py-1 px-2 rounded-lg bg-[var(--surface-warm)]">
                      <span className="text-warm-gray">{key.replace(/_/g, ' ')}</span>
                      <span className="font-medium text-foreground capitalize">{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-warm-gray/60">No inspection submitted.</p>
        )}
      </div>

      {/* ── Notes card — timeline style ─────────────────────── */}
      <div className="card-premium p-5 sm:p-7 mb-6 sm:mb-8">
        <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-warm-gray mb-4 flex items-center gap-2">
          <svg className="w-3.5 h-3.5 text-gold" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443 48.282 48.282 0 005.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" /></svg>
          Notes ({notes?.length ?? 0})
        </p>

        <form action={submitNote} className="mb-6 max-w-lg">
          <input type="hidden" name="leadId" value={lead.id} />
          <textarea
            name="body"
            required
            rows={2}
            placeholder="Add a note..."
            className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--input-bg)] px-4 py-3 text-sm text-foreground placeholder:text-warm-gray/50 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20 resize-y"
          />
          <SubmitButton
            loadingText="Adding…"
            className="mt-2 rounded-lg gradient-gold px-4 py-2 text-xs font-bold text-white shadow-sm hover:shadow-md transition-all"
          >
            Add Note
          </SubmitButton>
        </form>

        {notes && notes.length > 0 ? (
          <div className="space-y-0 border-l-2 border-gold/20 pl-5 ml-1">
            {notes.map((note) => (
              <div key={note.id} className="pb-4 relative">
                <div className="absolute -left-[27px] top-1.5 w-2.5 h-2.5 rounded-full bg-gold/40 ring-2 ring-[var(--card-bg)]" />
                <p className="text-sm text-foreground/80">{note.body}</p>
                <p className="text-[11px] text-warm-gray/60 mt-1">{new Date(note.created_at).toLocaleString('en-GB')}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-warm-gray/60">No notes yet.</p>
        )}
      </div>

      {/* ── Danger Zone ───────────────────────────────────── */}
      <div className="card-premium p-5 sm:p-7 mb-6 sm:mb-8 border-red-200/70">
        <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-red-500 mb-4 flex items-center gap-2">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0 3.75h.008v.008H12v-.008zM10.29 3.86L1.82 18a1.5 1.5 0 001.29 2.25h17.78A1.5 1.5 0 0022.18 18L13.71 3.86a1.5 1.5 0 00-2.42 0z" /></svg>
          Danger Zone
        </p>
        <form action={submitDeleteLead} className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end max-w-2xl">
          <input type="hidden" name="leadId" value={lead.id} />
          <div>
            <label htmlFor="confirm-delete" className="block text-sm font-semibold text-foreground mb-1.5">Delete client record</label>
            <p className="text-xs text-warm-gray mb-2">This permanently removes the lead, booking, notes, inspection record, and related photos. Type DELETE to confirm.</p>
            <input
              id="confirm-delete"
              name="confirm"
              pattern="DELETE"
              placeholder="DELETE"
              className="w-full rounded-xl border border-red-200 bg-red-50/60 px-4 py-3 text-sm font-bold uppercase tracking-wider text-red-700 placeholder:text-red-300 focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-200"
            />
          </div>
          <SubmitButton
            loadingText="Deleting…"
            className="rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white transition-all hover:bg-red-700 disabled:opacity-60"
          >
            Delete Client
          </SubmitButton>
        </form>
      </div>

      {/* ── Audit Log card ───────────────────────────────────── */}
      <div className="card-premium p-5 sm:p-7">
        <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-warm-gray mb-4 flex items-center gap-2">
          <svg className="w-3.5 h-3.5 text-gold" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          Audit Log
        </p>
        {auditLog && auditLog.length > 0 ? (
          <div className="space-y-1.5">
            {auditLog.map((entry) => (
              <div key={entry.id} className="flex flex-col sm:flex-row gap-1 sm:gap-4 text-xs py-1.5 px-2 rounded-lg hover:bg-[var(--surface-warm)] transition-colors">
                <span className="text-warm-gray/50 tabular-nums whitespace-nowrap shrink-0">
                  {new Date(entry.created_at).toLocaleString('en-GB')}
                </span>
                <span className="text-foreground/70">{entry.action.replace(/_/g, ' ')}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-warm-gray/60">No activity.</p>
        )}
      </div>
    </div>
  )
}

function DL({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-3">
      <dt className="text-sm text-warm-gray w-24 sm:w-28 shrink-0">{label}</dt>
      <dd className="text-sm text-foreground">{value}</dd>
    </div>
  )
}

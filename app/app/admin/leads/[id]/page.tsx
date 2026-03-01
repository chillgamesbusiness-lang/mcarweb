import { notFound, redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { isValidStatusTransition, VALID_STATUS_TRANSITIONS } from '@/lib/types'
import type { LeadStatus } from '@/lib/types'
import OutcomeForm from './OutcomeForm'
import { SubmitButton } from '@/app/components/SubmitButton'

interface LeadDetailPageProps {
  params: Promise<{ id: string }>
}

// Multiplier display names for the breakdown table
const MULTIPLIER_LABELS: Record<string, string> = {
  tradeBase: 'Trade Base (£)',
  ageMultiplier: 'ageMultiplier',
  mileageMultiplier: 'mileageMultiplier',
  motMultiplier: 'motMultiplier',
  fuelMultiplier: 'fuelMultiplier',
  conditionMultiplier: 'Condition',
  regionMultiplier: 'regionMultiplier',
  ulezMultiplier: 'ulezMultiplier',
  mileageConsistencyMultiplier: 'mileageConsistencyMultiplier',
  volatilityMultiplier: 'volatilityMultiplier',
  keeperMultiplier: 'keeperMultiplier',
  sornMultiplier: 'sornMultiplier',
  reconMultiplier: 'reconMultiplier',
  reconEstimate: 'Recon Estimate (£)',
  liquidityBuffer: 'Liquidity Buffer',
  combinedAdjustment: 'combinedAdjustment',
  rawValue: 'rawValue',
}

export default async function AdminLeadDetailPage({ params }: LeadDetailPageProps) {
  const { id } = await params
  const authClient = await createClient()
  const supabase = createServiceClient()

  // Get current admin user for audit log actor_user_id
  const { data: { user: adminUser } } = await authClient.auth.getUser()

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

  // Parse snapshot multipliers
  const multipliers = snapshot?.all_multipliers as Record<string, number> | null
  const riskFlags = snapshot?.risk_flags as string[] | null

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
      await svc.from('audit_log').insert({
        lead_id: leadId,
        action: 'status_change',
        actor_user_id: adminUser?.id,
        old_value: { status: currentStatus, warning: 'invalid_transition' },
        new_value: { status: targetStatus },
      })
    }

    const updateData: Record<string, unknown> = {
      outcome,
      outcome_at: new Date().toISOString(),
      status: outcome as 'won' | 'lost',
    }

    if (outcome === 'won' && finalOfferRaw) {
      const finalOffer = parseInt(finalOfferRaw, 10)
      if (!isNaN(finalOffer) && finalOffer > 0) {
        updateData.final_offer = finalOffer
      }
    }

    if (outcome === 'lost' && reason) {
      updateData.reason_if_lost = reason
    }

    await svc.from('leads').update(updateData).eq('id', leadId)

    // Audit log
    await svc.from('audit_log').insert({
      lead_id: leadId,
      action: 'outcome_recorded',
      actor_user_id: adminUser?.id,
      old_value: { status: currentStatus },
      new_value: updateData,
    })

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
      author_user_id: adminUser?.id,
      body,
    })

    await svc.from('audit_log').insert({
      lead_id: leadId,
      action: 'note_added',
      actor_user_id: adminUser?.id,
      new_value: { body: body.slice(0, 100) },
    })

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
      .select('assigned_inspector_id')
      .eq('id', leadId)
      .single()

    const prevInspector = currentLead?.assigned_inspector_id ?? null
    const newInspector = inspectorId || null

    if (prevInspector === newInspector) {
      redirect(`/admin/leads/${leadId}`)
    }

    await svc
      .from('leads')
      .update({ assigned_inspector_id: newInspector })
      .eq('id', leadId)

    await svc.from('audit_log').insert({
      lead_id: leadId,
      action: 'assignment_change',
      actor_user_id: adminUser?.id,
      old_value: { assigned_inspector_id: prevInspector },
      new_value: { assigned_inspector_id: newInspector },
    })

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

    await svc.from('audit_log').insert({
      lead_id: leadId,
      action: 'finance_change',
      actor_user_id: adminUser?.id,
      old_value: { finance_status: prevStatus },
      new_value: { finance_status: newFinanceStatus },
    })

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
      await svc.from('audit_log').insert({
        lead_id: leadId,
        action: 'status_change',
        actor_user_id: adminUser?.id,
        old_value: { status: currentStatus, warning: 'invalid_transition_override' },
        new_value: { status: newStatus },
      })
    }

    await svc
      .from('leads')
      .update({ status: newStatus })
      .eq('id', leadId)

    await svc.from('audit_log').insert({
      lead_id: leadId,
      action: 'status_change',
      actor_user_id: adminUser?.id,
      old_value: { status: currentStatus },
      new_value: { status: newStatus },
    })

    redirect(`/admin/leads/${leadId}`)
  }

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">
        {lead.reg} - {lead.seller_name}
      </h1>
      <p className="text-sm text-gray-400 mb-8">
        Lead ID: {lead.id} | Submitted {new Date(lead.created_at).toLocaleString('en-GB')}
      </p>

      <Section title="Vehicle">
        <Field label="Registration" value={lead.reg} />
        <Field label="Make / Model" value={`${lead.make ?? '-'} ${lead.model ?? ''}`} />
        <Field label="Year" value={lead.year?.toString() ?? '-'} />
        <Field label="Fuel" value={lead.fuel ?? '-'} />
        <Field label="Transmission" value={lead.transmission ?? '-'} />
        <Field label="Mileage" value={lead.mileage ? `${lead.mileage.toLocaleString()} miles` : '-'} />
        <Field label="Condition" value={lead.condition} />
      </Section>

      <Section title="Seller">
        <Field label="Name" value={lead.seller_name} />
        <Field label="Email" value={lead.seller_email} />
        <Field label="Phone" value={lead.seller_phone} />
        <Field label="Postcode" value={lead.seller_postcode} />
      </Section>

      {/* ── Valuation Breakdown (admin-only) ──────────────────────────── */}
      <Section title="Valuation Breakdown">
        {snapshot ? (
          <>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-xs text-green-600 mb-1">Min</p>
                <p className="text-lg font-bold text-green-800">£{snapshot.result_min?.toLocaleString()}</p>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-blue-600 mb-1">Midpoint</p>
                <p className="text-lg font-bold text-blue-800">£{snapshot.result_midpoint?.toLocaleString()}</p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-xs text-green-600 mb-1">Max</p>
                <p className="text-lg font-bold text-green-800">£{snapshot.result_max?.toLocaleString()}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <span className="text-xs text-gray-400">Confidence</span>
                <p className="text-sm font-semibold text-gray-900">{snapshot.confidence_score}/100</p>
              </div>
              <div>
                <span className="text-xs text-gray-400">Risk Tier</span>
                <p className={`text-sm font-semibold ${
                  snapshot.risk_tier === 'low' ? 'text-green-700' :
                  snapshot.risk_tier === 'medium' ? 'text-amber-700' : 'text-red-700'
                }`}>
                  {snapshot.risk_tier?.toUpperCase()}
                </p>
              </div>
              <div>
                <span className="text-xs text-gray-400">Auto-Quote</span>
                <p className={`text-sm font-semibold ${snapshot.auto_quote ? 'text-green-700' : 'text-red-700'}`}>
                  {snapshot.auto_quote ? 'Yes' : 'No — Manual Review'}
                </p>
              </div>
            </div>

            <Field label="Market Value Used" value={`£${snapshot.market_value_used?.toLocaleString()}`} />
            <Field label="Region" value={snapshot.region_used ?? '-'} />
            <Field label="Engine Version" value={snapshot.engine_version ?? 'v1'} />
            <Field label="Postcode (at quote)" value={snapshot.input_postcode ?? '-'} />
            <Field label="Snapshot Created" value={new Date(snapshot.created_at).toLocaleString('en-GB')} />

            {/* Multiplier table */}
            {multipliers && (
              <div className="mt-4">
                <span className="text-xs text-gray-400 block mb-2">Multipliers</span>
                <div className="bg-gray-50 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <tbody className="divide-y divide-gray-200">
                      {Object.entries(multipliers).map(([key, val]) => {
                        const isTradeBase = key === 'tradeBase'
                        const isBuffer = key === 'liquidityBuffer'
                        const displayVal = isTradeBase
                          ? `£${val.toLocaleString()}`
                          : isBuffer
                            ? `${(val * 100).toFixed(0)}%`
                            : val.toFixed(4)
                        const isNeutral = !isTradeBase && !isBuffer && val === 1
                        const isPenalty = !isTradeBase && !isBuffer && val < 1
                        return (
                          <tr key={key} className={isPenalty ? 'bg-red-50' : isNeutral ? '' : ''}>
                            <td className="px-3 py-1.5 text-gray-600">{MULTIPLIER_LABELS[key] ?? key}</td>
                            <td className={`px-3 py-1.5 text-right font-mono ${
                              isPenalty ? 'text-red-700 font-medium' : 'text-gray-900'
                            }`}>
                              {displayVal}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Risk flags */}
            {riskFlags && riskFlags.length > 0 && (
              <div className="mt-4">
                <span className="text-xs text-gray-400 block mb-2">Risk Flags ({riskFlags.length})</span>
                <ul className="space-y-1">
                  {riskFlags.map((flag: string, i: number) => (
                    <li key={i} className="text-sm text-red-700 bg-red-50 rounded px-3 py-1.5">
                      {flag}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-gray-400">No valuation snapshot recorded for this lead.</p>
        )}
      </Section>

      {/* ── Outcome Tracking ──────────────────────────────────────────── */}
      <Section title="Outcome">
        {lead.outcome ? (
          <div>
            <div className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium mb-3 ${
              lead.outcome === 'won' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {lead.outcome === 'won' ? '✓ Won' : '✗ Lost'}
            </div>
            {lead.outcome === 'won' && lead.final_offer && (
              <Field label="Final Price" value={`£${lead.final_offer.toLocaleString()}`} />
            )}
            {lead.outcome === 'lost' && lead.reason_if_lost && (
              <Field label="Reason" value={lead.reason_if_lost.replace(/_/g, ' ')} />
            )}
            {lead.outcome_at && (
              <Field label="Recorded" value={new Date(lead.outcome_at).toLocaleString('en-GB')} />
            )}
            {/* Show delta if won and we have valuation data */}
            {lead.outcome === 'won' && lead.final_offer && snapshot && (
              <div className="mt-3 p-3 bg-blue-50 rounded-lg">
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
            submitOutcome={submitOutcome}
          />
        )}
      </Section>

      <Section title="CRM State">
        <Field label="Current Status" value={lead.status} />
        <Field label="Finance Status" value={lead.finance_status ?? 'not_checked'} />
        <Field label="Assigned Inspector" value={
          (() => {
            const insp = inspectors?.find((i: { id: string; name: string; email: string }) => i.id === lead.assigned_inspector_id)
            return insp ? `${insp.name} (${insp.email})` : 'Unassigned'
          })()
        } />

        {/* Inspector assignment form */}
        <form action={submitAssignInspector} className="mt-3 flex gap-2 items-end">
          <input type="hidden" name="leadId" value={lead.id} />
          <div className="flex-1">
            <label htmlFor="inspector_id" className="block text-xs text-gray-400 mb-1">
              Assign Inspector
            </label>
            <select
              id="inspector_id"
              name="inspector_id"
              defaultValue={lead.assigned_inspector_id ?? ''}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            >
              <option value="">Unassigned</option>
              {inspectors?.map((insp: { id: string; name: string; email: string }) => (
                <option key={insp.id} value={insp.id}>
                  {insp.name} ({insp.email})
                </option>
              ))}
            </select>
          </div>
          <SubmitButton
            loadingText="Assigning…"
            className="rounded-md bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Assign
          </SubmitButton>
        </form>

        {/* Finance status form */}
        <form action={submitFinanceStatus} className="mt-3 flex gap-2 items-end">
          <input type="hidden" name="leadId" value={lead.id} />
          <div className="flex-1">
            <label htmlFor="finance_status" className="block text-xs text-gray-400 mb-1">
              Finance Status
            </label>
            <select
              id="finance_status"
              name="finance_status"
              defaultValue={lead.finance_status ?? 'not_checked'}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            >
              <option value="not_checked">Not Checked</option>
              <option value="clear">Clear</option>
              <option value="finance_found">Finance Found</option>
            </select>
          </div>
          <SubmitButton
            loadingText="Updating…"
            className="rounded-md bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Update
          </SubmitButton>
        </form>

        {/* Status change form with valid transitions */}
        {(() => {
          const currentStatus = lead.status as LeadStatus
          const allowedTransitions = VALID_STATUS_TRANSITIONS[currentStatus] ?? []
          if (allowedTransitions.length === 0) return (
            <p className="text-xs text-gray-400 mt-2">
              This lead is in a terminal state ({currentStatus}) — no further transitions available.
            </p>
          )
          return (
            <form action={submitStatusChange} className="mt-3 flex gap-2 items-end">
              <input type="hidden" name="leadId" value={lead.id} />
              <div className="flex-1">
                <label htmlFor="status" className="block text-xs text-gray-400 mb-1">
                  Change Status
                </label>
                <select
                  id="status"
                  name="status"
                  defaultValue=""
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                >
                  <option value="" disabled>Select new status...</option>
                  {allowedTransitions.map((s) => (
                    <option key={s} value={s}>
                      {s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                    </option>
                  ))}
                </select>
              </div>
              <SubmitButton
                loadingText="Updating…"
                className="rounded-md bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Update
              </SubmitButton>
            </form>
          )
        })()}
      </Section>

      <Section title="Appointment">
        {appointment ? (
          <>
            <Field label="Type" value={appointment.type} />
            <Field label="Starts" value={new Date(appointment.start_at).toLocaleString('en-GB')} />
            <Field label="Status" value={appointment.status} />
            <Field label="Location / Link" value={appointment.location_or_link ?? '-'} />
          </>
        ) : (
          <p className="text-sm text-gray-400">No appointment booked.</p>
        )}
      </Section>

      <Section title="Inspection">
        {inspection ? (
          <>
            <Field
              label="Recommended Offer"
              value={inspection.recommended_offer ? `GBP ${inspection.recommended_offer.toLocaleString()}` : '-'}
            />
            <Field label="Submitted" value={inspection.submitted_at ? new Date(inspection.submitted_at).toLocaleString('en-GB') : 'Not submitted'} />
            <Field label="Notes" value={inspection.notes ?? '-'} />

            {inspectionPhotoUrls.length > 0 && (
              <div className="mt-3">
                <span className="text-sm text-gray-400 block mb-2">
                  Photos ({inspectionPhotoUrls.length})
                </span>
                <div className="grid grid-cols-3 gap-3">
                  {inspectionPhotoUrls.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt={`Inspection photo ${i + 1}`}
                        className="w-full aspect-square object-cover rounded-md border border-gray-200 hover:opacity-80 transition-opacity"
                      />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {inspection.checklist_json && Object.keys(inspection.checklist_json as Record<string, string>).length > 0 && (
              <div className="mt-3">
                <span className="text-sm text-gray-400 block mb-2">Checklist</span>
                <div className="grid grid-cols-2 gap-1">
                  {Object.entries(inspection.checklist_json as Record<string, string>).map(([key, val]) => (
                    <div key={key} className="flex gap-2 text-sm">
                      <span className="text-gray-500">{key.replace(/_/g, ' ')}</span>
                      <span className="font-medium text-gray-700 capitalize">{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-gray-400">No inspection submitted yet.</p>
        )}
      </Section>

      <Section title={`Notes (${notes?.length ?? 0})`}>
        {/* Add note form */}
        <form action={submitNote} className="mb-4">
          <input type="hidden" name="leadId" value={lead.id} />
          <textarea
            name="body"
            required
            rows={2}
            placeholder="Add a note..."
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-y"
          />
          <SubmitButton
            loadingText="Adding…"
            className="mt-2 rounded-md bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Add Note
          </SubmitButton>
        </form>

        {notes && notes.length > 0 ? (
          <ul className="space-y-2">
            {notes.map((note) => (
              <li key={note.id} className="text-sm text-gray-700 bg-gray-50 rounded p-3">
                <p>{note.body}</p>
                <p className="text-xs text-gray-400 mt-1">{new Date(note.created_at).toLocaleString('en-GB')}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-400">No notes yet.</p>
        )}
      </Section>

      <Section title="Audit Log">
        {auditLog && auditLog.length > 0 ? (
          <ul className="space-y-1 text-sm">
            {auditLog.map((entry) => (
              <li key={entry.id} className="flex gap-3 text-gray-600">
                <span className="text-gray-400 whitespace-nowrap">
                  {new Date(entry.created_at).toLocaleString('en-GB')}
                </span>
                <span className="font-medium">{entry.action.replace(/_/g, ' ')}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-400">No activity yet.</p>
        )}
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 mb-3">{title}</h2>
      <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-3">{children}</div>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-4">
      <span className="w-40 text-sm text-gray-400 shrink-0">{label}</span>
      <span className="text-sm text-gray-900 capitalize">{value}</span>
    </div>
  )
}

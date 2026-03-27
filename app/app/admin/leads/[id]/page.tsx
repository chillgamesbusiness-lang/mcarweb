import { notFound, redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { isValidStatusTransition, VALID_STATUS_TRANSITIONS } from '@/lib/types'
import type { LeadStatus } from '@/lib/types'
import OutcomeForm from './OutcomeForm'
import { SubmitButton } from '@/app/components/SubmitButton'
import { recordTransaction } from '@/lib/calibrationStore'
import { validateUuid } from '@/lib/inputHardening'

interface LeadDetailPageProps {
  params: Promise<{ id: string }>
}

// Multiplier display names for the breakdown table
const MULTIPLIER_LABELS: Record<string, string> = {
  tradeBase: 'Trade Base (£)',
  ageMultiplier: 'Age',
  mileageMultiplier: 'Mileage',
  motMultiplier: 'MOT Risk',
  fuelMultiplier: 'Fuel Type',
  conditionMultiplier: 'Condition',
  regionMultiplier: 'Region',
  ulezMultiplier: 'ULEZ',
  mileageConsistencyMultiplier: 'Mileage Consistency',
  volatilityMultiplier: 'Volatility',
  keeperMultiplier: 'Keeper History',
  sornMultiplier: 'SORN',
  reconMultiplier: 'Recon Impact',
  reconEstimate: 'Recon Estimate (£)',
  marketConfidenceMultiplier: 'Market Confidence',
  inputTrustMultiplier: 'Input Trust',
  liquidityBuffer: 'Liquidity Buffer',
  combinedAdjustment: 'Combined Adj.',
  rawValue: 'Raw Value (£)',
}

export default async function AdminLeadDetailPage({ params }: LeadDetailPageProps) {
  const { id } = await params

  // Validate UUID format before querying DB
  const idCheck = validateUuid(id)
  if (!idCheck.valid) notFound()

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
  const adminExplanation = (snapshot as Record<string, unknown>)?.admin_explanation as { rule: string; severity: string; description: string; impact: string }[] | null
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
    <div className="p-6 lg:p-10 max-w-4xl">
      {/* ── Header — dossier style: reg as hero, metadata inline ─── */}
      <div className="mb-10">
        <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-warm-gray mb-2">Lead Detail</p>
        <h1 className="text-4xl font-extrabold tracking-tight text-charcoal leading-none mb-2">
          {lead.reg}
        </h1>
        <p className="text-[15px] text-charcoal-light">
          {lead.seller_name}
          <span className="text-warm-gray mx-2">·</span>
          {lead.make ?? '—'} {lead.model ?? ''}
          <span className="text-warm-gray mx-2">·</span>
          <span className="text-warm-gray">{new Date(lead.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
        </p>
      </div>

      {/* ── Vehicle + Seller: two columns, no cards ─────────────── */}
      <div className="grid grid-cols-2 gap-x-12 gap-y-1 mb-10 pb-10 border-b border-warm-border">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-warm-gray mb-3">Vehicle</p>
          <dl className="space-y-2">
            <DL label="Year" value={lead.year?.toString() ?? '—'} />
            <DL label="Fuel" value={lead.fuel ?? '—'} />
            <DL label="Transmission" value={lead.transmission ?? '—'} />
            <DL label="Mileage" value={lead.mileage ? `${lead.mileage.toLocaleString()} mi` : '—'} />
            <DL label="Condition" value={lead.condition} />
          </dl>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-warm-gray mb-3">Seller</p>
          <dl className="space-y-2">
            <DL label="Email" value={lead.seller_email} />
            <DL label="Phone" value={lead.seller_phone} />
            <DL label="Postcode" value={lead.seller_postcode} />
          </dl>
        </div>
      </div>

      {/* ── Valuation — hero numbers, not a card ──────────────────── */}
      <div className="mb-10 pb-10 border-b border-warm-border">
        <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-warm-gray mb-5">Valuation</p>
        {snapshot ? (
          <>
            {/* Big 3 values in a strip */}
            <div className="flex gap-10 mb-6">
              <div>
                <p className="text-xs text-warm-gray mb-1">Min</p>
                <p className="text-2xl font-bold tracking-tight text-green-700">£{snapshot.result_min?.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-warm-gray mb-1">Midpoint</p>
                <p className="text-3xl font-extrabold tracking-tight text-charcoal">£{snapshot.result_midpoint?.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-warm-gray mb-1">Max</p>
                <p className="text-2xl font-bold tracking-tight text-green-700">£{snapshot.result_max?.toLocaleString()}</p>
              </div>
            </div>

            {/* Metadata inline */}
            <div className="flex gap-8 text-sm">
              <div>
                <span className="text-warm-gray">Confidence</span>
                <span className="ml-2 font-semibold text-charcoal">{snapshot.confidence_score}/100</span>
              </div>
              <div>
                <span className="text-warm-gray">Risk</span>
                <span className={`ml-2 font-semibold ${
                  snapshot.risk_tier === 'low' ? 'text-green-700' :
                  snapshot.risk_tier === 'medium' ? 'text-amber-700' : 'text-red-700'
                }`}>
                  {snapshot.risk_tier?.toUpperCase()}
                </span>
              </div>
              <div>
                <span className="text-warm-gray">Auto-Quote</span>
                <span className={`ml-2 font-semibold ${snapshot.auto_quote ? 'text-green-700' : 'text-red-700'}`}>
                  {snapshot.auto_quote ? 'Yes' : 'Manual Review'}
                </span>
              </div>
              <div>
                <span className="text-warm-gray">Market</span>
                <span className="ml-2 font-semibold text-charcoal">£{snapshot.market_value_used?.toLocaleString()}</span>
              </div>
            </div>
            {/* Technical metadata — commented out */}
            {/* <Field label="Region" value={snapshot.region_used ?? '-'} />
            <Field label="Engine Version" value={snapshot.engine_version ?? 'v1'} />
            <Field label="Postcode (at quote)" value={snapshot.input_postcode ?? '-'} /> */}
            <DL label="Snapshot" value={new Date(snapshot.created_at).toLocaleString('en-GB')} />

            {/* Multiplier table — commented out (technical detail) */}
            {/* {multipliers && (
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
            )} */}

            {/* Risk flags — commented out (technical detail) */}
            {/* {riskFlags && riskFlags.length > 0 && (
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
            )} */}

            {/* Admin Engine Explanation — commented out (technical detail) */}
            {/* {adminExplanation && adminExplanation.length > 0 && (
              <div className="mt-4">
                <span className="text-xs text-gray-400 block mb-2">Engine Explanation ({adminExplanation.length})</span>
                <div className="space-y-1">
                  {adminExplanation.map((item, i) => {
                    const impactStr = item.impact ?? ''
                    const isPositive = impactStr.startsWith('+') || impactStr === 'clear' || impactStr === 'bonus'
                    const isNegative = impactStr.startsWith('-') || impactStr === 'blocked' || impactStr === 'manual_review'
                    const pctMatch = impactStr.match(/-(\d+(?:\.\d+)?)%/)
                    const pctVal = pctMatch ? parseFloat(pctMatch[1]) : 0

                    let bgClass: string
                    let textClass: string
                    let impactClass: string

                    if (isPositive) {
                      bgClass = 'bg-green-50'
                      textClass = 'text-green-800'
                      impactClass = 'text-green-700 font-semibold'
                    } else if (item.severity === 'critical' || pctVal >= 15) {
                      bgClass = 'bg-red-50'
                      textClass = 'text-red-800'
                      impactClass = 'text-red-700 font-semibold'
                    } else if (item.severity === 'warning' || pctVal >= 5) {
                      bgClass = 'bg-amber-50'
                      textClass = 'text-amber-800'
                      impactClass = 'text-amber-700 font-semibold'
                    } else if (isNegative) {
                      bgClass = 'bg-orange-50'
                      textClass = 'text-orange-800'
                      impactClass = 'text-orange-600 font-medium'
                    } else {
                      bgClass = 'bg-blue-50'
                      textClass = 'text-blue-800'
                      impactClass = 'text-blue-600'
                    }

                    return (
                      <div key={i} className={`text-sm rounded px-3 py-1.5 flex justify-between items-center ${bgClass} ${textClass}`}>
                        <span><span className="font-mono text-xs mr-2">{item.rule}</span>{item.description}</span>
                        <span className={`font-mono text-xs shrink-0 ml-2 ${impactClass}`}>{impactStr}</span>
                      </div>
                    )
                  })}
                </div>
                <p className="text-[10px] text-gray-400 mt-1.5 italic">
                  Percentages are compound multiplier impacts, not flat price cuts. Final value = base × all multipliers.
                </p>
              </div>
            )} */}

            {/* ── Profit Simulation V4 (Resale Evidence Engine) ─────────── */}
            {profitSimV4 ? (
              <div className="mt-4">
                <span className="text-xs text-warm-gray block mb-2">Profit Simulation v4</span>

                {/* ── Compact View (always visible) ──────────────────────── */}
                <div className={`rounded-lg p-4 ${
                  profitSimV4.profit?.mid >= 300 ? 'bg-green-50 ring-1 ring-green-200' :
                  profitSimV4.profit?.mid >= 0 ? 'bg-amber-50 ring-1 ring-amber-200' :
                  'bg-red-50 ring-1 ring-red-200'
                }`}>
                  {/* Big profit number */}
                  <div className="text-center mb-3">
                    <p className="text-xs text-warm-gray mb-0.5">Projected Profit (Mid)</p>
                    <p className={`text-3xl font-extrabold tracking-tight ${
                      profitSimV4.profit?.mid >= 300 ? 'text-green-700' :
                      profitSimV4.profit?.mid >= 0 ? 'text-amber-700' : 'text-red-700'
                    }`}>
                      £{profitSimV4.profit?.mid?.toLocaleString()}
                    </p>
                  </div>

                  {/* 4 compact stats */}
                  <div className="grid grid-cols-4 gap-2 text-center mb-3">
                    <div>
                      <p className="text-[10px] text-warm-gray">Est. Resale</p>
                      <p className="text-sm font-semibold text-charcoal">£{profitSimV4.resale?.mid?.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-warm-gray">Profit Range</p>
                      <p className="text-xs font-medium text-charcoal-light">
                        £{profitSimV4.profit?.low?.toLocaleString()} – £{profitSimV4.profit?.high?.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-warm-gray">Margin</p>
                      <p className={`text-sm font-bold ${
                        profitSimV4.marginPctMid >= 10 ? 'text-green-700' :
                        profitSimV4.marginPctMid >= 5 ? 'text-amber-700' : 'text-red-700'
                      }`}>{profitSimV4.marginPctMid}%</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-warm-gray">Confidence</p>
                      <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        profitSimV4.confidence === 'high' ? 'bg-green-100 text-green-800' :
                        profitSimV4.confidence === 'medium' ? 'bg-amber-100 text-amber-800' :
                        'bg-red-100 text-red-800'
                      }`}>{profitSimV4.confidence}</span>
                    </div>
                  </div>

                  <p className="text-[10px] text-warm-gray italic text-center">
                    {profitSimV4.compactNote}
                  </p>

                  {profitSimV4.guardrailTriggered && (
                    <p className="mt-2 text-xs text-red-700 font-medium text-center">
                      <svg className="inline w-3.5 h-3.5 mr-0.5 -mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86l-8.6 14.86A1 1 0 002.56 20h18.88a1 1 0 00.87-1.28l-8.6-14.86a1 1 0 00-1.72 0z" /></svg>
                      {profitSimV4.guardrailReason}
                    </p>
                  )}

                  {/* Detailed breakdown — commented out (technical detail) */}
                  {/* <details className="mt-3">
                    <summary className="text-xs text-blue-600 hover:text-blue-800 cursor-pointer font-medium text-center">
                      Show details
                    </summary>

                    <div className="mt-3 space-y-4">
                      <div className="bg-white/60 rounded-lg p-3">
                        <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Evidence</h4>
                        <p className="text-xs text-gray-700">{profitSimV4.evidence?.compsSummary}</p>
                        <div className="mt-1 flex gap-3 text-[10px] text-gray-400">
                          <span>Variance: {profitSimV4.evidence?.variance}</span>
                          <span>Threshold: {profitSimV4.evidence?.similarityThreshold?.toFixed(2)}</span>
                          <span>Sources: {profitSimV4.evidence?.providers?.join(', ') || 'baseline'}</span>
                        </div>
                      </div>

                      Adjustments, Costs & Time, Resale Range, Market Comps, v3 Delta
                      all commented out (technical detail)
                    </div>
                  </details> */}
                </div>
              </div>
            ) : profitSim ? (
              /* ── Fallback: v3 Profit Simulation ─────────────────────────── */
              <div className="mt-4">
                <span className="text-xs text-warm-gray block mb-2">Profit Simulation (v3)</span>
                <div className={`rounded-lg p-4 ${
                  profitSim.profitRiskBand === 'green' ? 'bg-green-50 ring-1 ring-green-200' :
                  profitSim.profitRiskBand === 'amber' ? 'bg-amber-50 ring-1 ring-amber-200' :
                  'bg-red-50 ring-1 ring-red-200'
                }`}>
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <div className="text-center">
                      <p className="text-xs text-warm-gray">Profit (Min)</p>
                      <p className={`text-sm font-bold ${profitSim.expectedProfitMin < 0 ? 'text-red-700' : 'text-green-700'}`}>
                        £{profitSim.expectedProfitMin?.toLocaleString()}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-warm-gray">Profit (Mid)</p>
                      <p className={`text-lg font-bold ${profitSim.expectedProfitMid < 0 ? 'text-red-700' : 'text-green-700'}`}>
                        £{profitSim.expectedProfitMid?.toLocaleString()}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-warm-gray">Profit (Max)</p>
                      <p className={`text-sm font-bold ${profitSim.expectedProfitMax < 0 ? 'text-red-700' : 'text-green-700'}`}>
                        £{profitSim.expectedProfitMax?.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  {/* Technical detail hidden */}
                  {/* <div className="flex justify-between text-xs text-gray-500">
                    <span>Est. Resale: £{profitSim.estimatedRetail?.toLocaleString()}</span>
                    <span>Recon: £{profitSim.reconEstimate?.toLocaleString()}</span>
                    <span>Sell cost: {((profitSim.sellCostPct ?? 0.05) * 100).toFixed(0)}%</span>
                  </div>
                  <p className="mt-1 text-[10px] text-gray-400 italic">
                    v3 baseline — 20% dealer markup. v4 not yet computed for this lead.
                  </p> */}
                  {profitSim.guardrailTriggered && (
                    <p className="mt-2 text-xs text-red-700 font-medium">
                      <svg className="inline w-3.5 h-3.5 mr-0.5 -mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86l-8.6 14.86A1 1 0 002.56 20h18.88a1 1 0 00.87-1.28l-8.6-14.86a1 1 0 00-1.72 0z" /></svg>
                      Guardrail: {profitSim.guardrailReason}
                    </p>
                  )}
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <p className="text-sm text-warm-gray">No valuation snapshot recorded.</p>
        )}
      </div>

      {/* ── Outcome — distinct from other sections ──────────────── */}
      <div className="mb-10 pb-10 border-b border-warm-border">
        <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-warm-gray mb-5">Outcome</p>
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
            currentActualPurchase={lead.actual_purchase_price ?? null}
            currentActualResale={lead.actual_resale_price ?? null}
            currentReconCost={lead.actual_recon_cost ?? null}
            currentDaysToSale={lead.days_to_sale ?? null}
            submitOutcome={submitOutcome}
          />
        )}
      </div>

      {/* ── CRM State — compact inline forms ──────────────────── */}
      <div className="mb-10 pb-10 border-b border-warm-border">
        <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-warm-gray mb-5">CRM State</p>

        <div className="flex gap-8 mb-6 text-sm">
          <div><span className="text-warm-gray">Status</span> <span className="ml-2 font-semibold text-charcoal capitalize">{lead.status}</span></div>
          <div><span className="text-warm-gray">Finance</span> <span className="ml-2 font-semibold text-charcoal capitalize">{(lead.finance_status ?? 'not_checked').replace(/_/g, ' ')}</span></div>
          <div><span className="text-warm-gray">Inspector</span> <span className="ml-2 font-semibold text-charcoal">{
            (() => {
              const insp = inspectors?.find((i: { id: string; name: string; email: string }) => i.id === lead.assigned_inspector_id)
              return insp ? insp.name : 'Unassigned'
            })()
          }</span></div>
        </div>

        {/* 3 forms in a compact row */}
        <div className="grid grid-cols-3 gap-4">
          {/* Inspector assignment */}
          <form action={submitAssignInspector}>
            <input type="hidden" name="leadId" value={lead.id} />
            <label htmlFor="inspector_id" className="block text-xs text-warm-gray mb-1.5">Inspector</label>
            <select
              id="inspector_id"
              name="inspector_id"
              defaultValue={lead.assigned_inspector_id ?? ''}
              className="w-full border-b border-warm-border bg-transparent px-1 py-1.5 text-sm text-charcoal focus:border-gold focus:outline-none"
            >
              <option value="">Unassigned</option>
              {inspectors?.map((insp: { id: string; name: string; email: string }) => (
                <option key={insp.id} value={insp.id}>{insp.name}</option>
              ))}
            </select>
            <SubmitButton
              loadingText="…"
              className="mt-2 text-xs font-medium text-gold hover:text-gold-dark transition-colors disabled:opacity-60"
            >
              Assign
            </SubmitButton>
          </form>

          {/* Finance */}
          <form action={submitFinanceStatus}>
            <input type="hidden" name="leadId" value={lead.id} />
            <label htmlFor="finance_status" className="block text-xs text-warm-gray mb-1.5">Finance</label>
            <select
              id="finance_status"
              name="finance_status"
              defaultValue={lead.finance_status ?? 'not_checked'}
              className="w-full border-b border-warm-border bg-transparent px-1 py-1.5 text-sm text-charcoal focus:border-gold focus:outline-none"
            >
              <option value="not_checked">Not Checked</option>
              <option value="clear">Clear</option>
              <option value="finance_found">Finance Found</option>
            </select>
            <SubmitButton
              loadingText="…"
              className="mt-2 text-xs font-medium text-gold hover:text-gold-dark transition-colors disabled:opacity-60"
            >
              Update
            </SubmitButton>
          </form>

          {/* Status */}
          {(() => {
            const currentStatus = lead.status as LeadStatus
            const allowedTransitions = VALID_STATUS_TRANSITIONS[currentStatus] ?? []
            if (allowedTransitions.length === 0) return (
              <div>
                <label className="block text-xs text-warm-gray mb-1.5">Status</label>
                <p className="text-xs text-warm-gray/60 mt-2">Terminal state — no transitions</p>
              </div>
            )
            return (
              <form action={submitStatusChange}>
                <input type="hidden" name="leadId" value={lead.id} />
                <label htmlFor="status" className="block text-xs text-warm-gray mb-1.5">Status</label>
                <select
                  id="status"
                  name="status"
                  defaultValue=""
                  className="w-full border-b border-warm-border bg-transparent px-1 py-1.5 text-sm text-charcoal focus:border-gold focus:outline-none"
                >
                  <option value="" disabled>Select…</option>
                  {allowedTransitions.map((s) => (
                    <option key={s} value={s}>
                      {s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                    </option>
                  ))}
                </select>
                <SubmitButton
                  loadingText="…"
                  className="mt-2 text-xs font-medium text-gold hover:text-gold-dark transition-colors disabled:opacity-60"
                >
                  Update
                </SubmitButton>
              </form>
            )
          })()}
        </div>
      </div>

      {/* ── Appointment — inline, minimal ──────────────────── */}
      <div className="mb-10 pb-10 border-b border-warm-border">
        <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-warm-gray mb-4">Appointment</p>
        {appointment ? (
          <div className="flex gap-8 text-sm">
            <div><span className="text-warm-gray">Type</span> <span className="ml-2 text-charcoal capitalize">{appointment.type.replace('_', '-')}</span></div>
            <div><span className="text-warm-gray">When</span> <span className="ml-2 text-charcoal">{new Date(appointment.start_at).toLocaleString('en-GB')}</span></div>
            <div><span className="text-warm-gray">Status</span> <span className="ml-2 text-charcoal capitalize">{appointment.status}</span></div>
          </div>
        ) : (
          <p className="text-sm text-warm-gray/60">No appointment booked.</p>
        )}
      </div>

      {/* ── Inspection — photos + checklist, open layout ──── */}
      <div className="mb-10 pb-10 border-b border-warm-border">
        <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-warm-gray mb-4">Inspection</p>
        {inspection ? (
          <div>
            <div className="flex gap-8 text-sm mb-4">
              <div><span className="text-warm-gray">Offer</span> <span className="ml-2 font-semibold text-charcoal">{inspection.recommended_offer ? `£${inspection.recommended_offer.toLocaleString()}` : '—'}</span></div>
              <div><span className="text-warm-gray">Submitted</span> <span className="ml-2 text-charcoal">{inspection.submitted_at ? new Date(inspection.submitted_at).toLocaleString('en-GB') : 'Pending'}</span></div>
            </div>

            {inspection.notes && (
              <p className="text-sm text-charcoal-light mb-4 italic">&ldquo;{inspection.notes}&rdquo;</p>
            )}

            {inspectionPhotoUrls.length > 0 && (
              <div className="mt-3">
                <span className="text-sm text-warm-gray block mb-2">
                  Photos ({inspectionPhotoUrls.length})
                </span>
                <div className="grid grid-cols-3 gap-3">
                  {inspectionPhotoUrls.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt={`Inspection photo ${i + 1}`}
                        className="w-full aspect-square object-cover rounded-md border border-warm-border hover:opacity-80 transition-opacity"
                      />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {inspection.checklist_json && Object.keys(inspection.checklist_json as Record<string, string>).length > 0 && (
              <div className="mt-3">
                <span className="text-sm text-warm-gray block mb-2">Checklist</span>
                <div className="grid grid-cols-2 gap-1">
                  {Object.entries(inspection.checklist_json as Record<string, string>).map(([key, val]) => (
                    <div key={key} className="flex gap-2 text-sm">
                      <span className="text-warm-gray">{key.replace(/_/g, ' ')}</span>
                      <span className="font-medium text-charcoal-light capitalize">{val}</span>
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

      {/* ── Notes — timeline style ─────────────────────────────── */}
      <div className="mb-10 pb-10 border-b border-warm-border">
        <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-warm-gray mb-4">Notes ({notes?.length ?? 0})</p>

        <form action={submitNote} className="mb-6 max-w-lg">
          <input type="hidden" name="leadId" value={lead.id} />
          <textarea
            name="body"
            required
            rows={2}
            placeholder="Add a note..."
            className="w-full border-b border-warm-border bg-transparent px-1 py-2 text-sm text-charcoal placeholder:text-warm-gray/50 focus:border-gold focus:outline-none resize-y"
          />
          <SubmitButton
            loadingText="Adding…"
            className="mt-2 text-xs font-medium text-gold hover:text-gold-dark transition-colors disabled:opacity-60"
          >
            Add Note
          </SubmitButton>
        </form>

        {notes && notes.length > 0 ? (
          <div className="space-y-0 border-l-2 border-warm-border-light pl-5 ml-1">
            {notes.map((note) => (
              <div key={note.id} className="pb-4 relative">
                <div className="absolute -left-[27px] top-1.5 w-2 h-2 rounded-full bg-warm-border" />
                <p className="text-sm text-charcoal-light">{note.body}</p>
                <p className="text-[11px] text-warm-gray/60 mt-1">{new Date(note.created_at).toLocaleString('en-GB')}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-warm-gray/60">No notes yet.</p>
        )}
      </div>

      {/* ── Audit Log — minimal timeline ───────────────────────── */}
      <div className="mb-10">
        <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-warm-gray mb-4">Audit Log</p>
        {auditLog && auditLog.length > 0 ? (
          <div className="space-y-1.5">
            {auditLog.map((entry) => (
              <div key={entry.id} className="flex gap-4 text-xs">
                <span className="text-warm-gray/50 tabular-nums whitespace-nowrap w-36 shrink-0">
                  {new Date(entry.created_at).toLocaleString('en-GB')}
                </span>
                <span className="text-warm-gray">{entry.action.replace(/_/g, ' ')}</span>
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

function DL({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-3">
      <dt className="text-sm text-warm-gray w-28 shrink-0">{label}</dt>
      <dd className="text-sm text-charcoal">{value}</dd>
    </div>
  )
}

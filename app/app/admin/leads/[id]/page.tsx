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

            {/* Admin Explanation (engine v3) — color-coded by impact direction */}
            {adminExplanation && adminExplanation.length > 0 && (
              <div className="mt-4">
                <span className="text-xs text-gray-400 block mb-2">Engine Explanation ({adminExplanation.length})</span>
                <div className="space-y-1">
                  {adminExplanation.map((item, i) => {
                    // Positive impacts = green, negative = severity gradient, neutral = blue
                    const impactStr = item.impact ?? ''
                    const isPositive = impactStr.startsWith('+') || impactStr === 'clear' || impactStr === 'bonus'
                    const isNegative = impactStr.startsWith('-') || impactStr === 'blocked' || impactStr === 'manual_review'
                    // Extract numeric % for severity scaling
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
            )}

            {/* ── Profit Simulation V4 (Resale Evidence Engine) ─────────── */}
            {profitSimV4 ? (
              <div className="mt-4">
                <span className="text-xs text-gray-400 block mb-2">Profit Simulation v4</span>

                {/* ── Compact View (always visible) ──────────────────────── */}
                <div className={`rounded-lg p-4 ${
                  profitSimV4.profit?.mid >= 300 ? 'bg-green-50 ring-1 ring-green-200' :
                  profitSimV4.profit?.mid >= 0 ? 'bg-amber-50 ring-1 ring-amber-200' :
                  'bg-red-50 ring-1 ring-red-200'
                }`}>
                  {/* Big profit number */}
                  <div className="text-center mb-3">
                    <p className="text-xs text-gray-500 mb-0.5">Projected Profit (Mid)</p>
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
                      <p className="text-[10px] text-gray-400">Est. Resale</p>
                      <p className="text-sm font-semibold text-gray-800">£{profitSimV4.resale?.mid?.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400">Profit Range</p>
                      <p className="text-xs font-medium text-gray-600">
                        £{profitSimV4.profit?.low?.toLocaleString()} – £{profitSimV4.profit?.high?.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400">Margin</p>
                      <p className={`text-sm font-bold ${
                        profitSimV4.marginPctMid >= 10 ? 'text-green-700' :
                        profitSimV4.marginPctMid >= 5 ? 'text-amber-700' : 'text-red-700'
                      }`}>{profitSimV4.marginPctMid}%</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400">Confidence</p>
                      <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        profitSimV4.confidence === 'high' ? 'bg-green-100 text-green-800' :
                        profitSimV4.confidence === 'medium' ? 'bg-amber-100 text-amber-800' :
                        'bg-red-100 text-red-800'
                      }`}>{profitSimV4.confidence}</span>
                    </div>
                  </div>

                  <p className="text-[10px] text-gray-400 italic text-center">
                    {profitSimV4.compactNote}
                  </p>

                  {profitSimV4.guardrailTriggered && (
                    <p className="mt-2 text-xs text-red-700 font-medium text-center">
                      ⚠ {profitSimV4.guardrailReason}
                    </p>
                  )}

                  {/* ── Show Details Toggle ────────────────────────────────── */}
                  <details className="mt-3">
                    <summary className="text-xs text-blue-600 hover:text-blue-800 cursor-pointer font-medium text-center">
                      Show details
                    </summary>

                    <div className="mt-3 space-y-4">
                      {/* ── Evidence Tab ────────────────────────────────── */}
                      <div className="bg-white/60 rounded-lg p-3">
                        <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Evidence</h4>
                        <p className="text-xs text-gray-700">{profitSimV4.evidence?.compsSummary}</p>
                        <div className="mt-1 flex gap-3 text-[10px] text-gray-400">
                          <span>Variance: {profitSimV4.evidence?.variance}</span>
                          <span>Threshold: {profitSimV4.evidence?.similarityThreshold?.toFixed(2)}</span>
                          <span>Sources: {profitSimV4.evidence?.providers?.join(', ') || 'baseline'}</span>
                        </div>
                      </div>

                      {/* ── Adjustments Tab ─────────────────────────────── */}
                      {profitSimV4.adjustmentDrivers?.length > 0 && (
                        <div className="bg-white/60 rounded-lg p-3">
                          <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Key Adjustments</h4>
                          <div className="space-y-1">
                            {profitSimV4.adjustmentDrivers.slice(0, 5).map((d: { factor: string; impact: string; direction: string }, i: number) => (
                              <div key={i} className="flex justify-between text-xs">
                                <span className="text-gray-700">{d.factor}</span>
                                <span className={`font-medium ${
                                  d.direction === 'negative' ? 'text-red-600' :
                                  d.direction === 'positive' ? 'text-green-600' : 'text-gray-500'
                                }`}>{d.impact}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* ── Costs & Time Tab ─────────────────────────────── */}
                      <div className="bg-white/60 rounded-lg p-3">
                        <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Costs &amp; Time</h4>
                        {profitSimV4.costsAndTime?.sellCostBreakdown?.breakdown?.map((line: string, i: number) => (
                          <p key={i} className="text-xs text-gray-600">{line}</p>
                        ))}
                        <div className="mt-2 pt-2 border-t border-gray-100">
                          <p className="text-xs text-gray-600">
                            {profitSimV4.costsAndTime?.timeToSell?.explanation}
                          </p>
                          {profitSimV4.costsAndTime?.timeToSell?.signals?.slice(0, 3).map((s: string, i: number) => (
                            <p key={i} className="text-[10px] text-gray-400 ml-2">• {s}</p>
                          ))}
                        </div>
                      </div>

                      {/* ── Resale Range ──────────────────────────────────── */}
                      <div className="bg-white/60 rounded-lg p-3">
                        <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Resale Range</h4>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div>
                            <p className="text-[10px] text-gray-400">Low</p>
                            <p className="text-sm font-semibold text-gray-700">£{profitSimV4.resale?.low?.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-400">Mid</p>
                            <p className="text-sm font-bold text-gray-900">£{profitSimV4.resale?.mid?.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-400">High</p>
                            <p className="text-sm font-semibold text-gray-700">£{profitSimV4.resale?.high?.toLocaleString()}</p>
                          </div>
                        </div>
                      </div>

                      {/* ── Raw Comps (admin only) ────────────────────────── */}
                      {profitSimV4.topComps?.length > 0 && (
                        <div className="bg-white/60 rounded-lg p-3">
                          <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                            Market Comps ({profitSimV4.topComps.length})
                          </h4>
                          <div className="overflow-x-auto">
                            <table className="w-full text-[10px]">
                              <thead>
                                <tr className="text-gray-400 border-b border-gray-100">
                                  <th className="text-left py-1">Title</th>
                                  <th className="text-right py-1">Price</th>
                                  <th className="text-right py-1">Year</th>
                                  <th className="text-right py-1">Miles</th>
                                </tr>
                              </thead>
                              <tbody>
                                {profitSimV4.topComps.map((c: { title: string; price: number; year: number; mileage: number | null }, i: number) => (
                                  <tr key={i} className="border-b border-gray-50">
                                    <td className="py-1 text-gray-600 max-w-[160px] truncate">{c.title}</td>
                                    <td className="py-1 text-right font-medium text-gray-800">£{c.price?.toLocaleString()}</td>
                                    <td className="py-1 text-right text-gray-500">{c.year || '—'}</td>
                                    <td className="py-1 text-right text-gray-500">{c.mileage ? `${(c.mileage/1000).toFixed(0)}k` : '—'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* ── v3 Delta (shadow mode) ─────────────────────────── */}
                      {profitSimV4.v3ProfitMidDelta !== null && profitSimV4.v3ProfitMidDelta !== undefined && (
                        <p className="text-[10px] text-gray-400 italic text-center">
                          v4 vs v3 delta: {profitSimV4.v3ProfitMidDelta >= 0 ? '+' : ''}£{profitSimV4.v3ProfitMidDelta?.toLocaleString()}
                        </p>
                      )}
                    </div>
                  </details>
                </div>
              </div>
            ) : profitSim ? (
              /* ── Fallback: v3 Profit Simulation ─────────────────────────── */
              <div className="mt-4">
                <span className="text-xs text-gray-400 block mb-2">Profit Simulation (v3)</span>
                <div className={`rounded-lg p-4 ${
                  profitSim.profitRiskBand === 'green' ? 'bg-green-50 ring-1 ring-green-200' :
                  profitSim.profitRiskBand === 'amber' ? 'bg-amber-50 ring-1 ring-amber-200' :
                  'bg-red-50 ring-1 ring-red-200'
                }`}>
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <div className="text-center">
                      <p className="text-xs text-gray-500">Profit (Min)</p>
                      <p className={`text-sm font-bold ${profitSim.expectedProfitMin < 0 ? 'text-red-700' : 'text-green-700'}`}>
                        £{profitSim.expectedProfitMin?.toLocaleString()}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500">Profit (Mid)</p>
                      <p className={`text-lg font-bold ${profitSim.expectedProfitMid < 0 ? 'text-red-700' : 'text-green-700'}`}>
                        £{profitSim.expectedProfitMid?.toLocaleString()}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500">Profit (Max)</p>
                      <p className={`text-sm font-bold ${profitSim.expectedProfitMax < 0 ? 'text-red-700' : 'text-green-700'}`}>
                        £{profitSim.expectedProfitMax?.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Est. Resale: £{profitSim.estimatedRetail?.toLocaleString()}</span>
                    <span>Recon: £{profitSim.reconEstimate?.toLocaleString()}</span>
                    <span>Sell cost: {((profitSim.sellCostPct ?? 0.05) * 100).toFixed(0)}%</span>
                  </div>
                  <p className="mt-1 text-[10px] text-gray-400 italic">
                    v3 baseline — 20% dealer markup. v4 not yet computed for this lead.
                  </p>
                  {profitSim.guardrailTriggered && (
                    <p className="mt-2 text-xs text-red-700 font-medium">
                      ⚠ Guardrail: {profitSim.guardrailReason}
                    </p>
                  )}
                </div>
              </div>
            ) : null}
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
            currentActualPurchase={lead.actual_purchase_price ?? null}
            currentActualResale={lead.actual_resale_price ?? null}
            currentReconCost={lead.actual_recon_cost ?? null}
            currentDaysToSale={lead.days_to_sale ?? null}
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

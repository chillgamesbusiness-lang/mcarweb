'use client'

import type {
  AcquisitionKPIs, ProfitKPIs, RiskKPIs, WeeklyTrend,
  ExposureKPIs, DecayKPIs, ShadowKPIs, WeeklySummary,
} from '@/lib/kpiAggregation'

// ── Types ──────────────────────────────────────────────────────────────────────

interface DashboardProps {
  acquisition: AcquisitionKPIs
  profit: ProfitKPIs
  risk: RiskKPIs
  weeklyTrends: WeeklyTrend[]
  exposure: ExposureKPIs
  decay: DecayKPIs
  shadow: ShadowKPIs
  weeklySummary: WeeklySummary
  quickStats: { label: string; value: number }[]
  gitHash: string
}

// ── Helpers ────────────────────────────────────────────────────────────────────

type Signal = 'green' | 'amber' | 'red'

function signalAbove(val: number, greenAbove: number, amberAbove: number): Signal {
  if (val >= greenAbove) return 'green'
  if (val >= amberAbove) return 'amber'
  return 'red'
}

function StatusDot({ status }: { status: Signal }) {
  const color = status === 'green' ? 'bg-green-400' : status === 'amber' ? 'bg-amber-400' : 'bg-red-400'
  return <span className={`inline-block w-2.5 h-2.5 rounded-full ${color}`} />
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════

export default function DashboardClient(props: DashboardProps) {
  const { acquisition, profit, weeklySummary, quickStats } = props

  const healthyProfit = profit.avgPredictedProfitMid > 200
  const goodAcceptance = acquisition.acceptanceRate >= 15
  const overallStatus: Signal = healthyProfit && goodAcceptance ? 'green' : healthyProfit || goodAcceptance ? 'amber' : 'red'

  return (
    <div className="p-6 lg:p-10 max-w-6xl">
      {/* Page header — premium with status indicator */}
      <div className="flex items-center gap-4 mb-10">
        <h1 className="text-3xl font-extrabold tracking-[-0.02em] text-charcoal-deep">Dashboard</h1>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface border border-warm-border">
          <StatusDot status={overallStatus} />
          <span className="text-[11px] font-semibold text-warm-gray uppercase tracking-wider">
            {overallStatus === 'green' ? 'Healthy' : overallStatus === 'amber' ? 'Attention' : 'Action Needed'}
          </span>
        </div>
      </div>

      {/* ── Hero KPI cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-5 mb-10">
        {quickStats.map((s, i) => (
          <div key={s.label} className="card-premium p-6 animate-slide-up" style={{ animationDelay: `${i * 80}ms` }}>
            <p className="text-4xl font-extrabold tracking-tight text-charcoal-deep">{s.value}</p>
            <p className="text-xs uppercase tracking-widest text-warm-gray mt-2 font-semibold">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Two-column asymmetric: profit + offers ───────────────── */}
      <div className="grid grid-cols-5 gap-6 mb-10">
        {/* Left — profit card, large & dominant */}
        <div className="col-span-3 card-premium p-7">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-8 h-8 rounded-xl gradient-gold flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-warm-gray">Profit</p>
          </div>
          <div className="mb-6">
            <p className="text-5xl font-extrabold tracking-tight gradient-gold-text leading-none">
              {profit.avgPredictedProfitMid >= 0 ? '£' : '−£'}{Math.abs(profit.avgPredictedProfitMid).toLocaleString()}
            </p>
            <p className="text-sm text-warm-gray mt-2">avg predicted per deal</p>
          </div>

          <div className="space-y-3 border-t border-warm-border/50 pt-5">
            <DataRow label="Avg realised profit" value={profit.avgRealisedProfit !== null ? `£${profit.avgRealisedProfit.toLocaleString()}` : '—'} />
            <DataRow label="Deals won" value={profit.totalWonDeals} />
            <DataRow label="Deals completed" value={profit.totalRealisedDeals} />
          </div>
        </div>

        {/* Right — offers card, compact */}
        <div className="col-span-2 card-premium p-7">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-8 h-8 rounded-xl bg-accent-blue/10 flex items-center justify-center">
              <svg className="w-4 h-4 text-accent-blue" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>
            </div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-warm-gray">Offers</p>
          </div>
          <div className="space-y-3">
            <DataRow label="This week" value={acquisition.offersThisWeek} />
            <DataRow label="Last week" value={acquisition.offersLastWeek} />
            {acquisition.offersThisWeek !== acquisition.offersLastWeek && (
              <DataRow
                label="Change"
                value={`${acquisition.offersThisWeek > acquisition.offersLastWeek ? '+' : ''}${acquisition.offersThisWeek - acquisition.offersLastWeek}`}
                highlight={acquisition.offersThisWeek >= acquisition.offersLastWeek ? 'green' : 'red'}
              />
            )}
            <DataRow label="Total all-time" value={acquisition.totalOffers} />
            <DataRow
              label="Acceptance rate"
              value={`${acquisition.acceptanceRate}%`}
              highlight={signalAbove(acquisition.acceptanceRate, 30, 15)}
            />
          </div>
        </div>
      </div>

      {/* ── Weekly summary — premium card ────────────────────── */}
      <div className="card-premium p-7 max-w-2xl">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-xl bg-accent-emerald/10 flex items-center justify-center">
            <svg className="w-4 h-4 text-accent-emerald" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" /></svg>
          </div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-warm-gray">This Week</p>
        </div>
        <p className="text-[15px] leading-relaxed text-charcoal-light">
          {weeklySummary.offersGenerated} offers generated
          {weeklySummary.acceptanceRate > 0 && `, ${weeklySummary.acceptanceRate}% accepted`}.
          {profit.avgRealisedProfit !== null
            ? ` Average profit so far: £${profit.avgRealisedProfit.toLocaleString()}.`
            : ' No completed deals yet this period.'}
        </p>
      </div>
    </div>
  )
}

// ── Simple data row — no cards, just clean label : value ─────────────────────

function DataRow({ label, value, highlight }: {
  label: string
  value: string | number
  highlight?: Signal
}) {
  const valClass =
    highlight === 'green' ? 'text-green-600 font-bold' :
    highlight === 'amber' ? 'text-amber-600 font-bold' :
    highlight === 'red' ? 'text-red-500 font-bold' :
    'text-charcoal-deep'

  return (
    <div className="flex items-baseline justify-between py-0.5">
      <span className="text-sm text-warm-gray">{label}</span>
      <span className={`text-sm font-semibold tabular-nums ${valClass}`}>{value}</span>
    </div>
  )
}

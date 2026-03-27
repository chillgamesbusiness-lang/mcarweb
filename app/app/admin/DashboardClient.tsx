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
    <div className="p-6 lg:p-10 max-w-5xl">
      {/* Page header — tight, editorial */}
      <div className="flex items-baseline gap-4 mb-10">
        <h1 className="text-3xl font-bold tracking-tight text-charcoal">Dashboard</h1>
        <StatusDot status={overallStatus} />
      </div>

      {/* ── Hero strip: 3 numbers on a clean line, no cards ───────── */}
      <div className="flex gap-12 mb-12 border-b border-warm-border pb-8">
        {quickStats.map((s) => (
          <div key={s.label}>
            <p className="text-4xl font-extrabold tracking-tight text-charcoal">{s.value}</p>
            <p className="text-xs uppercase tracking-widest text-warm-gray mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Two-column asymmetric: big profit block + offers sidebar ─── */}
      <div className="grid grid-cols-5 gap-10 mb-12">
        {/* Left — profit, large & dominant */}
        <div className="col-span-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-warm-gray mb-4">Profit</p>
          <div className="mb-6">
            <p className="text-5xl font-extrabold tracking-tight text-charcoal leading-none">
              {profit.avgPredictedProfitMid >= 0 ? '£' : '−£'}{Math.abs(profit.avgPredictedProfitMid).toLocaleString()}
            </p>
            <p className="text-sm text-warm-gray mt-2">avg predicted per deal</p>
          </div>

          <div className="space-y-3 border-t border-warm-border-light pt-5">
            <DataRow label="Avg realised profit" value={profit.avgRealisedProfit !== null ? `£${profit.avgRealisedProfit.toLocaleString()}` : '—'} />
            <DataRow label="Deals won" value={profit.totalWonDeals} />
            <DataRow label="Deals completed" value={profit.totalRealisedDeals} />
          </div>
        </div>

        {/* Right — offers, compact */}
        <div className="col-span-2 border-l border-warm-border pl-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-warm-gray mb-4">Offers</p>
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

      {/* ── Weekly summary — editorial paragraph, not a card ──────── */}
      <div className="max-w-lg">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-warm-gray mb-3">This Week</p>
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
    highlight === 'green' ? 'text-green-600' :
    highlight === 'amber' ? 'text-amber-600' :
    highlight === 'red' ? 'text-red-500' :
    'text-charcoal'

  return (
    <div className="flex items-baseline justify-between">
      <span className="text-sm text-warm-gray">{label}</span>
      <span className={`text-sm font-semibold tabular-nums ${valClass}`}>{value}</span>
    </div>
  )
}

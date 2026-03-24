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

  // Simple overall health
  const healthyProfit = profit.avgPredictedProfitMid > 200
  const goodAcceptance = acquisition.acceptanceRate >= 15
  const overallStatus: Signal = healthyProfit && goodAcceptance ? 'green' : healthyProfit || goodAcceptance ? 'amber' : 'red'
  const overallLabel = overallStatus === 'green' ? 'Looking Good' : overallStatus === 'amber' ? 'Needs Attention' : 'Action Needed'

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>

      {/* Overall status banner */}
      <div className={`rounded-xl px-5 py-4 flex items-center gap-3 shadow-sm ${
        overallStatus === 'green' ? 'bg-green-50 ring-1 ring-green-200' :
        overallStatus === 'amber' ? 'bg-amber-50 ring-1 ring-amber-200' :
        'bg-red-50 ring-1 ring-red-200'
      }`}>
        <StatusDot status={overallStatus} />
        <div>
          <p className={`font-semibold text-sm ${
            overallStatus === 'green' ? 'text-green-800' :
            overallStatus === 'amber' ? 'text-amber-800' : 'text-red-800'
          }`}>{overallLabel}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {weeklySummary.offersGenerated} offers this week
            {weeklySummary.acceptanceRate > 0 && ` · ${weeklySummary.acceptanceRate}% accepted`}
          </p>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-4">
        {quickStats.map(s => (
          <div key={s.label} className="bg-white rounded-xl shadow-sm ring-1 ring-gray-100 px-5 py-4">
            <p className="text-xs text-gray-400 mb-0.5">{s.label}</p>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Performance cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Offers card */}
        <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-100 p-5">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Offers</h2>
          <div className="space-y-3">
            <Row label="This week" value={acquisition.offersThisWeek} />
            <Row label="Last week" value={acquisition.offersLastWeek} />
            {acquisition.offersThisWeek !== acquisition.offersLastWeek && (
              <Row
                label="Change"
                value={`${acquisition.offersThisWeek > acquisition.offersLastWeek ? '+' : ''}${acquisition.offersThisWeek - acquisition.offersLastWeek}`}
                highlight={acquisition.offersThisWeek >= acquisition.offersLastWeek ? 'green' : 'red'}
              />
            )}
            <Row label="Total (all time)" value={acquisition.totalOffers} />
            <Row
              label="Acceptance rate"
              value={`${acquisition.acceptanceRate}%`}
              highlight={acquisition.acceptanceRate >= 30 ? 'green' : acquisition.acceptanceRate >= 15 ? 'amber' : 'red'}
            />
          </div>
        </div>

        {/* Profit card */}
        <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-100 p-5">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Profit</h2>
          <div className="space-y-3">
            <Row
              label="Avg expected profit"
              value={`£${profit.avgPredictedProfitMid.toLocaleString()}`}
              highlight={profit.avgPredictedProfitMid >= 300 ? 'green' : profit.avgPredictedProfitMid > 0 ? 'amber' : 'red'}
            />
            <Row
              label="Avg actual profit"
              value={profit.avgRealisedProfit !== null ? `£${profit.avgRealisedProfit.toLocaleString()}` : 'No data yet'}
            />
            <Row label="Deals won" value={profit.totalWonDeals} />
            <Row label="Deals completed" value={profit.totalRealisedDeals} />
          </div>
        </div>
      </div>

      {/* Weekly summary */}
      <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-100 p-5">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">This Week</h2>
        <p className="text-sm text-gray-700 leading-relaxed">
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

// ── Simple row component ───────────────────────────────────────────────────────

function Row({ label, value, highlight }: {
  label: string
  value: string | number
  highlight?: Signal
}) {
  const valClass =
    highlight === 'green' ? 'text-green-600' :
    highlight === 'amber' ? 'text-amber-600' :
    highlight === 'red' ? 'text-red-500' :
    'text-gray-900'

  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-500">{label}</span>
      <span className={`text-sm font-semibold ${valClass}`}>{value}</span>
    </div>
  )
}

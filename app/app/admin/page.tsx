import { createServiceClient } from '@/lib/supabase/server'
import { fetchDashboardKPIs } from '@/lib/kpiAggregation'
import type { AcquisitionKPIs, ProfitKPIs, RiskKPIs, WeeklyTrend } from '@/lib/kpiAggregation'

export default async function AdminDashboardPage() {
  const svc = createServiceClient()

  // Parallel: basic counts + full KPI aggregation
  const [
    { count: totalLeads },
    { count: newLeads },
    { count: todayAppointments },
    kpis,
  ] = await Promise.all([
    svc.from('leads').select('*', { count: 'exact', head: true }),
    svc.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'new'),
    svc
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'booked')
      .gte('start_at', new Date().toISOString().slice(0, 10))
      .lt('start_at', new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)),
    fetchDashboardKPIs(),
  ])

  const quickStats = [
    { label: 'Total Leads', value: totalLeads ?? 0 },
    { label: 'New (uncontacted)', value: newLeads ?? 0 },
    { label: "Today's Appointments", value: todayAppointments ?? 0 },
  ]

  return (
    <div className="p-8 max-w-7xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      {/* Quick stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {quickStats.map((s) => (
          <div key={s.label} className="bg-white rounded-lg border border-gray-200 p-5">
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className="mt-1 text-3xl font-bold text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>

      {/* KPI Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <AcquisitionPanel kpi={kpis.acquisition} />
        <ProfitPanel kpi={kpis.profit} />
        <RiskPanel kpi={kpis.risk} />
      </div>

      {/* Weekly Trend Table */}
      <WeeklyTrendTable trends={kpis.weeklyTrends} />

      {/* Engine Version */}
      <div className="mt-6 text-xs text-gray-400">
        Engine v3 · Build {process.env.NEXT_PUBLIC_GIT_COMMIT_HASH ?? 'dev'}
      </div>
    </div>
  )
}

// ── Acquisition KPIs Panel ─────────────────────────────────────────────────────

function AcquisitionPanel({ kpi }: { kpi: AcquisitionKPIs }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">
        Acquisition
      </h2>
      <div className="space-y-3">
        <KPIRow label="Offers this week" value={kpi.offersThisWeek} delta={kpi.offersThisWeek - kpi.offersLastWeek} />
        <KPIRow label="Total offers" value={kpi.totalOffers} />
        <KPIRow label="Acceptance rate" value={`${kpi.acceptanceRate}%`}
          color={kpi.acceptanceRate >= 30 ? 'green' : kpi.acceptanceRate >= 15 ? 'amber' : 'red'} />
        <KPIRow label="Manual review rate" value={`${kpi.manualReviewRate}%`}
          color={kpi.manualReviewRate <= 20 ? 'green' : kpi.manualReviewRate <= 40 ? 'amber' : 'red'} />
        <KPIRow label="Blocked rate" value={`${kpi.blockedRate}%`} />
        <KPIRow label="Avg confidence" value={kpi.avgConfidence} />
      </div>
    </div>
  )
}

// ── Profit KPIs Panel ──────────────────────────────────────────────────────────

function ProfitPanel({ kpi }: { kpi: ProfitKPIs }) {
  const profitColor = kpi.avgPredictedProfitMid >= 300 ? 'green'
    : kpi.avgPredictedProfitMid >= 0 ? 'amber' : 'red'

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">
        Profit
      </h2>
      <div className="space-y-3">
        <KPIRow label="Avg predicted profit (mid)" value={`£${kpi.avgPredictedProfitMid}`} color={profitColor} />
        <KPIRow
          label="Avg realised profit"
          value={kpi.avgRealisedProfit !== null ? `£${kpi.avgRealisedProfit}` : '—'}
          color={kpi.avgRealisedProfit !== null && kpi.avgRealisedProfit >= 300 ? 'green'
            : kpi.avgRealisedProfit !== null && kpi.avgRealisedProfit >= 0 ? 'amber' : undefined}
        />
        <KPIRow
          label="Profit variance"
          value={kpi.profitVariance !== null ? `${kpi.profitVariance > 0 ? '+' : ''}${kpi.profitVariance}%` : '—'}
          color={kpi.profitVariance !== null
            ? (Math.abs(kpi.profitVariance) <= 10 ? 'green' : Math.abs(kpi.profitVariance) <= 25 ? 'amber' : 'red')
            : undefined}
        />
        <KPIRow label="Guardrail triggers" value={`${kpi.guardrailTriggerPct}%`}
          color={kpi.guardrailTriggerPct <= 10 ? 'green' : kpi.guardrailTriggerPct <= 25 ? 'amber' : 'red'} />
        <KPIRow label="Won deals" value={kpi.totalWonDeals} />
        <KPIRow label="Realised deals" value={kpi.totalRealisedDeals} />
      </div>
    </div>
  )
}

// ── Risk KPIs Panel ────────────────────────────────────────────────────────────

function RiskPanel({ kpi }: { kpi: RiskKPIs }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">
        Risk
      </h2>
      <div className="space-y-3">
        <KPIRow label="Rollback blocked" value={`${kpi.rollbackBlockedPct}%`} />
        <KPIRow label="Dangerous defects" value={`${kpi.dangerousDefectPct}%`} />
        <KPIRow label="Avg recon % of trade" value={`${kpi.avgReconEstimatePct}%`}
          color={kpi.avgReconEstimatePct <= 10 ? 'green' : kpi.avgReconEstimatePct <= 20 ? 'amber' : 'red'} />
        <KPIRow
          label="Recon error %"
          value={kpi.reconErrorPct !== null ? `${kpi.reconErrorPct}%` : '—'}
        />
        <KPIRow label="Avg risk flags" value={kpi.avgRiskFlagCount} />
      </div>
    </div>
  )
}

// ── Weekly Trend Table ─────────────────────────────────────────────────────────

function WeeklyTrendTable({ trends }: { trends: WeeklyTrend[] }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
          Weekly Trends (8 weeks)
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-gray-500 text-xs uppercase tracking-wider">
              <th className="px-5 py-3">Week</th>
              <th className="px-5 py-3 text-right">Offers</th>
              <th className="px-5 py-3 text-right">Won</th>
              <th className="px-5 py-3 text-right">Lost</th>
              <th className="px-5 py-3 text-right">Manual Review</th>
              <th className="px-5 py-3 text-right">Win Rate</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {trends.map((t) => {
              const total = t.won + t.lost
              const winRate = total > 0 ? Math.round((t.won / total) * 100) : 0
              return (
                <tr key={t.weekLabel} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">{t.weekLabel}</td>
                  <td className="px-5 py-3 text-right text-gray-700">{t.offers}</td>
                  <td className="px-5 py-3 text-right text-green-700 font-medium">{t.won}</td>
                  <td className="px-5 py-3 text-right text-red-600">{t.lost}</td>
                  <td className="px-5 py-3 text-right text-yellow-700">{t.manualReview}</td>
                  <td className="px-5 py-3 text-right">
                    {total > 0 ? (
                      <span className={winRate >= 30 ? 'text-green-700 font-medium' : 'text-gray-500'}>
                        {winRate}%
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Shared KPI Row Component ───────────────────────────────────────────────────

function KPIRow({ label, value, delta, color }: {
  label: string
  value: string | number
  delta?: number
  color?: 'green' | 'amber' | 'red'
}) {
  const colorClass = color === 'green' ? 'text-green-700'
    : color === 'amber' ? 'text-yellow-700'
    : color === 'red' ? 'text-red-600'
    : 'text-gray-900'

  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-500">{label}</span>
      <div className="flex items-center gap-2">
        <span className={`text-sm font-semibold ${colorClass}`}>{value}</span>
        {delta !== undefined && delta !== 0 && (
          <span className={`text-xs ${delta > 0 ? 'text-green-600' : 'text-red-500'}`}>
            {delta > 0 ? '+' : ''}{delta}
          </span>
        )}
      </div>
    </div>
  )
}

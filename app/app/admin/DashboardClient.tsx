'use client'

import { useState, type ReactNode } from 'react'
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

// ── Signal helpers ─────────────────────────────────────────────────────────────

type Signal = 'green' | 'amber' | 'red'

function signal(val: number, greenBelow: number, amberBelow: number): Signal {
  if (val <= greenBelow) return 'green'
  if (val <= amberBelow) return 'amber'
  return 'red'
}

function signalAbove(val: number, greenAbove: number, amberAbove: number): Signal {
  if (val >= greenAbove) return 'green'
  if (val >= amberAbove) return 'amber'
  return 'red'
}

function SignalDot({ s }: { s: Signal }) {
  const color = s === 'green' ? '#22c55e' : s === 'amber' ? '#f59e0b' : '#ef4444'
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" className="inline-block">
      <circle cx="6" cy="6" r="5" fill={color} />
    </svg>
  )
}

// ── Premium card styling (softer shadows, no heavy borders) ────────────────────

function cardClass(highlight?: Signal) {
  const base = 'bg-white rounded-xl shadow-sm ring-1 ring-gray-100 p-5 transition-shadow hover:shadow-md'
  if (!highlight) return base
  const accent =
    highlight === 'green' ? 'ring-green-200' :
    highlight === 'amber' ? 'ring-amber-200' :
    'ring-red-200'
  return `${base} ${accent}`
}

// ── Smooth Expand / Collapse ───────────────────────────────────────────────────

function Expandable({ open, children }: { open: boolean; children: ReactNode }) {
  return (
    <div
      className="grid transition-all duration-300 ease-in-out"
      style={{ gridTemplateRows: open ? '1fr' : '0fr', opacity: open ? 1 : 0 }}
    >
      <div className="overflow-hidden">
        {children}
      </div>
    </div>
  )
}

function ShowDetailsBtn({ open, onClick }: { open: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="mt-3 inline-flex items-center gap-1 text-xs text-gray-400 hover:text-blue-600 transition-colors font-medium"
    >
      <svg
        className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
        fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
      {open ? 'Hide Details' : 'Show Details'}
    </button>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRACK 1 ① — Business Status Banner  (green / amber / red)
// ═══════════════════════════════════════════════════════════════════════════════

function BusinessBanner({
  acquisition, profit, exposure, weeklySummary,
}: {
  acquisition: AcquisitionKPIs
  profit: ProfitKPIs
  exposure: ExposureKPIs
  weeklySummary: WeeklySummary
}) {
  const marginOk      = profit.avgPredictedProfitMid > 200
  const pct = exposure.maxTotalCapital > 0
    ? (exposure.totalCapital / exposure.maxTotalCapital) * 100 : 0
  const exposureOk    = pct < 80
  const manualOk      = acquisition.manualReviewRate < 30
  const calibrationOk = weeklySummary.calibrationSampleSize >= 10

  const passing = [marginOk, exposureOk, manualOk, calibrationOk].filter(Boolean).length
  const status: Signal = passing === 4 ? 'green' : passing >= 2 ? 'amber' : 'red'

  const label = status === 'green' ? 'Healthy' : status === 'amber' ? 'Monitor' : 'Action Required'
  const bg = status === 'green'
    ? 'bg-gradient-to-r from-green-500 to-green-600'
    : status === 'amber'
    ? 'bg-gradient-to-r from-amber-500 to-amber-600'
    : 'bg-gradient-to-r from-red-500 to-red-600'

  return (
    <div className={`${bg} rounded-xl px-5 py-3.5 flex items-center justify-between shadow-sm`}>
      <div className="flex items-center gap-3">
        <span className="text-white text-lg"><SignalDot s={status} /></span>
        <div>
          <p className="text-white font-semibold text-sm">Business Status: {label}</p>
          <p className="text-white/75 text-xs leading-relaxed">
            {passing}/4 checks OK
            {!marginOk && ' · Low margin'}
            {!exposureOk && ' · High exposure'}
            {!manualOk && ' · Manual spike'}
            {!calibrationOk && ' · Low calibration'}
          </p>
        </div>
      </div>
      <span className="text-white/50 text-[10px] hidden sm:block uppercase tracking-wider">System check</span>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRACK 1 ③ — Weekly Executive Summary (one sentence)
// ═══════════════════════════════════════════════════════════════════════════════

function ExecutiveSummary({ summary, exposure }: { summary: WeeklySummary; exposure: ExposureKPIs }) {
  const pct = exposure.maxTotalCapital > 0
    ? Math.round((exposure.totalCapital / exposure.maxTotalCapital) * 100) : 0
  const profitStr = summary.avgRealisedProfit !== null
    ? `£${summary.avgRealisedProfit} avg profit`
    : 'no realised profit yet'

  const sentence =
    `This week: ${summary.offersGenerated} offers, ` +
    `${summary.acceptanceRate}% accepted, ` +
    `${profitStr}, ` +
    `${summary.liabilityBlocks} liability blocks prevented, ` +
    `exposure at ${pct}% capacity.`

  return (
    <div className={cardClass()}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-300 mb-2">Weekly Executive Summary</p>
      <p className="text-sm text-gray-700 leading-relaxed">{sentence}</p>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN DASHBOARD — compact front view + advanced behind toggle
// ═══════════════════════════════════════════════════════════════════════════════

export default function DashboardClient(props: DashboardProps) {
  const { acquisition, profit, risk, exposure, decay, shadow, weeklySummary, weeklyTrends, quickStats, gitHash } = props
  const [showAdvanced, setShowAdvanced] = useState(false)

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
        <span className="text-[10px] text-gray-300 font-mono">{gitHash}</span>
      </div>

      {/* ① Business Status Banner */}
      <BusinessBanner
        acquisition={acquisition}
        profit={profit}
        exposure={exposure}
        weeklySummary={weeklySummary}
      />

      {/* Quick stats — soft pills */}
      <div className="grid grid-cols-3 gap-4">
        {quickStats.map(s => (
          <div key={s.label} className="bg-white rounded-xl shadow-sm ring-1 ring-gray-100 px-5 py-4">
            <p className="text-[10px] text-gray-300 uppercase tracking-wide mb-0.5">{s.label}</p>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>

      {/* ② 5 Core Signals — compact front view (3-col) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <AcquisitionSignal kpi={acquisition} />
        <ProfitSignal kpi={profit} />
        <RiskSignal kpi={risk} exposure={exposure} weeklySummary={weeklySummary} />
      </div>

      {/* ③ Weekly Executive Summary */}
      <ExecutiveSummary summary={weeklySummary} exposure={exposure} />

      {/* Advanced cards — commented out (Shadow, Exposure, Decay, Weekly Trends) */}
      {/*
      <div className="text-center pt-1">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-blue-600 transition-colors font-medium"
        >
          <svg
            className={`w-4 h-4 transition-transform duration-200 ${showAdvanced ? 'rotate-90' : ''}`}
            fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          {showAdvanced ? 'Hide Advanced Details' : 'Show Advanced Details'}
        </button>
      </div>

      <Expandable open={showAdvanced}>
        <div className="space-y-4 pb-1">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <ShadowCard kpi={shadow} />
            <ExposureCard kpi={exposure} />
            <DecayCard kpi={decay} />
          </div>
          <WeeklyTrendsCard trends={weeklyTrends} summary={weeklySummary} />
        </div>
      </Expandable>
      */}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SIGNAL CARDS — No multipliers, segments, coefficients.  Just signals.
// ═══════════════════════════════════════════════════════════════════════════════

function AcquisitionSignal({ kpi }: { kpi: AcquisitionKPIs }) {
  const [open, setOpen] = useState(false)
  const delta = kpi.offersThisWeek - kpi.offersLastWeek
  const sig = signalAbove(kpi.acceptanceRate, 30, 15)

  return (
    <div className={cardClass(sig)}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Acquisition</h2>
        <SignalDot s={sig} />
      </div>
      <div className="space-y-2.5">
        <MetricRow label="Offers this week" value={kpi.offersThisWeek}
          badge={delta !== 0 ? `${delta > 0 ? '+' : ''}${delta}` : undefined}
          badgeColor={delta > 0 ? 'green' : delta < 0 ? 'amber' : undefined} />
        <MetricRow label="Acceptance %" value={`${kpi.acceptanceRate}%`} signal={sig} />
        <MetricRow label="Manual review %" value={`${kpi.manualReviewRate}%`}
          signal={signal(kpi.manualReviewRate, 20, 40)} />
        <MetricRow label="Blocked %" value={`${kpi.blockedRate}%`}
          signal={kpi.blockedRate > 15 ? 'red' : kpi.blockedRate > 5 ? 'amber' : undefined} />
      </div>

      <ShowDetailsBtn open={open} onClick={() => setOpen(!open)} />
      <Expandable open={open}>
        <div className="mt-3 pt-3 border-t border-gray-50 space-y-1.5">
          <DetailRow label="Total offers (all time)" value={kpi.totalOffers} />
          <DetailRow label="Last week offers" value={kpi.offersLastWeek} />
          <DetailRow label="Avg confidence" value={kpi.avgConfidence} />
        </div>
      </Expandable>
    </div>
  )
}

function ProfitSignal({ kpi }: { kpi: ProfitKPIs }) {
  const [open, setOpen] = useState(false)
  const sig = signalAbove(kpi.avgPredictedProfitMid, 300, 0)

  const marginPct = kpi.avgRealisedProfit !== null && kpi.avgPredictedProfitMid > 0
    ? Math.round((kpi.avgRealisedProfit / kpi.avgPredictedProfitMid) * 100) : null

  return (
    <div className={cardClass(sig)}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Profit</h2>
        <SignalDot s={sig} />
      </div>
      <div className="space-y-2.5">
        <MetricRow label="Avg predicted profit" value={`£${kpi.avgPredictedProfitMid}`} signal={sig} />
        <MetricRow label="Avg realised profit"
          value={kpi.avgRealisedProfit !== null ? `£${kpi.avgRealisedProfit}` : '—'} />
        <MetricRow label="Margin %"
          value={marginPct !== null ? `${marginPct}%` : '—'}
          signal={marginPct !== null ? (marginPct >= 80 ? 'green' : marginPct >= 50 ? 'amber' : 'red') : undefined} />
        <MetricRow label="Guardrail triggers %" value={`${kpi.guardrailTriggerPct}%`}
          signal={signal(kpi.guardrailTriggerPct, 10, 25)} />
      </div>

      <ShowDetailsBtn open={open} onClick={() => setOpen(!open)} />
      <Expandable open={open}>
        <div className="mt-3 pt-3 border-t border-gray-50 space-y-1.5">
          <DetailRow label="Won deals" value={kpi.totalWonDeals} />
          <DetailRow label="Realised deals" value={kpi.totalRealisedDeals} />
          <DetailRow label="Profit variance"
            value={kpi.profitVariance !== null ? `${kpi.profitVariance > 0 ? '+' : ''}${kpi.profitVariance}%` : 'n/a'} />
        </div>
      </Expandable>
    </div>
  )
}

function RiskSignal({ kpi, exposure, weeklySummary }: {
  kpi: RiskKPIs; exposure: ExposureKPIs; weeklySummary: WeeklySummary
}) {
  const [open, setOpen] = useState(false)
  const sig = signal(kpi.avgRiskFlagCount, 2, 4)

  const exposurePct = exposure.maxTotalCapital > 0
    ? Math.round((exposure.totalCapital / exposure.maxTotalCapital) * 100) : 0

  return (
    <div className={cardClass(sig)}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Risk</h2>
        <SignalDot s={sig} />
      </div>
      <div className="space-y-2.5">
        <MetricRow label="Recon error %"
          value={kpi.reconErrorPct !== null ? `${kpi.reconErrorPct}%` : 'No data'}
          signal={kpi.reconErrorPct !== null ? signal(kpi.reconErrorPct, 10, 25) : undefined} />
        <MetricRow label="Exposure utilisation" value={`${exposurePct}%`}
          signal={exposurePct >= 80 ? 'red' : exposurePct >= 60 ? 'amber' : 'green'} />
        <MetricRow label="Confidence floor %" value={`${weeklySummary.avgConfidence}%`}
          signal={signalAbove(weeklySummary.avgConfidence, 70, 50)} />
      </div>

      <ShowDetailsBtn open={open} onClick={() => setOpen(!open)} />
      <Expandable open={open}>
        <div className="mt-3 pt-3 border-t border-gray-50 space-y-1.5">
          <DetailRow label="Rollback blocked %" value={`${kpi.rollbackBlockedPct}%`} />
          <DetailRow label="Dangerous defect %" value={`${kpi.dangerousDefectPct}%`} />
          <DetailRow label="Avg recon % of trade" value={`${kpi.avgReconEstimatePct}%`} />
          <DetailRow label="Avg risk flags" value={kpi.avgRiskFlagCount} />
        </div>
      </Expandable>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADVANCED CARDS (behind "Show Advanced Details")
// ═══════════════════════════════════════════════════════════════════════════════

function ShadowCard({ kpi }: { kpi: ShadowKPIs }) {
  if (!kpi.hasCandidiate) {
    return (
      <div className={cardClass()}>
        <h2 className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-2">Shadow vs Active</h2>
        <p className="text-sm text-gray-300">No candidate in shadow mode</p>
      </div>
    )
  }

  const sig: Signal = Math.abs(kpi.avgDeltaPct) > 8 ? 'red' : Math.abs(kpi.avgDeltaPct) > 4 ? 'amber' : 'green'

  return (
    <div className={cardClass(sig)}>
      <h2 className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-3">Shadow vs Active</h2>
      <div className="space-y-1.5">
        <DetailRow label="Comparisons" value={kpi.comparisonCount} />
        <DetailRow label="Avg delta" value={`${kpi.avgDeltaPct > 0 ? '+' : ''}${kpi.avgDeltaPct}%`} />
        <DetailRow label="Would increase" value={kpi.wouldIncrease} />
        <DetailRow label="Would decrease" value={kpi.wouldDecrease} />
      </div>
    </div>
  )
}

function ExposureCard({ kpi }: { kpi: ExposureKPIs }) {
  const [open, setOpen] = useState(false)
  const pct = kpi.maxTotalCapital > 0 ? Math.round((kpi.totalCapital / kpi.maxTotalCapital) * 100) : 0
  const sig: Signal = pct >= 80 ? 'red' : pct >= 60 ? 'amber' : 'green'

  return (
    <div className={cardClass(sig)}>
      <h2 className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-3">Exposure</h2>
      <div className="space-y-1.5">
        <DetailRow label="Open capital" value={`£${kpi.totalCapital.toLocaleString()}`} />
        <DetailRow label="Utilisation" value={`${pct}%`} />
      </div>

      {/* Mini utilisation bar */}
      <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            pct >= 80 ? 'bg-red-400' : pct >= 60 ? 'bg-amber-400' : 'bg-green-400'
          }`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <p className="text-[10px] text-gray-300 mt-1 text-right">
        £{kpi.totalCapital.toLocaleString()} / £{kpi.maxTotalCapital.toLocaleString()}
      </p>

      <ShowDetailsBtn open={open} onClick={() => setOpen(!open)} />
      <Expandable open={open}>
        <div className="mt-3 pt-3 border-t border-gray-50 space-y-1.5">
          <DetailRow label="Open positions" value={kpi.totalOpenPositions} />
          <DetailRow label="Model breaches" value={kpi.sameModelBreaches} />
          <DetailRow label="EV open" value={kpi.evConcentration} />
          <DetailRow label="Old diesel open" value={kpi.oldDieselConcentration} />

          {kpi.segmentDistribution.length > 0 && (
            <div className="mt-2">
              <p className="text-[10px] font-semibold text-gray-400 mb-1 uppercase tracking-wide">Segment</p>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-300">
                    <th className="text-left py-0.5">Segment</th>
                    <th className="text-right py-0.5">Qty</th>
                    <th className="text-right py-0.5">Capital</th>
                  </tr>
                </thead>
                <tbody>
                  {kpi.segmentDistribution.map(s => (
                    <tr key={s.segment} className="border-t border-gray-50">
                      <td className="py-0.5 text-gray-500">{s.segment}</td>
                      <td className="text-right text-gray-500">{s.count}</td>
                      <td className="text-right text-gray-500">£{s.capital.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {kpi.positions.length > 0 && (
            <div className="mt-2">
              <p className="text-[10px] font-semibold text-gray-400 mb-1 uppercase tracking-wide">Positions</p>
              <div className="max-h-36 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-gray-300">
                      <th className="text-left py-0.5">Vehicle</th>
                      <th className="text-right py-0.5">Year</th>
                      <th className="text-right py-0.5">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kpi.positions.map((p, i) => (
                      <tr key={i} className="border-t border-gray-50">
                        <td className="py-0.5 text-gray-500">{p.make} {p.model}</td>
                        <td className="text-right text-gray-500">{p.year}</td>
                        <td className="text-right text-gray-500">£{p.price.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </Expandable>
    </div>
  )
}

function DecayCard({ kpi }: { kpi: DecayKPIs }) {
  const [open, setOpen] = useState(false)
  const sig = signal(kpi.decayPct, 10, 25)

  return (
    <div className={cardClass(sig)}>
      <h2 className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-3">Confidence Decay</h2>
      <p className="text-sm text-gray-600">
        Elevated floor on <span className="font-semibold text-gray-900">{kpi.decayPct}%</span> of quotes
        <span className="text-gray-300 text-xs ml-1">({kpi.totalSnapshotsWithDecay}/{kpi.totalSnapshots})</span>
      </p>

      <ShowDetailsBtn open={open} onClick={() => setOpen(!open)} />
      <Expandable open={open}>
        <div className="mt-3 pt-3 border-t border-gray-50 space-y-1.5">
          {kpi.byReason.length > 0 ? (
            kpi.byReason.map(r => <DetailRow key={r.reason} label={r.reason} value={r.count} />)
          ) : (
            <p className="text-xs text-gray-300">No decay triggers recorded</p>
          )}
        </div>
      </Expandable>
    </div>
  )
}

function WeeklyTrendsCard({ trends, summary }: { trends: WeeklyTrend[]; summary: WeeklySummary }) {
  return (
    <div className={cardClass()}>
      <h2 className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-3">8-Week Trend</h2>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <MiniStat label="Offers" value={summary.offersGenerated} />
        <MiniStat label="Acceptance" value={`${summary.acceptanceRate}%`} />
        <MiniStat label="Manual reviews" value={summary.manualReviewCount} />
        <MiniStat label="Calibration" value={summary.calibrationSampleSize} />
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-xs">
          <thead>
            <tr className="text-gray-300 uppercase tracking-wider text-[10px]">
              <th className="text-left py-1.5 pr-3">Week</th>
              <th className="text-right py-1.5 px-2">Offers</th>
              <th className="text-right py-1.5 px-2">Won</th>
              <th className="text-right py-1.5 px-2">Lost</th>
              <th className="text-right py-1.5 px-2">Manual</th>
              <th className="text-right py-1.5 px-2">Win&nbsp;%</th>
            </tr>
          </thead>
          <tbody>
            {trends.map(t => {
              const total = t.won + t.lost
              const winRate = total > 0 ? Math.round((t.won / total) * 100) : 0
              return (
                <tr key={t.weekLabel} className="border-t border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="py-1.5 pr-3 font-medium text-gray-500">{t.weekLabel}</td>
                  <td className="text-right px-2 text-gray-500">{t.offers}</td>
                  <td className="text-right px-2 text-green-600">{t.won}</td>
                  <td className="text-right px-2 text-amber-600">{t.lost}</td>
                  <td className="text-right px-2 text-gray-400">{t.manualReview}</td>
                  <td className="text-right px-2">
                    {total > 0 ? (
                      <span className={winRate >= 30 ? 'text-green-600 font-medium' : 'text-gray-400'}>
                        {winRate}%
                      </span>
                    ) : (
                      <span className="text-gray-200">—</span>
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

// ═══════════════════════════════════════════════════════════════════════════════
// Primitives — clean, minimal, premium feel
// ═══════════════════════════════════════════════════════════════════════════════

function MetricRow({ label, value, signal: sig, badge, badgeColor }: {
  label: string
  value: string | number
  signal?: Signal
  badge?: string
  badgeColor?: Signal
}) {
  const valCls =
    sig === 'green' ? 'text-green-600' :
    sig === 'amber' ? 'text-amber-600' :
    sig === 'red' ? 'text-red-500' :
    'text-gray-900'

  const badgeCls =
    badgeColor === 'green' ? 'bg-green-50 text-green-600' :
    badgeColor === 'amber' ? 'bg-amber-50 text-amber-600' :
    badgeColor === 'red' ? 'bg-red-50 text-red-500' :
    'bg-gray-50 text-gray-400'

  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-gray-400">{label}</span>
      <div className="flex items-center gap-2">
        <span className={`text-sm font-semibold ${valCls}`}>{value}</span>
        {badge && (
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${badgeCls}`}>{badge}</span>
        )}
      </div>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-gray-400">{label}</span>
      <span className="text-gray-600 font-medium">{value}</span>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-[10px] text-gray-300 uppercase tracking-wide">{label}</p>
      <p className="text-sm font-semibold text-gray-800">{value}</p>
    </div>
  )
}

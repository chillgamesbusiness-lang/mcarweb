'use client'

import { useState } from 'react'
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

function dot(s: Signal) {
  return s === 'green' ? '🟢' : s === 'amber' ? '🟠' : '🔴'
}

function signalBorder(s: Signal) {
  return s === 'green' ? 'border-green-200' : s === 'amber' ? 'border-yellow-200' : 'border-red-200'
}

function signalBg(s: Signal) {
  return s === 'green' ? 'bg-green-50' : s === 'amber' ? 'bg-yellow-50' : 'bg-red-50'
}

// ── Toggle Button ──────────────────────────────────────────────────────────────

function ToggleBtn({ open, onClick }: { open: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-xs text-gray-400 hover:text-gray-700 transition-colors font-medium"
    >
      {open ? '▾ Hide Details' : '▸ Show Details'}
    </button>
  )
}

// ── Main Dashboard Component ───────────────────────────────────────────────────

export default function DashboardClient(props: DashboardProps) {
  const { acquisition, profit, risk, exposure, decay, shadow, weeklySummary, weeklyTrends, quickStats, gitHash } = props

  // Compute top-line signals
  const acqSignal = signalAbove(acquisition.acceptanceRate, 30, 15)
  const profitSignal = signalAbove(profit.avgPredictedProfitMid, 300, 0)
  const riskSignal = signal(risk.avgRiskFlagCount, 2, 4)
  const exposureSignal = exposure.totalCapital >= 150_000 ? 'red' as Signal
    : exposure.totalCapital >= 100_000 ? 'amber' as Signal : 'green' as Signal
  const decaySignal = signal(decay.decayPct, 10, 25)
  const shadowSignal: Signal = !shadow.hasCandidiate ? 'green'
    : Math.abs(shadow.avgDeltaPct) > 8 ? 'red'
    : Math.abs(shadow.avgDeltaPct) > 4 ? 'amber' : 'green'

  return (
    <div className="p-6 max-w-7xl space-y-5">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
        <span className="text-xs text-gray-400">Engine v3.1 · {gitHash}</span>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3">
        {quickStats.map(s => (
          <div key={s.label} className="bg-white rounded border border-gray-200 px-4 py-3">
            <p className="text-xs text-gray-400">{s.label}</p>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>

      {/* 3-column compact signal row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <AcquisitionCard kpi={acquisition} sig={acqSignal} />
        <ProfitCard kpi={profit} sig={profitSignal} />
        <RiskCard kpi={risk} sig={riskSignal} />
      </div>

      {/* Bottom row: Shadow, Exposure, Decay */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <ShadowCard kpi={shadow} sig={shadowSignal} />
        <ExposureCard kpi={exposure} sig={exposureSignal} />
        <DecayCard kpi={decay} sig={decaySignal} />
      </div>

      {/* Weekly Summary */}
      <WeeklySummaryCard summary={weeklySummary} trends={weeklyTrends} />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// CARD COMPONENTS — Compact first, detail behind toggle
// ═══════════════════════════════════════════════════════════════════════════════

// ── Acquisition Card ───────────────────────────────────────────────────────────

function AcquisitionCard({ kpi, sig }: { kpi: AcquisitionKPIs; sig: Signal }) {
  const [open, setOpen] = useState(false)
  const delta = kpi.offersThisWeek - kpi.offersLastWeek

  return (
    <div className={`bg-white rounded-lg border ${signalBorder(sig)} p-4`}>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Acquisition</h2>
        <span className="text-lg">{dot(sig)}</span>
      </div>
      {/* Compact */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <Stat label="This week" value={kpi.offersThisWeek} suffix={delta !== 0 ? ` (${delta > 0 ? '+' : ''}${delta})` : ''} />
        <Stat label="Acceptance" value={`${kpi.acceptanceRate}%`} color={signalAbove(kpi.acceptanceRate, 30, 15)} />
        <Stat label="Manual" value={`${kpi.manualReviewRate}%`} color={signal(kpi.manualReviewRate, 20, 40)} />
        <Stat label="Blocked" value={`${kpi.blockedRate}%`} />
      </div>

      <div className="mt-2"><ToggleBtn open={open} onClick={() => setOpen(!open)} /></div>

      {open && (
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-1 text-sm text-gray-600">
          <Row label="Total offers (all time)" value={kpi.totalOffers} />
          <Row label="Last week offers" value={kpi.offersLastWeek} />
          <Row label="Avg confidence" value={kpi.avgConfidence} />
        </div>
      )}
    </div>
  )
}

// ── Profit Card ────────────────────────────────────────────────────────────────

function ProfitCard({ kpi, sig }: { kpi: ProfitKPIs; sig: Signal }) {
  const [open, setOpen] = useState(false)

  return (
    <div className={`bg-white rounded-lg border ${signalBorder(sig)} p-4`}>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Profit</h2>
        <span className="text-lg">{dot(sig)}</span>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <Stat label="Predicted (mid)" value={`£${kpi.avgPredictedProfitMid}`} color={signalAbove(kpi.avgPredictedProfitMid, 300, 0)} />
        <Stat label="Realised" value={kpi.avgRealisedProfit !== null ? `£${kpi.avgRealisedProfit}` : '—'} />
        <Stat label="Variance" value={kpi.profitVariance !== null ? `${kpi.profitVariance > 0 ? '+' : ''}${kpi.profitVariance}%` : '—'}
          color={kpi.profitVariance !== null ? (Math.abs(kpi.profitVariance) <= 10 ? 'green' : Math.abs(kpi.profitVariance) <= 25 ? 'amber' : 'red') : undefined} />
        <Stat label="Guardrail" value={`${kpi.guardrailTriggerPct}%`} color={signal(kpi.guardrailTriggerPct, 10, 25)} />
      </div>

      <div className="mt-2"><ToggleBtn open={open} onClick={() => setOpen(!open)} /></div>

      {open && (
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-1 text-sm text-gray-600">
          <Row label="Won deals" value={kpi.totalWonDeals} />
          <Row label="Realised deals" value={kpi.totalRealisedDeals} />
          <Row label="Profit variance" value={kpi.profitVariance !== null ? `${kpi.profitVariance}%` : 'n/a'} />
        </div>
      )}
    </div>
  )
}

// ── Risk Card ──────────────────────────────────────────────────────────────────

function RiskCard({ kpi, sig }: { kpi: RiskKPIs; sig: Signal }) {
  const [open, setOpen] = useState(false)

  return (
    <div className={`bg-white rounded-lg border ${signalBorder(sig)} p-4`}>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Risk</h2>
        <span className="text-lg">{dot(sig)}</span>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <Stat label="Rollback blocked" value={`${kpi.rollbackBlockedPct}%`} />
        <Stat label="Dangerous" value={`${kpi.dangerousDefectPct}%`} />
        <Stat label="Recon % trade" value={`${kpi.avgReconEstimatePct}%`} color={signal(kpi.avgReconEstimatePct, 10, 20)} />
        <Stat label="Avg flags" value={kpi.avgRiskFlagCount} />
      </div>

      <div className="mt-2"><ToggleBtn open={open} onClick={() => setOpen(!open)} /></div>

      {open && (
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-1 text-sm text-gray-600">
          <Row label="Recon error %" value={kpi.reconErrorPct !== null ? `${kpi.reconErrorPct}%` : 'no data'} />
        </div>
      )}
    </div>
  )
}

// ── Shadow vs Active Card ──────────────────────────────────────────────────────

function ShadowCard({ kpi, sig }: { kpi: ShadowKPIs; sig: Signal }) {
  const [open, setOpen] = useState(false)

  if (!kpi.hasCandidiate) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Shadow vs Active</h2>
          <span className="text-lg">🟢</span>
        </div>
        <p className="text-sm text-gray-400">No candidate in shadow mode</p>
        {kpi.currentVersion && (
          <p className="text-xs text-gray-300 mt-1">Active: {kpi.currentVersion}</p>
        )}
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg border ${signalBorder(sig)} p-4`}>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Shadow vs Active</h2>
        <span className="text-lg">{dot(sig)}</span>
      </div>
      {/* Compact */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <Stat label="Comparisons" value={kpi.comparisonCount} />
        <Stat label="Avg delta" value={`${kpi.avgDeltaPct > 0 ? '+' : ''}${kpi.avgDeltaPct}%`}
          color={Math.abs(kpi.avgDeltaPct) <= 4 ? 'green' : Math.abs(kpi.avgDeltaPct) <= 8 ? 'amber' : 'red'} />
        <Stat label="↑ increase" value={kpi.wouldIncrease} />
        <Stat label="↓ decrease" value={kpi.wouldDecrease} />
      </div>

      <div className="mt-2"><ToggleBtn open={open} onClick={() => setOpen(!open)} /></div>

      {open && (
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-1 text-sm text-gray-600">
          <Row label="Active version" value={kpi.currentVersion ?? '—'} />
          <Row label="Candidate version" value={kpi.candidateVersion ?? '—'} />
          <Row label="Max delta" value={`±${kpi.maxDeltaPct}%`} />
          <Row label="No change" value={kpi.noChange} />
        </div>
      )}
    </div>
  )
}

// ── Exposure Cap Card ──────────────────────────────────────────────────────────

function ExposureCard({ kpi, sig }: { kpi: ExposureKPIs; sig: Signal }) {
  const [open, setOpen] = useState(false)
  const pct = kpi.maxTotalCapital > 0 ? Math.round((kpi.totalCapital / kpi.maxTotalCapital) * 100) : 0

  return (
    <div className={`bg-white rounded-lg border ${signalBorder(sig)} p-4`}>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Exposure</h2>
        <span className="text-lg">{dot(sig)}</span>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <Stat label="Open capital" value={`£${kpi.totalCapital.toLocaleString()}`} />
        <Stat label="Utilisation" value={`${pct}%`}
          color={pct >= 100 ? 'red' : pct >= 67 ? 'amber' : 'green'} />
        <Stat label="Model breaches" value={kpi.sameModelBreaches} color={kpi.sameModelBreaches > 0 ? 'red' : 'green'} />
        <Stat label="EV open" value={kpi.evConcentration} color={kpi.evConcentration >= 5 ? 'amber' : 'green'} />
      </div>

      {/* Mini bar */}
      <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-red-500' : pct >= 67 ? 'bg-yellow-400' : 'bg-green-400'}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <p className="text-[10px] text-gray-400 mt-0.5 text-right">
        £{kpi.totalCapital.toLocaleString()} / £{kpi.maxTotalCapital.toLocaleString()}
      </p>

      <ToggleBtn open={open} onClick={() => setOpen(!open)} />

      {open && (
        <div className="mt-3 pt-3 border-t border-gray-100 text-sm text-gray-600 space-y-3">
          <Row label="Total open positions" value={kpi.totalOpenPositions} />
          <Row label="Old diesel open" value={kpi.oldDieselConcentration} />

          {/* Segment distribution */}
          {kpi.segmentDistribution.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-1">Segment Distribution</p>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-400">
                    <th className="text-left py-0.5">Segment</th>
                    <th className="text-right py-0.5">Count</th>
                    <th className="text-right py-0.5">Capital</th>
                  </tr>
                </thead>
                <tbody>
                  {kpi.segmentDistribution.map(s => (
                    <tr key={s.segment} className="border-t border-gray-50">
                      <td className="py-0.5">{s.segment}</td>
                      <td className="text-right">{s.count}</td>
                      <td className="text-right">£{s.capital.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Open positions list */}
          {kpi.positions.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-1">Open Positions</p>
              <div className="max-h-40 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-gray-400">
                      <th className="text-left py-0.5">Vehicle</th>
                      <th className="text-right py-0.5">Year</th>
                      <th className="text-right py-0.5">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kpi.positions.map((p, i) => (
                      <tr key={i} className="border-t border-gray-50">
                        <td className="py-0.5">{p.make} {p.model} ({p.fuel})</td>
                        <td className="text-right">{p.year}</td>
                        <td className="text-right">£{p.price.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Confidence Decay Card ──────────────────────────────────────────────────────

function DecayCard({ kpi, sig }: { kpi: DecayKPIs; sig: Signal }) {
  const [open, setOpen] = useState(false)

  return (
    <div className={`bg-white rounded-lg border ${signalBorder(sig)} p-4`}>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Confidence Decay</h2>
        <span className="text-lg">{dot(sig)}</span>
      </div>
      <div className="text-sm">
        <p className="text-gray-700">
          Elevated profit floor applied to <span className="font-semibold">{kpi.decayPct}%</span> of quotes
          <span className="text-gray-400 text-xs ml-1">({kpi.totalSnapshotsWithDecay}/{kpi.totalSnapshots})</span>
        </p>
      </div>

      <div className="mt-2"><ToggleBtn open={open} onClick={() => setOpen(!open)} /></div>

      {open && (
        <div className="mt-3 pt-3 border-t border-gray-100 text-sm text-gray-600">
          {kpi.byReason.length > 0 ? (
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-1">Breakdown by Trigger</p>
              {kpi.byReason.map(r => (
                <div key={r.reason} className="flex justify-between py-0.5">
                  <span className="text-xs">{r.reason}</span>
                  <span className="text-xs font-medium">{r.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400">No decay triggers recorded yet</p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Weekly Summary Card ────────────────────────────────────────────────────────

function WeeklySummaryCard({ summary, trends }: { summary: WeeklySummary; trends: WeeklyTrend[] }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Weekly Digest</h2>
        <span className="text-xs text-gray-400">Auto-generated</span>
      </div>

      {/* Compact 2-col summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 text-sm">
        <MiniStat label="Offers" value={summary.offersGenerated} />
        <MiniStat label="Acceptance" value={`${summary.acceptanceRate}%`} />
        <MiniStat label="Avg Profit" value={summary.avgRealisedProfit !== null ? `£${summary.avgRealisedProfit}` : '—'} />
        <MiniStat label="Liability blocks" value={summary.liabilityBlocks} />
        <MiniStat label="Exposure triggers" value={summary.exposureCapTriggers} />
        <MiniStat label="Manual reviews" value={summary.manualReviewCount} />
        <MiniStat label="Calibration size" value={summary.calibrationSampleSize} />
        <MiniStat label="Avg confidence" value={summary.avgConfidence} />
      </div>

      <div className="mt-3"><ToggleBtn open={open} onClick={() => setOpen(!open)} /></div>

      {open && (
        <div className="mt-3 pt-3 border-t border-gray-100 overflow-x-auto">
          <p className="text-xs font-semibold text-gray-500 mb-2">8-Week Trend</p>
          <table className="min-w-full text-xs">
            <thead>
              <tr className="text-gray-400 uppercase tracking-wider">
                <th className="text-left py-1 pr-4">Week</th>
                <th className="text-right py-1 px-2">Offers</th>
                <th className="text-right py-1 px-2">Won</th>
                <th className="text-right py-1 px-2">Lost</th>
                <th className="text-right py-1 px-2">Manual</th>
                <th className="text-right py-1 px-2">Win %</th>
              </tr>
            </thead>
            <tbody>
              {trends.map(t => {
                const total = t.won + t.lost
                const winRate = total > 0 ? Math.round((t.won / total) * 100) : 0
                return (
                  <tr key={t.weekLabel} className="border-t border-gray-50 hover:bg-gray-50">
                    <td className="py-1 pr-4 font-medium text-gray-700">{t.weekLabel}</td>
                    <td className="text-right px-2">{t.offers}</td>
                    <td className="text-right px-2 text-green-700">{t.won}</td>
                    <td className="text-right px-2 text-red-500">{t.lost}</td>
                    <td className="text-right px-2 text-yellow-600">{t.manualReview}</td>
                    <td className="text-right px-2">
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
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Primitives
// ═══════════════════════════════════════════════════════════════════════════════

function Stat({ label, value, suffix, color }: {
  label: string
  value: string | number
  suffix?: string
  color?: Signal
}) {
  const cls = color === 'green' ? 'text-green-700'
    : color === 'amber' ? 'text-yellow-700'
    : color === 'red' ? 'text-red-600'
    : 'text-gray-900'

  return (
    <div>
      <p className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</p>
      <p className={`text-base font-semibold ${cls}`}>
        {value}{suffix && <span className="text-xs text-gray-400 font-normal">{suffix}</span>}
      </p>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-700 font-medium">{value}</span>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-[10px] text-gray-400">{label}</p>
      <p className="text-sm font-semibold text-gray-900">{value}</p>
    </div>
  )
}

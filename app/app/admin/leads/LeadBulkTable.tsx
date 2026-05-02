'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import type { Lead } from '@/lib/types'
import type { MutationResult } from '@/lib/adminDbMutations'
import { createBulkSelectionState, toggleVisibleSelection } from '@/lib/bulkSelection'
import {
  bulkAssignInspectorAction,
  bulkDeleteLeadsAction,
  bulkUpdateLeadFinanceAction,
  bulkUpdateLeadStatusAction,
} from './actions'
import { FINANCE_LABELS, STATUS_LABELS, leadStatusBadgeClass } from './leadPresentation'

export interface LeadRow {
  id: string
  created_at: string
  seller_name: string
  seller_email: string
  reg: string
  make: string | null
  model: string | null
  status: Lead['status']
  finance_status: string | null
  assigned_inspector_id: string | null
}

export interface InspectorOption {
  id: string
  name: string
  email: string
}

interface LeadBulkTableProps {
  leads: LeadRow[]
  inspectors: InspectorOption[]
  emptyMessage: string
}

export default function LeadBulkTable({ leads, inspectors, emptyMessage }: LeadBulkTableProps) {
  const router = useRouter()
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [result, setResult] = useState<MutationResult | null>(null)
  const [statusTarget, setStatusTarget] = useState<Lead['status']>('contacted')
  const [financeTarget, setFinanceTarget] = useState('clear')
  const [inspectorTarget, setInspectorTarget] = useState('')
  const [isPending, startTransition] = useTransition()
  const headerCheckboxRef = useRef<HTMLInputElement>(null)

  const visibleIds = useMemo(() => leads.map((lead) => lead.id), [leads])
  const selection = useMemo(
    () => createBulkSelectionState(visibleIds, selectedIds),
    [selectedIds, visibleIds]
  )
  const selectedCount = selection.selectedVisibleIds.length

  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate = selection.someVisibleSelected
    }
  }, [selection.someVisibleSelected])

  function toggleRow(id: string, checked: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (checked) next.add(id)
      else next.delete(id)
      return [...next]
    })
  }

  function finishMutation(nextResult: MutationResult) {
    setResult(nextResult)
    const failedVisibleIds = nextResult.failures
      .map((item) => item.id)
      .filter((id) => visibleIds.includes(id))
    setSelectedIds(failedVisibleIds)
    router.refresh()
  }

  function runMutation(action: () => Promise<MutationResult>) {
    setResult(null)
    startTransition(async () => {
      const nextResult = await action()
      finishMutation(nextResult)
    })
  }

  function selectedForAction() {
    return selection.selectedVisibleIds
  }

  const inspectorById = useMemo(() => {
    const map = new Map<string, InspectorOption>()
    inspectors.forEach((inspector) => map.set(inspector.id, inspector))
    return map
  }, [inspectors])

  return (
    <div className="card-premium overflow-hidden">
      <BulkToolbar
        selectedCount={selectedCount}
        disabled={isPending}
        statusTarget={statusTarget}
        financeTarget={financeTarget}
        inspectorTarget={inspectorTarget}
        inspectors={inspectors}
        onClear={() => setSelectedIds([])}
        onStatusTargetChange={setStatusTarget}
        onFinanceTargetChange={setFinanceTarget}
        onInspectorTargetChange={setInspectorTarget}
        onStatus={() => runMutation(() => bulkUpdateLeadStatusAction(selectedForAction(), statusTarget))}
        onFinance={() => runMutation(() => bulkUpdateLeadFinanceAction(selectedForAction(), financeTarget))}
        onAssign={() => runMutation(() => bulkAssignInspectorAction(selectedForAction(), inspectorTarget))}
        onDelete={() => {
          if (!window.confirm(`Delete ${selectedCount} selected lead${selectedCount === 1 ? '' : 's'}? This cannot be undone.`)) return
          runMutation(() => bulkDeleteLeadsAction(selectedForAction()))
        }}
      />

      {result && <BulkResult result={result} />}

      <div className="divide-y divide-[var(--card-border)]">
        {leads.length > 0 && (
          <div className="grid grid-cols-[2.5rem_5rem_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-warm-gray sm:grid-cols-[2.5rem_6rem_minmax(0,1fr)_auto_6rem_5rem_1.5rem] sm:px-6">
            <input
              ref={headerCheckboxRef}
              type="checkbox"
              checked={selection.allVisibleSelected}
              onChange={(event) => setSelectedIds(toggleVisibleSelection(visibleIds, selectedIds, event.currentTarget.checked))}
              aria-label="Select all visible leads"
              className="h-4 w-4 rounded border-[var(--card-border)] accent-gold"
            />
            <span>Reg</span>
            <span>Lead</span>
            <span className="text-right sm:text-left">Status</span>
            <span className="hidden text-right md:block">Finance</span>
            <span className="hidden text-right sm:block">Date</span>
            <span className="sr-only">Open</span>
          </div>
        )}

        {leads.map((lead) => {
          const assignedInspector = lead.assigned_inspector_id ? inspectorById.get(lead.assigned_inspector_id) : null

          return (
            <div
              key={lead.id}
              className="grid grid-cols-[2.5rem_5rem_minmax(0,1fr)_auto] items-center gap-3 px-3 py-3 transition-colors hover:bg-[var(--surface-warm)] sm:grid-cols-[2.5rem_6rem_minmax(0,1fr)_auto_6rem_5rem_1.5rem] sm:px-6 sm:py-4"
            >
              <input
                type="checkbox"
                checked={selectedIds.includes(lead.id)}
                onChange={(event) => toggleRow(lead.id, event.currentTarget.checked)}
                aria-label={`Select ${lead.reg}`}
                className="h-4 w-4 rounded border-[var(--card-border)] accent-gold"
              />

              <Link href={`/admin/leads/${lead.id}`} className="text-xs font-bold font-mono tracking-wide text-foreground sm:text-sm">
                {lead.reg}
              </Link>

              <div className="min-w-0">
                <Link href={`/admin/leads/${lead.id}`} className="block truncate text-sm font-medium text-foreground hover:underline">
                  {lead.seller_name}
                  <span className="ml-2 font-normal text-warm-gray">{lead.make} {lead.model}</span>
                </Link>
                <p className="mt-0.5 truncate text-xs text-warm-gray/70">
                  {lead.seller_email}
                  {assignedInspector && <span className="ml-2 hidden sm:inline">Inspector: {assignedInspector.name}</span>}
                </p>
              </div>

              <span className={leadStatusBadgeClass(lead.status)}>
                {STATUS_LABELS[lead.status]}
              </span>

              <span className="hidden text-right text-xs capitalize text-warm-gray md:block">
                {FINANCE_LABELS[lead.finance_status ?? 'not_checked'] ?? (lead.finance_status ?? 'not checked').replace(/_/g, ' ')}
              </span>

              <span className="hidden text-right text-xs tabular-nums text-warm-gray/70 sm:block">
                {new Date(lead.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              </span>

              <Link href={`/admin/leads/${lead.id}`} className="hidden text-warm-gray/40 transition-colors hover:text-gold sm:block" aria-label={`Open ${lead.reg}`}>
                &gt;
              </Link>
            </div>
          )
        })}

        {leads.length === 0 && (
          <p className="py-16 text-center text-sm text-warm-gray">{emptyMessage}</p>
        )}
      </div>
    </div>
  )
}

interface BulkToolbarProps {
  selectedCount: number
  disabled: boolean
  statusTarget: Lead['status']
  financeTarget: string
  inspectorTarget: string
  inspectors: InspectorOption[]
  onClear: () => void
  onStatusTargetChange: (value: Lead['status']) => void
  onFinanceTargetChange: (value: string) => void
  onInspectorTargetChange: (value: string) => void
  onStatus: () => void
  onFinance: () => void
  onAssign: () => void
  onDelete: () => void
}

function BulkToolbar({
  selectedCount,
  disabled,
  statusTarget,
  financeTarget,
  inspectorTarget,
  inspectors,
  onClear,
  onStatusTargetChange,
  onFinanceTargetChange,
  onInspectorTargetChange,
  onStatus,
  onFinance,
  onAssign,
  onDelete,
}: BulkToolbarProps) {
  if (selectedCount === 0) return null

  return (
    <div className="border-b border-[var(--card-border)] bg-[var(--surface-warm)] px-3 py-3 sm:px-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-foreground">{selectedCount} selected</span>
          <button type="button" onClick={onClear} disabled={disabled} className="text-xs font-medium text-warm-gray hover:text-foreground disabled:opacity-50">
            Deselect all
          </button>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <div className="flex gap-2">
            <select
              value={statusTarget}
              onChange={(event) => onStatusTargetChange(event.currentTarget.value as Lead['status'])}
              disabled={disabled}
              className="min-w-36 rounded-lg border border-[var(--card-border)] bg-[var(--input-bg)] px-3 py-2 text-xs text-foreground"
            >
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <button type="button" onClick={onStatus} disabled={disabled} className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-2 text-xs font-semibold text-foreground hover:bg-background disabled:opacity-50">
              Update status
            </button>
          </div>

          <div className="flex gap-2">
            <select
              value={financeTarget}
              onChange={(event) => onFinanceTargetChange(event.currentTarget.value)}
              disabled={disabled}
              className="min-w-36 rounded-lg border border-[var(--card-border)] bg-[var(--input-bg)] px-3 py-2 text-xs text-foreground"
            >
              {Object.entries(FINANCE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <button type="button" onClick={onFinance} disabled={disabled} className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-2 text-xs font-semibold text-foreground hover:bg-background disabled:opacity-50">
              Update finance
            </button>
          </div>

          <div className="flex gap-2">
            <select
              value={inspectorTarget}
              onChange={(event) => onInspectorTargetChange(event.currentTarget.value)}
              disabled={disabled}
              className="min-w-40 rounded-lg border border-[var(--card-border)] bg-[var(--input-bg)] px-3 py-2 text-xs text-foreground"
            >
              <option value="">Unassigned</option>
              {inspectors.map((inspector) => (
                <option key={inspector.id} value={inspector.id}>{inspector.name}</option>
              ))}
            </select>
            <button type="button" onClick={onAssign} disabled={disabled} className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-2 text-xs font-semibold text-foreground hover:bg-background disabled:opacity-50">
              Forward
            </button>
          </div>

          <button type="button" onClick={onDelete} disabled={disabled} className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-200">
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

function BulkResult({ result }: { result: MutationResult }) {
  return (
    <div className={`border-b px-3 py-3 text-sm sm:px-6 ${result.success ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-100' : 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-100'}`}>
      <p className="font-semibold">{result.message}</p>
      {result.failures.length > 0 && (
        <ul className="mt-2 space-y-1 text-xs">
          {result.failures.map((item) => (
            <li key={`${item.id}-${item.code}`}>{item.id}: {item.message}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
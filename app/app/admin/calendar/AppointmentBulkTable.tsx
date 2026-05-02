'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import type { AppointmentStatus } from '@/lib/types'
import type { MutationResult } from '@/lib/adminDbMutations'
import { createBulkSelectionState, toggleVisibleSelection } from '@/lib/bulkSelection'
import { bulkDeleteAppointmentsAction, bulkUpdateAppointmentsAction } from './actions'

export interface AppointmentRow {
  id: string
  lead_id: string
  type: string
  start_at: string
  end_at: string
  status: AppointmentStatus
  leads: { seller_name: string; reg: string } | null
}

const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  booked: 'Booked',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No-show',
}

function appointmentStatusClass(status: AppointmentStatus): string {
  const base = 'inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium capitalize'
  switch (status) {
    case 'completed':
      return `${base} border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-200`
    case 'cancelled':
      return `${base} border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300`
    case 'no_show':
      return `${base} border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200`
    default:
      return `${base} border-[var(--card-border)] bg-[var(--surface-warm)] text-foreground`
  }
}

export default function AppointmentBulkTable({ appointments }: { appointments: AppointmentRow[] }) {
  const router = useRouter()
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [result, setResult] = useState<MutationResult | null>(null)
  const [statusTarget, setStatusTarget] = useState<AppointmentStatus>('completed')
  const [isPending, startTransition] = useTransition()
  const headerCheckboxRef = useRef<HTMLInputElement>(null)

  const visibleIds = useMemo(() => appointments.map((appointment) => appointment.id), [appointments])
  const selection = useMemo(
    () => createBulkSelectionState(visibleIds, selectedIds),
    [selectedIds, visibleIds]
  )
  const selectedCount = selection.selectedVisibleIds.length

  useEffect(() => {
    if (headerCheckboxRef.current) headerCheckboxRef.current.indeterminate = selection.someVisibleSelected
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
    setSelectedIds(nextResult.failures.map((item) => item.id).filter((id) => visibleIds.includes(id)))
    router.refresh()
  }

  function runMutation(action: () => Promise<MutationResult>) {
    setResult(null)
    startTransition(async () => {
      const nextResult = await action()
      finishMutation(nextResult)
    })
  }

  return (
    <div className="card-premium overflow-hidden">
      {selectedCount > 0 && (
        <div className="border-b border-[var(--card-border)] bg-[var(--surface-warm)] px-3 py-3 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-foreground">{selectedCount} selected</span>
              <button type="button" onClick={() => setSelectedIds([])} disabled={isPending} className="text-xs font-medium text-warm-gray hover:text-foreground disabled:opacity-50">
                Deselect all
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              <select
                value={statusTarget}
                onChange={(event) => setStatusTarget(event.currentTarget.value as AppointmentStatus)}
                disabled={isPending}
                className="min-w-36 rounded-lg border border-[var(--card-border)] bg-[var(--input-bg)] px-3 py-2 text-xs text-foreground"
              >
                {Object.entries(APPOINTMENT_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <button type="button" onClick={() => runMutation(() => bulkUpdateAppointmentsAction(selection.selectedVisibleIds, statusTarget))} disabled={isPending} className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-2 text-xs font-semibold text-foreground hover:bg-background disabled:opacity-50">
                Update status
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!window.confirm(`Delete ${selectedCount} selected appointment${selectedCount === 1 ? '' : 's'}? This cannot be undone.`)) return
                  runMutation(() => bulkDeleteAppointmentsAction(selection.selectedVisibleIds))
                }}
                disabled={isPending}
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-200"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {result && <BulkResult result={result} />}

      <div className="divide-y divide-[var(--card-border)]">
        {appointments.length > 0 && (
          <div className="grid grid-cols-[2.5rem_minmax(8rem,1fr)_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-warm-gray sm:grid-cols-[2.5rem_11rem_5rem_minmax(0,1fr)_auto_1.5rem] sm:px-6">
            <input
              ref={headerCheckboxRef}
              type="checkbox"
              checked={selection.allVisibleSelected}
              onChange={(event) => setSelectedIds(toggleVisibleSelection(visibleIds, selectedIds, event.currentTarget.checked))}
              aria-label="Select all visible appointments"
              className="h-4 w-4 rounded border-[var(--card-border)] accent-gold"
            />
            <span>When</span>
            <span className="hidden sm:block">Type</span>
            <span>Lead</span>
            <span>Status</span>
            <span className="sr-only">Open</span>
          </div>
        )}

        {appointments.map((appointment) => {
          const lead = appointment.leads

          return (
            <div key={appointment.id} className="grid grid-cols-[2.5rem_minmax(8rem,1fr)_minmax(0,1fr)_auto] items-center gap-3 px-3 py-3 transition-colors hover:bg-[var(--surface-warm)] sm:grid-cols-[2.5rem_11rem_5rem_minmax(0,1fr)_auto_1.5rem] sm:px-6 sm:py-4">
              <input
                type="checkbox"
                checked={selectedIds.includes(appointment.id)}
                onChange={(event) => toggleRow(appointment.id, event.currentTarget.checked)}
                aria-label={`Select appointment for ${lead?.reg ?? appointment.id}`}
                className="h-4 w-4 rounded border-[var(--card-border)] accent-gold"
              />

              <Link href={appointment.lead_id ? `/admin/leads/${appointment.lead_id}` : '/admin/calendar'} className="text-xs tabular-nums text-foreground hover:underline sm:text-sm">
                {new Date(appointment.start_at).toLocaleString('en-GB', {
                  timeZone: 'Europe/London',
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </Link>

              <span className="hidden text-[11px] uppercase tracking-wide text-warm-gray sm:block">
                {appointment.type.replace('_', '-')}
              </span>

              <div className="min-w-0">
                <Link href={appointment.lead_id ? `/admin/leads/${appointment.lead_id}` : '/admin/calendar'} className="block truncate text-sm text-foreground hover:underline">
                  {lead?.seller_name ?? '-'}
                </Link>
                <span className="text-xs font-mono text-warm-gray">{lead?.reg ?? ''}</span>
              </div>

              <span className={appointmentStatusClass(appointment.status)}>
                {APPOINTMENT_STATUS_LABELS[appointment.status]}
              </span>

              <Link href={appointment.lead_id ? `/admin/leads/${appointment.lead_id}` : '/admin/calendar'} className="hidden text-warm-gray/40 transition-colors hover:text-gold sm:block" aria-label="Open appointment lead">
                &gt;
              </Link>
            </div>
          )
        })}

        {appointments.length === 0 && (
          <p className="py-16 text-center text-sm text-warm-gray">No appointments found.</p>
        )}
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
import type { Lead } from '@/lib/types'

export const STATUS_LABELS: Record<Lead['status'], string> = {
  new: 'New',
  verified: 'Verified',
  contacted: 'Contacted',
  appointment_booked: 'Appt Booked',
  inspected: 'Inspected',
  offer_made: 'Offer Made',
  won: 'Won',
  lost: 'Lost',
  no_response: 'No Response',
  expired: 'Expired',
}

export const FINANCE_LABELS: Record<string, string> = {
  not_checked: 'Not Checked',
  clear: 'Clear',
  finance_found: 'Finance Found',
}

export function leadStatusBadgeClass(status: Lead['status']): string {
  const base = 'inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium shrink-0'
  switch (status) {
    case 'won':
      return `${base} border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-200`
    case 'lost':
    case 'expired':
      return `${base} border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300`
    case 'no_response':
      return `${base} border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200`
    case 'inspected':
    case 'offer_made':
      return `${base} border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-400/30 dark:bg-sky-400/10 dark:text-sky-200`
    default:
      return `${base} border-[var(--card-border)] bg-[var(--surface-warm)] text-foreground`
  }
}
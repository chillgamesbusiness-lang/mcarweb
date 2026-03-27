import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/server'
import type { Lead } from '@/lib/types'

export const metadata = { title: 'Leads' }

const PAGE_SIZE = 25

const STATUS_LABELS: Record<Lead['status'], string> = {
  new: 'New',
  contacted: 'Contacted',
  appointment_booked: 'Appt Booked',
  inspected: 'Inspected',
  offer_approved: 'Offer Approved',
  offered: 'Offered',
  purchased: 'Purchased',
  won: 'Won',
  lost: 'Lost',
  rejected: 'Rejected',
  no_response: 'No Response',
  expired: 'Expired',
}

const STATUS_COLOURS: Record<Lead['status'], string> = {
  new: 'bg-blue-100 text-blue-700',
  contacted: 'bg-yellow-100 text-yellow-700',
  appointment_booked: 'bg-purple-100 text-purple-700',
  inspected: 'bg-orange-100 text-orange-700',
  offer_approved: 'bg-teal-100 text-teal-700',
  offered: 'bg-indigo-100 text-indigo-700',
  purchased: 'bg-emerald-100 text-emerald-700',
  won: 'bg-green-100 text-green-700',
  lost: 'bg-gray-100 text-gray-500',
  rejected: 'bg-red-100 text-red-700',
  no_response: 'bg-slate-100 text-slate-500',
  expired: 'bg-amber-100 text-amber-600',
}

interface LeadsPageProps {
  searchParams: Promise<{ page?: string; q?: string; status?: string }>
}

export default async function AdminLeadsPage({ searchParams }: LeadsPageProps) {
  const params = await searchParams
  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1)
  const q = (params.q ?? '').trim()
  const statusFilter = params.status ?? ''

  const supabase = createServiceClient()

  // Build query
  let query = supabase
    .from('leads')
    .select('id, created_at, seller_name, seller_email, reg, make, model, status, finance_status', { count: 'exact' })
    .order('created_at', { ascending: false })

  // Status filter
  if (statusFilter && statusFilter in STATUS_LABELS) {
    query = query.eq('status', statusFilter)
  }

  // Search filter — search across reg, seller_name, seller_email
  // Sanitise to prevent PostgREST filter injection (strip commas, dots, parens, operators)
  if (q) {
    const safeQ = q.replace(/[,\.()%*]/g, '').slice(0, 100)
    if (safeQ.length > 0) {
      query = query.or(`reg.ilike.%${safeQ}%,seller_name.ilike.%${safeQ}%,seller_email.ilike.%${safeQ}%`)
    }
  }

  // Pagination
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1
  query = query.range(from, to)

  const { data: leads, error, count } = await query

  if (error) {
    console.error('[admin/leads] Query error:', error)
    return <div className="p-8 text-red-600">Error loading leads. Please try refreshing the page.</div>
  }

  const totalCount = count ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  // Build URL helper for pagination links
  function buildUrl(newPage: number) {
    const p = new URLSearchParams()
    p.set('page', String(newPage))
    if (q) p.set('q', q)
    if (statusFilter) p.set('status', statusFilter)
    return `/admin/leads?${p.toString()}`
  }

  return (
    <div className="p-6 lg:p-10">
      {/* Title — big, tight, editorial */}
      <h1 className="text-3xl font-bold tracking-tight text-charcoal mb-1">
        Leads
      </h1>
      {totalCount > 0 && (
        <p className="text-sm text-warm-gray mb-8">{totalCount} total</p>
      )}

      {/* Search + Filter — inline, minimal chrome */}
      <form method="GET" action="/admin/leads" className="flex gap-3 mb-8 max-w-2xl">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Search reg, name, email..."
          className="flex-1 border-b border-warm-border bg-transparent px-1 py-2 text-sm text-charcoal placeholder:text-warm-gray/60 focus:border-gold focus:outline-none transition-colors"
        />
        <select
          name="status"
          defaultValue={statusFilter}
          className="border-b border-warm-border bg-transparent px-1 py-2 text-sm text-charcoal focus:border-gold focus:outline-none transition-colors"
        >
          <option value="">All Statuses</option>
          {Object.entries(STATUS_LABELS).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
        <button
          type="submit"
          className="text-sm font-medium text-gold hover:text-gold-dark transition-colors"
        >
          Search
        </button>
        {(q || statusFilter) && (
          <Link
            href="/admin/leads"
            className="text-sm text-warm-gray hover:text-charcoal transition-colors"
          >
            Clear
          </Link>
        )}
      </form>

      {/* Lead rows — no table wrapper card, just clean divider-separated rows */}
      <div className="border-t border-warm-border">
        {leads?.map((lead) => (
          <Link
            key={lead.id}
            href={`/admin/leads/${lead.id}`}
            className="group flex items-center gap-6 py-4 border-b border-warm-border-light hover:bg-surface-warm/50 px-2 -mx-2 transition-colors"
          >
            {/* Reg — monospace, bold, anchors the row */}
            <span className="w-24 text-sm font-bold font-mono text-charcoal tracking-wide shrink-0">
              {lead.reg}
            </span>

            {/* Seller + vehicle */}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-charcoal truncate">
                {lead.seller_name}
                <span className="text-warm-gray ml-2 font-normal">
                  {lead.make} {lead.model}
                </span>
              </p>
              <p className="text-xs text-warm-gray/60 mt-0.5">{lead.seller_email}</p>
            </div>

            {/* Status badge */}
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium shrink-0 ${STATUS_COLOURS[lead.status as Lead['status']]}`}
            >
              {STATUS_LABELS[lead.status as Lead['status']]}
            </span>

            {/* Finance */}
            <span className="text-xs text-warm-gray capitalize w-20 text-right shrink-0">
              {(lead.finance_status ?? 'not_checked').replace(/_/g, ' ')}
            </span>

            {/* Date */}
            <span className="text-xs text-warm-gray/60 w-20 text-right shrink-0 tabular-nums">
              {new Date(lead.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </span>

            {/* Arrow */}
            <span className="text-warm-gray/30 group-hover:text-gold transition-colors shrink-0">→</span>
          </Link>
        ))}

        {(!leads || leads.length === 0) && (
          <p className="py-12 text-center text-warm-gray text-sm">
            {q || statusFilter ? 'No leads match your search.' : 'No leads yet.'}
          </p>
        )}
      </div>

      {/* Pagination — minimal */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 pt-4">
          <p className="text-xs text-warm-gray">
            {from + 1}–{Math.min(from + PAGE_SIZE, totalCount)} of {totalCount}
          </p>
          <div className="flex gap-1.5">
            {page > 1 && (
              <Link
                href={buildUrl(page - 1)}
                className="px-3 py-1.5 text-xs text-warm-gray hover:text-charcoal transition-colors"
              >
                ← Prev
              </Link>
            )}
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
              .map((p, idx, arr) => {
                const prev = arr[idx - 1]
                const showEllipsis = prev !== undefined && p - prev > 1
                return (
                  <span key={p} className="flex items-center">
                    {showEllipsis && <span className="text-warm-gray/40 px-1 text-xs">…</span>}
                    <Link
                      href={buildUrl(p)}
                      className={`px-2.5 py-1 text-xs rounded ${
                        p === page
                          ? 'bg-charcoal text-white'
                          : 'text-warm-gray hover:text-charcoal transition-colors'
                      }`}
                    >
                      {p}
                    </Link>
                  </span>
                )
              })}
            {page < totalPages && (
              <Link
                href={buildUrl(page + 1)}
                className="px-3 py-1.5 text-xs text-warm-gray hover:text-charcoal transition-colors"
              >
                Next →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

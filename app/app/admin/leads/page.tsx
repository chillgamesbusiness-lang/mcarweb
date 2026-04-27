import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/server'
import type { Lead } from '@/lib/types'

export const metadata = { title: 'Leads' }

const PAGE_SIZE = 25

const STATUS_LABELS: Record<Lead['status'], string> = {
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

const STATUS_COLOURS: Record<Lead['status'], string> = {
  new: 'bg-blue-100 text-blue-700',
  verified: 'bg-cyan-100 text-cyan-700',
  contacted: 'bg-yellow-100 text-yellow-700',
  appointment_booked: 'bg-purple-100 text-purple-700',
  inspected: 'bg-orange-100 text-orange-700',
  offer_made: 'bg-teal-100 text-teal-700',
  won: 'bg-green-100 text-green-700',
  lost: 'bg-gray-100 text-gray-500',
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
    <div className="p-4 sm:p-6 lg:p-10">
      {/* Title */}
      <h1 className="text-2xl sm:text-3xl font-extrabold tracking-[-0.02em] text-foreground mb-1">
        Leads
      </h1>
      {totalCount > 0 && (
        <p className="text-sm text-warm-gray mb-8">{totalCount} total</p>
      )}

      {/* Search + Filter — premium card bar */}
      <form method="GET" action="/admin/leads" className="card-premium p-3 sm:p-4 flex flex-col sm:flex-row gap-2 sm:gap-3 mb-6 sm:mb-8 max-w-3xl">
        <div className="flex-1 relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-warm-gray/50" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Search reg, name, email..."
            className="w-full rounded-xl border border-warm-border bg-[var(--input-bg)] pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-warm-gray/50 input-premium focus:outline-none"
          />
        </div>
        <select
          name="status"
          defaultValue={statusFilter}
            className="rounded-xl border border-warm-border bg-[var(--input-bg)] px-4 py-2.5 text-sm text-foreground input-premium focus:outline-none appearance-none"
        >
          <option value="">All Statuses</option>
          {Object.entries(STATUS_LABELS).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-xl gradient-gold px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-gold/15 hover:shadow-lg hover:shadow-gold/25 transition-all"
        >
          Search
        </button>
        {(q || statusFilter) && (
          <Link
            href="/admin/leads"
            className="rounded-xl border border-warm-border px-4 py-2.5 text-sm text-warm-gray hover:text-charcoal-deep hover:border-charcoal/20 transition-all"
          >
            Clear
          </Link>
        )}
      </form>

      {/* Lead rows — premium card container */}
      <div className="card-premium overflow-hidden">
        <div className="divide-y divide-warm-border/50">
        {leads?.map((lead) => (
          <Link
            key={lead.id}
            href={`/admin/leads/${lead.id}`}
            className="group flex items-center gap-3 sm:gap-6 py-3 sm:py-4 px-3 sm:px-6 hover:bg-gold/[0.03] transition-all duration-200"
          >
            {/* Reg — monospace, bold, anchors the row */}
            <span className="w-20 sm:w-24 text-xs sm:text-sm font-bold font-mono text-foreground tracking-wide shrink-0">
              {lead.reg}
            </span>

            {/* Seller + vehicle */}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground truncate font-medium">
                {lead.seller_name}
                <span className="text-warm-gray ml-2 font-normal">
                  {lead.make} {lead.model}
                </span>
              </p>
              <p className="text-xs text-warm-gray/60 mt-0.5">{lead.seller_email}</p>
            </div>

            {/* Status badge */}
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold shrink-0 ${STATUS_COLOURS[lead.status as Lead['status']]}`}
            >
              {STATUS_LABELS[lead.status as Lead['status']]}
            </span>

            {/* Finance */}
            <span className="text-xs text-warm-gray capitalize w-20 text-right shrink-0 hidden md:block">
              {(lead.finance_status ?? 'not_checked').replace(/_/g, ' ')}
            </span>

            {/* Date */}
            <span className="text-xs text-warm-gray/60 w-20 text-right shrink-0 tabular-nums hidden sm:block">
              {new Date(lead.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </span>

            {/* Arrow */}
            <span className="text-warm-gray/20 group-hover:text-gold transition-colors duration-200 shrink-0">→</span>
          </Link>
        ))}

        {(!leads || leads.length === 0) && (
          <p className="py-16 text-center text-warm-gray text-sm">
            {q || statusFilter ? 'No leads match your search.' : 'No leads yet.'}
          </p>
        )}
        </div>
      </div>

      {/* Pagination — minimal */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 pt-4">
          <p className="text-xs text-warm-gray font-medium">
            {from + 1}–{Math.min(from + PAGE_SIZE, totalCount)} of {totalCount}
          </p>
          <div className="flex gap-1.5">
            {page > 1 && (
              <Link
                href={buildUrl(page - 1)}
                className="px-3 py-1.5 text-xs font-medium text-warm-gray hover:text-charcoal-deep transition-colors rounded-lg hover:bg-surface"
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
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                        p === page
                          ? 'gradient-gold text-white shadow-sm'
                          : 'text-warm-gray hover:text-charcoal-deep hover:bg-surface'
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
                className="px-3 py-1.5 text-xs font-medium text-warm-gray hover:text-charcoal-deep transition-colors rounded-lg hover:bg-surface"
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

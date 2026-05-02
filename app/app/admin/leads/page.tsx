import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/server'
import LeadBulkTable, { type InspectorOption, type LeadRow } from './LeadBulkTable'
import { STATUS_LABELS } from './leadPresentation'

export const metadata = { title: 'Leads' }

const PAGE_SIZE = 25

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
    .select('id, created_at, seller_name, seller_email, reg, make, model, status, finance_status, assigned_inspector_id', { count: 'exact' })
    .order('created_at', { ascending: false })

  // Status filter
  if (statusFilter && statusFilter in STATUS_LABELS) {
    query = query.eq('status', statusFilter)
  }

  // Search filter — search across reg, seller_name, seller_email
  // Sanitise to prevent PostgREST filter injection (strip commas, dots, parens, operators)
  if (q) {
    const safeQ = q.replace(/[\\,\.()%*]/g, '').slice(0, 100)
    if (safeQ.length > 0) {
      query = query.or(`reg.ilike.%${safeQ}%,seller_name.ilike.%${safeQ}%,seller_email.ilike.%${safeQ}%`)
    }
  }

  // Pagination
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1
  query = query.range(from, to)

  const [{ data: leads, error, count }, { data: inspectors, error: inspectorsError }] = await Promise.all([
    query,
    supabase.from('users').select('id, name, email').eq('role', 'inspector').eq('is_active', true).order('name', { ascending: true }),
  ])

  if (error) {
    console.error('[admin/leads] Query error:', error)
    return <div className="p-8 text-red-600">Error loading leads. Please try refreshing the page.</div>
  }

  if (inspectorsError) {
    console.error('[admin/leads] Inspectors query error:', inspectorsError)
    return <div className="p-8 text-red-600">Error loading inspectors. Please try refreshing the page.</div>
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

      <LeadBulkTable
        key={`${page}:${q}:${statusFilter}`}
        leads={(leads ?? []) as LeadRow[]}
        inspectors={(inspectors ?? []) as InspectorOption[]}
        emptyMessage={q || statusFilter ? 'No leads match your search.' : 'No leads yet.'}
      />

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

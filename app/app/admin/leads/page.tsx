import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Lead } from '@/lib/types'

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

  const supabase = await createClient()

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
  if (q) {
    query = query.or(`reg.ilike.%${q}%,seller_name.ilike.%${q}%,seller_email.ilike.%${q}%`)
  }

  // Pagination
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1
  query = query.range(from, to)

  const { data: leads, error, count } = await query

  if (error) {
    return <div className="p-8 text-red-600">Error loading leads: {error.message}</div>
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
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Leads {totalCount > 0 && <span className="text-gray-400 text-lg font-normal">({totalCount})</span>}
        </h1>
      </div>

      {/* Search + Filter bar */}
      <form method="GET" action="/admin/leads" className="flex gap-3 mb-6">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Search reg, name, or email..."
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
        />
        <select
          name="status"
          defaultValue={statusFilter}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
        >
          <option value="">All Statuses</option>
          {Object.entries(STATUS_LABELS).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-md bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
        >
          Search
        </button>
        {(q || statusFilter) && (
          <Link
            href="/admin/leads"
            className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors flex items-center"
          >
            Clear
          </Link>
        )}
      </form>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Seller</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Vehicle</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Finance</th>
              <th />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {leads?.map((lead) => (
              <tr key={lead.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                  {new Date(lead.created_at).toLocaleDateString('en-GB')}
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{lead.seller_name}</p>
                  <p className="text-gray-400 text-xs">{lead.seller_email}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{lead.reg}</p>
                  <p className="text-gray-400 text-xs">
                    {lead.make} {lead.model}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLOURS[lead.status as Lead['status']]}`}
                  >
                    {STATUS_LABELS[lead.status as Lead['status']]}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 capitalize">
                  {(lead.finance_status ?? 'not_checked').replace(/_/g, ' ')}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/leads/${lead.id}`}
                    className="text-blue-600 hover:underline text-xs font-medium"
                  >
                    View →
                  </Link>
                </td>
              </tr>
            ))}

            {(!leads || leads.length === 0) && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  {q || statusFilter ? 'No leads match your search.' : 'No leads yet.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-500">
            Showing {from + 1}–{Math.min(from + PAGE_SIZE, totalCount)} of {totalCount}
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={buildUrl(page - 1)}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
              >
                ← Previous
              </Link>
            )}
            {/* Page numbers — show max 7 pages around current */}
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
              .map((p, idx, arr) => {
                const prev = arr[idx - 1]
                const showEllipsis = prev !== undefined && p - prev > 1
                return (
                  <span key={p} className="flex items-center gap-1">
                    {showEllipsis && <span className="text-gray-400 px-1">…</span>}
                    <Link
                      href={buildUrl(p)}
                      className={`rounded-md px-3 py-1.5 text-sm ${
                        p === page
                          ? 'bg-gray-800 text-white'
                          : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
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
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
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

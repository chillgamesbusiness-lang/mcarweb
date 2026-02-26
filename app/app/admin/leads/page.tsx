import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Lead } from '@/lib/types'

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

export default async function AdminLeadsPage() {
  const supabase = await createClient()

  const { data: leads, error } = await supabase
    .from('leads')
    .select('id, created_at, seller_name, seller_email, reg, make, model, status, finance_status')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    return <div className="p-8 text-red-600">Error loading leads: {error.message}</div>
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
        {/* CSV export button — wired up in later session */}
        <button className="text-sm text-gray-500 border border-gray-300 rounded-md px-3 py-1.5 hover:bg-gray-50">
          Export CSV
        </button>
      </div>

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
                  {lead.finance_status.replace('_', ' ')}
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
                  No leads yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

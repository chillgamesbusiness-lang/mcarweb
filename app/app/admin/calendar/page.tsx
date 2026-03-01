import { createServiceClient } from '@/lib/supabase/server'

export default async function AdminCalendarPage() {
  const svc = createServiceClient()

  const { data: appointments } = await svc
    .from('appointments')
    .select('*, leads(seller_name, reg)')
    .in('status', ['booked', 'completed'])
    .order('start_at', { ascending: true })
    .limit(50)

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Calendar / Appointments</h1>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Date & Time</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Seller</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Reg</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {appointments?.map((appt) => {
              const lead = appt.leads as { seller_name: string; reg: string } | null
              return (
                <tr key={appt.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap text-gray-700">
                    {new Date(appt.start_at).toLocaleString('en-GB', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </td>
                  <td className="px-4 py-3 capitalize text-gray-700">
                    {appt.type.replace('_', '-')}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{lead?.seller_name ?? '—'}</td>
                  <td className="px-4 py-3 font-mono text-gray-700">{lead?.reg ?? '—'}</td>
                  <td className="px-4 py-3 capitalize text-gray-500">{appt.status}</td>
                </tr>
              )
            })}

            {(!appointments || appointments.length === 0) && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  No appointments found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-6 text-sm text-gray-400">Full calendar widget coming in a later session.</p>
    </div>
  )
}

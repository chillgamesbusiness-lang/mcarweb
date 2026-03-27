import { createServiceClient } from '@/lib/supabase/server'

export const metadata = { title: 'Calendar' }

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
      <h1 className="text-2xl font-bold text-charcoal mb-6">Calendar / Appointments</h1>

      <div className="bg-surface rounded-lg border border-warm-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-warm border-b border-warm-border">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-warm-gray">Date & Time</th>
              <th className="text-left px-4 py-3 font-medium text-warm-gray">Type</th>
              <th className="text-left px-4 py-3 font-medium text-warm-gray">Seller</th>
              <th className="text-left px-4 py-3 font-medium text-warm-gray">Reg</th>
              <th className="text-left px-4 py-3 font-medium text-warm-gray">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-warm-border-light">
            {appointments?.map((appt) => {
              const lead = appt.leads as { seller_name: string; reg: string } | null
              return (
                <tr key={appt.id} className="hover:bg-surface-warm">
                  <td className="px-4 py-3 whitespace-nowrap text-charcoal-light">
                    {new Date(appt.start_at).toLocaleString('en-GB', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </td>
                  <td className="px-4 py-3 capitalize text-charcoal-light">
                    {appt.type.replace('_', '-')}
                  </td>
                  <td className="px-4 py-3 text-charcoal-light">{lead?.seller_name ?? '—'}</td>
                  <td className="px-4 py-3 font-mono text-charcoal-light">{lead?.reg ?? '—'}</td>
                  <td className="px-4 py-3 capitalize text-warm-gray">{appt.status}</td>
                </tr>
              )
            })}

            {(!appointments || appointments.length === 0) && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-warm-gray">
                  No appointments found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-6 text-sm text-warm-gray">Full calendar widget coming in a later session.</p>
    </div>
  )
}

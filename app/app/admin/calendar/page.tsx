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
    <div className="p-6 lg:p-10">
      <h1 className="text-3xl font-bold tracking-tight text-charcoal mb-1">Calendar</h1>
      <p className="text-sm text-warm-gray mb-8">Upcoming & recent appointments</p>

      {/* Clean divider-row list, no table wrapper */}
      <div className="border-t border-warm-border">
        {appointments?.map((appt) => {
          const lead = appt.leads as { seller_name: string; reg: string } | null
          return (
            <div key={appt.id} className="flex items-center gap-6 py-4 border-b border-warm-border-light">
              {/* Date — prominent */}
              <span className="w-40 text-sm tabular-nums text-charcoal shrink-0">
                {new Date(appt.start_at).toLocaleString('en-GB', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </span>

              {/* Type */}
              <span className="w-20 text-xs uppercase tracking-wider text-warm-gray shrink-0">
                {appt.type.replace('_', '-')}
              </span>

              {/* Seller + Reg */}
              <div className="flex-1 min-w-0">
                <span className="text-sm text-charcoal">{lead?.seller_name ?? '—'}</span>
                <span className="ml-2 text-sm font-mono text-warm-gray">{lead?.reg ?? ''}</span>
              </div>

              {/* Status */}
              <span className={`text-xs capitalize ${
                appt.status === 'completed' ? 'text-green-600' : 'text-warm-gray'
              }`}>
                {appt.status}
              </span>
            </div>
          )
        })}

        {(!appointments || appointments.length === 0) && (
          <p className="py-12 text-center text-warm-gray text-sm">
            No appointments found.
          </p>
        )}
      </div>

      <p className="mt-8 text-[11px] text-warm-gray/50">Full calendar widget coming in a later session.</p>
    </div>
  )
}

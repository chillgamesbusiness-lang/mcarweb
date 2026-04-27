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
    <div className="p-4 sm:p-6 lg:p-10">
      <h1 className="text-2xl sm:text-3xl font-extrabold tracking-[-0.02em] text-foreground mb-1">Calendar</h1>
      <p className="text-sm text-warm-gray mb-8">Upcoming & recent appointments</p>

      {/* Premium card list */}
      <div className="card-premium overflow-hidden">
        <div className="divide-y divide-warm-border/50">
        {appointments?.map((appt) => {
          const lead = appt.leads as { seller_name: string; reg: string } | null
          return (
            <div key={appt.id} className="group flex items-center gap-3 sm:gap-6 py-3 sm:py-4 px-3 sm:px-6 hover:bg-gold/[0.03] transition-all duration-200">
              {/* Date — prominent */}
              <span className="w-32 sm:w-40 text-xs sm:text-sm tabular-nums text-foreground shrink-0">
                {new Date(appt.start_at).toLocaleString('en-GB', {
                  timeZone: 'Europe/London',
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </span>

              {/* Type */}
              <span className="w-16 sm:w-20 text-[11px] uppercase tracking-wider text-warm-gray shrink-0 hidden sm:block">
                {appt.type.replace('_', '-')}
              </span>

              {/* Seller + Reg */}
              <div className="flex-1 min-w-0">
                <span className="text-sm text-foreground">{lead?.seller_name ?? '—'}</span>
                <span className="ml-2 text-sm font-mono text-warm-gray">{lead?.reg ?? ''}</span>
              </div>

              {/* Status */}
              <span className={`text-xs font-semibold capitalize shrink-0 ${
                appt.status === 'completed' ? 'text-green-600' : 'text-warm-gray'
              }`}>
                {appt.status}
              </span>
            </div>
          )
        })}

        {(!appointments || appointments.length === 0) && (
          <p className="py-16 text-center text-warm-gray text-sm">
            No appointments found.
          </p>
        )}
        </div>
      </div>

      <p className="mt-8 text-[11px] text-warm-gray/50">Full calendar widget coming in a later session.</p>
    </div>
  )
}

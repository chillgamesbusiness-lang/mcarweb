import { createServiceClient } from '@/lib/supabase/server'
import AppointmentBulkTable, { type AppointmentRow } from './AppointmentBulkTable'

export const metadata = { title: 'Calendar' }

export default async function AdminCalendarPage() {
  const svc = createServiceClient()

  const { data: appointments, error } = await svc
    .from('appointments')
    .select('*, leads(seller_name, reg)')
    .in('status', ['booked', 'completed', 'cancelled', 'no_show'])
    .order('start_at', { ascending: true })
    .limit(50)

  if (error) {
    console.error('[admin/calendar] Query error:', error)
    return <div className="p-8 text-red-600">Error loading appointments. Please try refreshing the page.</div>
  }

  return (
    <div className="p-4 sm:p-6 lg:p-10">
      <h1 className="text-2xl sm:text-3xl font-extrabold tracking-[-0.02em] text-foreground mb-1">Calendar</h1>
      <p className="text-sm text-warm-gray mb-8">Upcoming & recent appointments</p>

      <AppointmentBulkTable appointments={(appointments ?? []) as AppointmentRow[]} />

      <p className="mt-8 text-[11px] text-warm-gray/50">Showing the latest 50 appointments. Open a row to manage the booking.</p>
    </div>
  )
}

import { createClient } from '@/lib/supabase/server'

export default async function AdminDashboardPage() {
  const supabase = await createClient()

  // Aggregate counts
  const [{ count: totalLeads }, { count: newLeads }, { count: todayAppointments }] =
    await Promise.all([
      supabase.from('leads').select('*', { count: 'exact', head: true }),
      supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'new'),
      supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'booked')
        .gte('start_at', new Date().toISOString().slice(0, 10))
        .lt('start_at', new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)),
    ])

  const stats = [
    { label: 'Total Leads', value: totalLeads ?? 0 },
    { label: 'New (uncontacted)', value: newLeads ?? 0 },
    { label: "Today's Appointments", value: todayAppointments ?? 0 },
  ]

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-lg border border-gray-200 p-5">
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className="mt-1 text-3xl font-bold text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>

      <p className="text-sm text-gray-400">More widgets coming in later sessions.</p>
    </div>
  )
}

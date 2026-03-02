import { createServiceClient } from '@/lib/supabase/server'
import { fetchDashboardKPIs } from '@/lib/kpiAggregation'
import DashboardClient from './DashboardClient'

export default async function AdminDashboardPage() {
  const svc = createServiceClient()

  // Parallel: basic counts + full KPI aggregation
  const [
    { count: totalLeads },
    { count: newLeads },
    { count: todayAppointments },
    kpis,
  ] = await Promise.all([
    svc.from('leads').select('*', { count: 'exact', head: true }),
    svc.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'new'),
    svc
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'booked')
      .gte('start_at', new Date().toISOString().slice(0, 10))
      .lt('start_at', new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)),
    fetchDashboardKPIs(),
  ])

  const quickStats = [
    { label: 'Total Leads', value: totalLeads ?? 0 },
    { label: 'New (uncontacted)', value: newLeads ?? 0 },
    { label: "Today's Appointments", value: todayAppointments ?? 0 },
  ]

  return (
    <DashboardClient
      acquisition={kpis.acquisition}
      profit={kpis.profit}
      risk={kpis.risk}
      weeklyTrends={kpis.weeklyTrends}
      exposure={kpis.exposure}
      decay={kpis.decay}
      shadow={kpis.shadow}
      weeklySummary={kpis.weeklySummary}
      quickStats={quickStats}
      gitHash={process.env.NEXT_PUBLIC_GIT_COMMIT_HASH ?? 'dev'}
    />
  )
}

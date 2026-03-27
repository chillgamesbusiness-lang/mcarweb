import Link from 'next/link'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export default async function InspectorIndexPage() {
  const authClient = await createClient()

  const {
    data: { user },
  } = await authClient.auth.getUser()

  if (!user) return null

  // Leads assigned to this inspector that are in inspection-relevant stages
  const svc = createServiceClient()
  const { data: leads, error } = await svc
    .from('leads')
    .select('id, reg, make, model, seller_name, seller_phone, status, appointments(start_at, type)')
    .eq('assigned_inspector_id', user.id)
    .in('status', ['appointment_booked', 'inspected'])
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[inspector] Query error:', error)
    return <div className="p-8 text-red-600">Error loading assignments. Please try refreshing the page.</div>
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold tracking-tight text-charcoal mb-1">My Inspections</h1>
      <p className="text-sm text-warm-gray mb-8">Assigned vehicles awaiting or completed inspection</p>

      <div className="border-t border-warm-border">
        {leads?.map((lead) => {
          const appt = Array.isArray(lead.appointments)
            ? lead.appointments[0]
            : lead.appointments

          return (
            <Link
              key={lead.id}
              href={`/inspector/${lead.id}`}
              className="group flex items-center gap-6 py-4 border-b border-warm-border-light hover:bg-surface-warm/50 px-2 -mx-2 transition-colors"
            >
              {/* Reg — bold anchor */}
              <span className="w-24 text-sm font-bold font-mono text-charcoal tracking-wide shrink-0">
                {lead.reg}
              </span>

              {/* Vehicle + seller */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-charcoal truncate">
                  {lead.make} {lead.model}
                  <span className="text-warm-gray ml-2">— {lead.seller_name}</span>
                </p>
                {appt && (
                  <p className="text-xs text-warm-gray/60 mt-0.5">
                    {appt.type === 'in_person' ? 'In-person' : 'Video'} ·{' '}
                    {new Date(appt.start_at).toLocaleString('en-GB', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </p>
                )}
              </div>

              {/* Status */}
              <span
                className={`text-xs font-medium rounded-full px-3 py-1 shrink-0 ${
                  lead.status === 'inspected'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-purple-100 text-purple-700'
                }`}
              >
                {lead.status === 'inspected' ? 'Submitted' : 'Pending'}
              </span>

              {/* Arrow */}
              <span className="text-warm-gray/30 group-hover:text-gold transition-colors shrink-0">
                {lead.status === 'inspected' ? 'View →' : 'Start →'}
              </span>
            </Link>
          )
        })}

        {(!leads || leads.length === 0) && (
          <p className="py-12 text-center text-warm-gray text-sm">
            No inspections assigned to you yet.
          </p>
        )}
      </div>
    </div>
  )
}

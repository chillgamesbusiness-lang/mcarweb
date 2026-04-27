import Link from 'next/link'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export default async function InspectorIndexPage() {
  const authClient = await createClient()

  const {
    data: { user },
  } = await authClient.auth.getUser()

  if (!user) return null

  // Any assigned non-terminal lead should be visible to the inspector immediately.
  const svc = createServiceClient()
  const { data: leads, error } = await svc
    .from('leads')
    .select('id, reg, make, model, seller_name, seller_phone, status, appointments(start_at, type)')
    .eq('assigned_inspector_id', user.id)
    .in('status', ['new', 'verified', 'contacted', 'appointment_booked', 'inspected', 'offer_made', 'no_response'])
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[inspector] Query error:', error)
    return <div className="p-8 text-red-600">Error loading assignments. Please try refreshing the page.</div>
  }

  return (
    <div className="p-4 sm:p-6 lg:p-10">
      <h1 className="text-2xl sm:text-3xl font-extrabold tracking-[-0.02em] text-foreground mb-1">My Inspections</h1>
      <p className="text-sm text-warm-gray mb-8">Assigned vehicles awaiting review or completed inspection</p>

      <div className="card-premium overflow-hidden">
        <div className="divide-y divide-warm-border/50">
        {leads?.map((lead) => {
          const appt = Array.isArray(lead.appointments)
            ? lead.appointments[0]
            : lead.appointments

          return (
            <Link
              key={lead.id}
              href={`/inspector/${lead.id}`}
              className="group flex items-center gap-3 sm:gap-6 py-3 sm:py-4 px-3 sm:px-6 hover:bg-gold/[0.03] transition-all duration-200"
            >
              {/* Reg — bold anchor */}
              <span className="w-20 sm:w-24 text-xs sm:text-sm font-bold font-mono text-foreground tracking-wide shrink-0">
                {lead.reg}
              </span>

              {/* Vehicle + seller */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground truncate font-medium">
                  {lead.make} {lead.model}
                  <span className="text-warm-gray ml-2 font-normal">— {lead.seller_name}</span>
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
                className={`text-xs font-semibold rounded-full px-3 py-1.5 shrink-0 ${
                  lead.status === 'inspected'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-purple-100 text-purple-700'
                }`}
              >
                {lead.status === 'inspected' ? 'Submitted' : 'Pending'}
              </span>

              {/* Arrow */}
              <span className="text-warm-gray/20 group-hover:text-gold transition-colors duration-200 shrink-0 font-medium">
                {lead.status === 'inspected' ? 'View →' : 'Start →'}
              </span>
            </Link>
          )
        })}

        {(!leads || leads.length === 0) && (
          <p className="py-16 text-center text-warm-gray text-sm">
            No inspections assigned to you yet.
          </p>
        )}
        </div>
      </div>
    </div>
  )
}

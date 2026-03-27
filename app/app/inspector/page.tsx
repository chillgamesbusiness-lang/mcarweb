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
      <h1 className="text-2xl font-bold text-charcoal mb-6">My Inspections</h1>

      <div className="space-y-3">
        {leads?.map((lead) => {
          const appt = Array.isArray(lead.appointments)
            ? lead.appointments[0]
            : lead.appointments

          return (
            <div
              key={lead.id}
              className="bg-surface rounded-lg border border-warm-border p-5 flex items-center justify-between gap-4"
            >
              <div>
                <p className="font-semibold text-charcoal">
                  {lead.reg}{' '}
                  <span className="font-normal text-warm-gray">
                    — {lead.make} {lead.model}
                  </span>
                </p>
                <p className="text-sm text-warm-gray mt-0.5">{lead.seller_name}</p>
                {appt && (
                  <p className="text-xs text-warm-gray mt-1">
                    {appt.type === 'in_person' ? 'In-person' : 'Video'} ·{' '}
                    {new Date(appt.start_at).toLocaleString('en-GB', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3">
                <span
                  className={`text-xs font-medium rounded-full px-3 py-1 ${
                    lead.status === 'inspected'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-purple-100 text-purple-700'
                  }`}
                >
                  {lead.status === 'inspected' ? 'Submitted' : 'Pending'}
                </span>
                <Link
                  href={`/inspector/${lead.id}`}
                  className="text-sm font-medium text-gold hover:underline"
                >
                  {lead.status === 'inspected' ? 'View →' : 'Start →'}
                </Link>
              </div>
            </div>
          )
        })}

        {(!leads || leads.length === 0) && (
          <div className="bg-surface rounded-lg border border-warm-border p-8 text-center text-warm-gray text-sm">
            No inspections assigned to you yet.
          </div>
        )}
      </div>
    </div>
  )
}

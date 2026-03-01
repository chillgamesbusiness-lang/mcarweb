import { notFound, redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { submitInspection } from './actions'
import PhotoUpload from '../PhotoUpload'

interface InspectorLeadPageProps {
  params: Promise<{ leadId: string }>
}

export default async function InspectorLeadPage({ params }: InspectorLeadPageProps) {
  const { leadId } = await params
  const authClient = await createClient()

  const {
    data: { user },
  } = await authClient.auth.getUser()

  if (!user) redirect('/login')

  const svc = createServiceClient()
  const { data: lead, error } = await svc
    .from('leads')
    .select('*, appointments(*)')
    .eq('id', leadId)
    .eq('assigned_inspector_id', user.id)
    .single()

  if (error || !lead) notFound()

  const { data: existingInspection } = await svc
    .from('inspections')
    .select('*')
    .eq('lead_id', leadId)
    .maybeSingle()

  const isSubmitted = !!existingInspection?.submitted_at

  // Storage paths (not signed yet)
  const storagePaths: string[] = isSubmitted
    ? (existingInspection?.photo_urls as string[] ?? [])
    : ((lead as Record<string, unknown>).pending_photo_urls as string[] ?? [])

  // Generate signed URLs server-side (1 hour expiry)
  let signedUrls: string[] = []
  if (storagePaths.length > 0) {
    const { data } = await svc.storage
      .from('inspection-photos')
      .createSignedUrls(storagePaths, 3600)
    signedUrls = (data ?? []).map((item) => item.signedUrl).filter(Boolean) as string[]
  }

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">
        Inspection: {lead.reg}
      </h1>
      <p className="text-sm text-gray-400 mb-8">
        {lead.make} {lead.model} - {lead.seller_name}
      </p>

      {isSubmitted && (
        <div className="mb-6 rounded-md bg-green-50 border border-green-200 p-3 text-sm text-green-700">
          Inspection submitted on{' '}
          {new Date(existingInspection!.submitted_at!).toLocaleString('en-GB')}. This form is read-only.
        </div>
      )}

      <div className="mb-6">
        <PhotoUpload
          leadId={leadId}
          signedUrls={signedUrls}
          disabled={isSubmitted}
        />
      </div>

      <form action={submitInspection} className="space-y-6">
        <input type="hidden" name="lead_id" value={leadId} />
        <ChecklistSection
          title="Bodywork"
          fields={['Paintwork', 'Panel gaps', 'Dents / scratches', 'Windscreen']}
          readOnly={isSubmitted}
          existing={existingInspection?.checklist_json as Record<string, string> | null}
        />
        <ChecklistSection
          title="Interior"
          fields={['Seats / upholstery', 'Dashboard / trim', 'Electronics', 'Boot']}
          readOnly={isSubmitted}
          existing={existingInspection?.checklist_json as Record<string, string> | null}
        />
        <ChecklistSection
          title="Mechanical"
          fields={['Engine', 'Gearbox', 'Brakes', 'Suspension']}
          readOnly={isSubmitted}
          existing={existingInspection?.checklist_json as Record<string, string> | null}
        />
        <ChecklistSection
          title="Tyres"
          fields={['Front left', 'Front right', 'Rear left', 'Rear right']}
          readOnly={isSubmitted}
          existing={existingInspection?.checklist_json as Record<string, string> | null}
        />

        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Recommended Offer</h2>
          <div className="flex items-center gap-2">
            <span className="text-gray-500 text-sm">GBP</span>
            <input
              type="number"
              name="recommended_offer"
              required={!isSubmitted}
              min={0}
              max={500000}
              defaultValue={existingInspection?.recommended_offer ?? undefined}
              disabled={isSubmitted}
              className="w-40 rounded-md border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50 disabled:text-gray-400"
              placeholder="0"
            />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Inspector Notes</h2>
          <textarea
            name="notes"
            rows={4}
            disabled={isSubmitted}
            defaultValue={existingInspection?.notes ?? ''}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50 disabled:text-gray-400"
            placeholder="Any additional observations..."
          />
        </div>

        {!isSubmitted && (
          <button
            type="submit"
            className="w-full rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            Submit Inspection
          </button>
        )}
      </form>
    </div>
  )
}

function ChecklistSection({
  title,
  fields,
  readOnly,
  existing,
}: {
  title: string
  fields: string[]
  readOnly: boolean
  existing: Record<string, string> | null
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <h2 className="text-sm font-semibold text-gray-700 mb-4">{title}</h2>
      <div className="space-y-3">
        {fields.map((field) => (
          <div key={field} className="flex items-center justify-between gap-4">
            <label className="text-sm text-gray-600 w-40">{field}</label>
            <select
              name={`checklist_${title}_${field}`}
              disabled={readOnly}
              required={!readOnly}
              defaultValue={existing?.[`${title}_${field}`] ?? ''}
              className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm disabled:bg-gray-50 disabled:text-gray-400"
            >
              <option value="">Select</option>
              <option value="good">Good</option>
              <option value="ok">OK</option>
              <option value="poor">Poor</option>
              <option value="na">N/A</option>
            </select>
          </div>
        ))}
      </div>
    </div>
  )
}

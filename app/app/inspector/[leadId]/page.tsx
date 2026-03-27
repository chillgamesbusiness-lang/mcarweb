import { notFound, redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { submitInspection } from './actions'
import PhotoUpload from '../PhotoUpload'
import { SubmitButton } from '@/app/components/SubmitButton'

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
    <div className="p-6 lg:p-10 max-w-2xl">
      <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-warm-gray mb-2">Inspection</p>
      <h1 className="text-3xl font-extrabold tracking-tight text-charcoal leading-none mb-1">
        {lead.reg}
      </h1>
      <p className="text-sm text-charcoal-light mb-8">
        {lead.make} {lead.model} — {lead.seller_name}
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

        <div className="mb-8 pb-8 border-b border-warm-border">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-warm-gray mb-3">Recommended Offer</p>
          <div className="flex items-baseline gap-2">
            <span className="text-warm-gray text-sm">£</span>
            <input
              type="number"
              name="recommended_offer"
              required={!isSubmitted}
              min={0}
              max={500000}
              defaultValue={existingInspection?.recommended_offer ?? undefined}
              disabled={isSubmitted}
              className="w-40 border-b border-warm-border bg-transparent px-1 py-2 text-lg font-bold text-charcoal focus:border-gold focus:outline-none disabled:text-warm-gray disabled:border-warm-border-light"
              placeholder="0"
            />
          </div>
        </div>

        <div className="mb-8 pb-8 border-b border-warm-border">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-warm-gray mb-3">Notes</p>
          <textarea
            name="notes"
            rows={3}
            disabled={isSubmitted}
            defaultValue={existingInspection?.notes ?? ''}
            className="w-full border-b border-warm-border bg-transparent px-1 py-2 text-sm text-charcoal placeholder:text-warm-gray/50 focus:border-gold focus:outline-none resize-y disabled:text-warm-gray disabled:border-warm-border-light"
            placeholder="Any additional observations..."
          />
        </div>

        {!isSubmitted && (
          <SubmitButton
            loadingText="Submitting…"
            className="text-sm font-semibold text-gold hover:text-gold-dark transition-colors disabled:opacity-60"
          >
            Submit Inspection
          </SubmitButton>
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
    <div className="mb-8 pb-8 border-b border-warm-border">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-warm-gray mb-3">{title}</p>
      <div className="space-y-2">
        {fields.map((field) => (
          <div key={field} className="flex items-center justify-between gap-4">
            <label className="text-sm text-charcoal-light w-40">{field}</label>
            <select
              name={`checklist_${title}_${field}`}
              disabled={readOnly}
              required={!readOnly}
              defaultValue={existing?.[`${title}_${field}`] ?? ''}
              className="flex-1 border-b border-warm-border bg-transparent px-1 py-1.5 text-sm text-charcoal focus:border-gold focus:outline-none disabled:text-warm-gray disabled:border-warm-border-light"
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

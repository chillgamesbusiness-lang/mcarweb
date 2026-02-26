import { notFound, redirect } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { verifyOfferToken } from '@/lib/offerSession'
import { sendBookingConfirmation } from '@/lib/email'
import BookForm from './BookForm'

interface BookPageProps {
  searchParams: Promise<{ leadId?: string; token?: string }>
}

export default async function OfferBookPage({ searchParams }: BookPageProps) {
  const { leadId, token } = await searchParams

  if (!leadId) notFound()

  const serviceClient = createServiceClient()

  const { data: lead, error } = await serviceClient
    .from('leads')
    .select('*')
    .eq('id', leadId)
    .single()

  if (error || !lead) notFound()

  // ── Quote expiry check (server-side enforcement) ──────────────────────
  // Check valuation snapshot for 7-day expiry
  const { data: snapshot } = await serviceClient
    .from('valuation_snapshots')
    .select('created_at')
    .eq('lead_id', leadId)
    .maybeSingle()

  const QUOTE_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days
  const quoteExpired = snapshot
    ? Date.now() > new Date(snapshot.created_at).getTime() + QUOTE_TTL_MS
    : false

  if (quoteExpired) {
    redirect('/offer?error=Your+quote+has+expired.+Please+get+a+new+valuation.')
  }

  // Decode valuation from token (if present) for richer display
  const payload = token ? verifyOfferToken(token) : null
  const valuation = payload?.valuation ?? null
  const autoQuote = valuation?.quoteMode === 'auto' || (lead.estimated_min > 0 && !valuation)

  async function submitBooking(formData: FormData) {
    'use server'

    const type = formData.get('type') as string
    const slot = formData.get('slot') as string

    if (!type || !['in_person', 'video'].includes(type)) {
      redirect(`/offer/book?leadId=${leadId}&error=Invalid+appointment+type`)
    }

    if (!slot) {
      redirect(`/offer/book?leadId=${leadId}&error=Please+select+a+time+slot`)
    }

    const svc = createServiceClient()

    // ── Re-check quote expiry at submit time ──────────────────────────
    const { data: snap } = await svc
      .from('valuation_snapshots')
      .select('created_at')
      .eq('lead_id', leadId)
      .maybeSingle()

    const QUOTE_TTL = 7 * 24 * 60 * 60 * 1000
    if (snap && Date.now() > new Date(snap.created_at).getTime() + QUOTE_TTL) {
      // Mark lead as expired
      await svc.from('leads').update({ status: 'expired' }).eq('id', leadId)
      await svc.from('audit_log').insert({
        lead_id: leadId,
        action: 'status_change',
        old_value: { status: lead.status },
        new_value: { status: 'expired', reason: 'quote_expired_at_booking' },
      })
      redirect('/offer?error=Your+quote+has+expired.+Please+get+a+new+valuation.')
    }

    // Parse slot into start/end times
    const startAt = new Date(slot)
    const endAt = new Date(startAt.getTime() + 30 * 60 * 1000) // 30 min slots

    // Create appointment
    const { error: apptErr } = await svc
      .from('appointments')
      .insert({
        lead_id: leadId,
        type,
        start_at: startAt.toISOString(),
        end_at: endAt.toISOString(),
        status: 'booked',
        location_or_link: type === 'video' ? 'Link will be sent via email' : 'Address to be confirmed',
      })

    if (apptErr) {
      redirect(`/offer/book?leadId=${leadId}&error=Failed+to+book.+Please+try+again.`)
    }

    // Update lead status
    await svc
      .from('leads')
      .update({ status: 'appointment_booked' })
      .eq('id', leadId)

    // Audit log
    await svc.from('audit_log').insert({
      lead_id: leadId,
      action: 'status_change',
      old_value: { status: 'new' },
      new_value: { status: 'appointment_booked' },
    })

    // Send booking confirmation email (fire-and-forget)
    if (lead) {
      sendBookingConfirmation({
        customerName: lead.seller_name,
        customerEmail: lead.seller_email,
        reg: lead.reg,
        make: lead.make ?? 'Unknown',
        model: lead.model ?? '',
        year: lead.year ?? 0,
        appointmentType: type,
        appointmentDate: startAt.toLocaleString('en-GB', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        estimatedMin: lead.estimated_min ?? 0,
        estimatedMax: lead.estimated_max ?? 0,
      }).catch(() => {})
    }

    redirect('/offer/done')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Book Appointment</h1>
          <p className="mt-2 text-gray-500">Choose how and when you would like to meet</p>
        </div>

        {/* Offer summary — varies based on autoQuote */}
        {autoQuote && lead.estimated_min > 0 ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-5 mb-6 text-center">
            <p className="text-sm text-green-700 mb-1">Your estimated offer range</p>
            <p className="text-2xl font-bold text-green-800">
              £{lead.estimated_min?.toLocaleString()} – £{lead.estimated_max?.toLocaleString()}
            </p>
            <p className="text-xs text-green-600 mt-1">
              {lead.reg} — {lead.make} {lead.model} ({lead.year})
            </p>
            {valuation && valuation.riskTier !== 'low' && (
              <p className="text-xs text-green-500 mt-2">
                Final offer confirmed at appointment after vehicle inspection
              </p>
            )}
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-5 mb-6 text-center">
            <p className="text-sm text-amber-700 mb-1">Valuation requires review</p>
            <p className="text-lg font-semibold text-amber-800">
              We&apos;ll provide a personalised offer at your appointment
            </p>
            <p className="text-xs text-amber-600 mt-1">
              {lead.reg} — {lead.make} {lead.model} ({lead.year})
            </p>
            <p className="text-xs text-amber-500 mt-2">
              Our specialist will assess your vehicle and provide a competitive offer
            </p>
          </div>
        )}

        {/* Quote expiry notice */}
        {snapshot && (
          <p className="text-xs text-gray-400 text-center mb-4">
            This quote is valid until{' '}
            {new Date(new Date(snapshot.created_at).getTime() + QUOTE_TTL_MS).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </p>
        )}

        <BookForm submitBooking={submitBooking} />
      </div>
    </div>
  )
}

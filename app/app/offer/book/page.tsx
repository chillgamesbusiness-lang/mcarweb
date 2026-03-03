import { notFound, redirect } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { verifyOfferToken } from '@/lib/offerSession'
import { sendBookingConfirmation } from '@/lib/email'
import BookForm from './BookForm'
import TrackEvent from '@/app/components/TrackEvent'
import OfferShell from '../OfferShell'
import StepIndicator from '../StepIndicator'

export const metadata = {
  title: 'Book Appointment',
  description: 'Schedule your vehicle inspection appointment with MCar.',
  robots: { index: false, follow: false },
}

interface BookPageProps {
  searchParams: Promise<{ leadId?: string; token?: string }>
}

export default async function OfferBookPage({ searchParams }: BookPageProps) {
  const { leadId, token } = await searchParams

  // ── Token gate: valid signed token required to access booking ────────
  if (!token || !leadId) notFound()

  const payload = verifyOfferToken(token)
  if (!payload) {
    redirect('/offer?error=Session+expired+or+invalid.+Please+start+again.')
  }

  const serviceClient = createServiceClient()

  const { data: lead, error } = await serviceClient
    .from('leads')
    .select('id, reg, make, model, year, seller_name, seller_email, seller_phone, seller_postcode, status, estimated_min, estimated_max, finance_status')
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

  const valuation = payload?.valuation ?? null
  const autoQuote = valuation?.quoteMode === 'auto' || (lead.estimated_min > 0 && !valuation)

  async function submitBooking(formData: FormData) {
    'use server'

    const type = formData.get('type') as string
    const slot = formData.get('slot') as string

    if (!type || !['in_person', 'video'].includes(type)) {
      redirect(`/offer/book?leadId=${leadId}&token=${encodeURIComponent(token!)}&error=Invalid+appointment+type`)
    }

    if (!slot) {
      redirect(`/offer/book?leadId=${leadId}&token=${encodeURIComponent(token!)}&error=Please+select+a+time+slot`)
    }

    const svc = createServiceClient()

    // Guard: lead must exist (captured from outer scope)
    if (!lead) redirect('/offer?error=Lead+not+found')

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

    // ── Slot collision check: prevent double-booking ──────────────────
    const { data: existingSlot } = await svc
      .from('appointments')
      .select('id')
      .eq('status', 'booked')
      .lt('start_at', endAt.toISOString())
      .gt('end_at', startAt.toISOString())
      .limit(1)
      .maybeSingle()

    if (existingSlot) {
      redirect(`/offer/book?leadId=${leadId}&token=${encodeURIComponent(token!)}&error=That+slot+was+just+taken.+Please+choose+another.`)
    }

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
      redirect(`/offer/book?leadId=${leadId}&token=${encodeURIComponent(token!)}&error=Failed+to+book.+Please+try+again.`)
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
      old_value: { status: lead.status },
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
    <OfferShell>
      {/* Fire once on mount — user passed contact + OTP step */}
      <TrackEvent event="contact_submitted" />
      <StepIndicator current={3} />

      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Book Appointment</h1>
        <p className="mt-2 text-gray-500 text-sm">Choose how and when you would like to meet</p>
      </div>

      {/* Offer summary — profit simulation centrepiece */}
      {autoQuote && lead.estimated_min > 0 ? (
        <div className="bg-white rounded-xl shadow-md ring-1 ring-green-100 p-6 mb-6 text-center">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Your Estimated Offer</p>
          {/* Big bold midpoint */}
          <p className="text-4xl font-extrabold text-gray-900 mb-1">
            £{Math.round(((lead.estimated_min ?? 0) + (lead.estimated_max ?? 0)) / 2).toLocaleString()}
          </p>
          {/* Smaller min/max range */}
          <p className="text-sm text-gray-400">
            £{lead.estimated_min?.toLocaleString()} – £{lead.estimated_max?.toLocaleString()}
          </p>
          <p className="text-xs text-gray-400 mt-2">
            {lead.reg} — {lead.make} {lead.model} ({lead.year})
          </p>
          {valuation && valuation.riskTier !== 'low' && (
            <p className="text-xs text-gray-400 mt-3">
              Final offer confirmed at appointment after inspection
            </p>
          )}
          {/* Customer explanation bullets */}
          {valuation?.customerBullets && valuation.customerBullets.length > 0 && (
            <ul className="mt-4 text-left space-y-1.5 border-t border-gray-50 pt-4">
              {valuation.customerBullets.map((b: string, i: number) => (
                <li key={i} className="text-xs text-gray-500 flex items-start gap-1.5">
                  <span className="mt-0.5 shrink-0 text-green-500">✓</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm ring-1 ring-amber-100 p-6 mb-6 text-center">
          <p className="text-xs text-amber-500 uppercase tracking-wider mb-2">Review Required</p>
          <p className="text-lg font-semibold text-gray-900">
            We&apos;ll provide a personalised offer at your appointment
          </p>
          <p className="text-xs text-gray-400 mt-2">
            {lead.reg} — {lead.make} {lead.model} ({lead.year})
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Our specialist will assess your vehicle and provide a competitive offer
          </p>
        </div>
      )}

      {/* Quote expiry notice */}
      {snapshot && (
        <p className="text-xs text-gray-300 text-center mb-4">
          Quote valid until{' '}
          {new Date(new Date(snapshot.created_at).getTime() + QUOTE_TTL_MS).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </p>
      )}

      <BookForm submitBooking={submitBooking} />
    </OfferShell>
  )
}

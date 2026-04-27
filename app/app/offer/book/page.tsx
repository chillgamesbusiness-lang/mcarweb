import { notFound, redirect } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { verifyOfferToken } from '@/lib/offerSession'
import { sendBookingConfirmation } from '@/lib/email'
import { writeAuditLog } from '@/lib/auditLog'
import { formatBookingSlotLabel, validateBookingSlot } from '@/lib/bookingSlots'
import { createRequestId, reportError } from '@/lib/reportError'
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
  const { data: snapshot, error: snapshotError } = await serviceClient
    .from('valuation_snapshots')
    .select('created_at, result_min, result_max, result_midpoint, auto_quote, customer_explanation, valuation_engine_version, engine_version')
    .eq('lead_id', leadId)
    .maybeSingle()

  const QUOTE_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days
  const nowMs = new Date().getTime()
  if (!snapshot || snapshotError) {
    redirect('/offer?error=Your+quote+has+expired.+Please+get+a+new+valuation.')
  }

  const activeSnapshot = snapshot
  if (nowMs > new Date(activeSnapshot.created_at).getTime() + QUOTE_TTL_MS) {
    redirect('/offer?error=Your+quote+has+expired.+Please+get+a+new+valuation.')
  }

  const valuation = payload?.valuation ?? null
  const autoQuote = activeSnapshot.auto_quote === true

  async function submitBooking(formData: FormData) {
    'use server'
    const requestId = createRequestId('booking')

    const currentLeadId = leadId!
    const currentToken = token!
    const type = formData.get('type') as string
    const slot = formData.get('slot') as string
    const submitId = (formData.get('submitId') as string | null)?.trim() ?? ''

    if (!type || !['in_person', 'video'].includes(type)) {
      redirect(`/offer/book?leadId=${currentLeadId}&token=${encodeURIComponent(currentToken)}&error=Invalid+appointment+type`)
    }

    if (!slot) {
      redirect(`/offer/book?leadId=${currentLeadId}&token=${encodeURIComponent(currentToken)}&error=Please+select+a+time+slot`)
    }

    const svc = createServiceClient()

    // Guard: lead must exist (captured from outer scope)
    if (!lead) redirect('/offer?error=Lead+not+found')

    // ── Re-check quote expiry at submit time ──────────────────────────
    const { data: snap, error: snapError } = await svc
      .from('valuation_snapshots')
      .select('created_at')
      .eq('lead_id', currentLeadId)
      .maybeSingle()

    const QUOTE_TTL = 7 * 24 * 60 * 60 * 1000
    if (snapError || !snap || new Date().getTime() > new Date(snap.created_at).getTime() + QUOTE_TTL) {
      // Mark lead as expired
      await svc.from('leads').update({ status: 'expired' }).eq('id', currentLeadId)
      await writeAuditLog(svc, {
        leadId: currentLeadId,
        action: 'status_change',
        actorKind: 'public_user',
        oldValue: { status: lead.status },
        newValue: { status: 'expired', reason: snap ? 'quote_expired_at_booking' : 'missing_snapshot_at_booking' },
        requestId,
      }, { area: 'offer_booking', blocking: false })
      redirect('/offer?error=Your+quote+has+expired.+Please+get+a+new+valuation.')
    }

    const slotValidation = validateBookingSlot(slot)
    if (!slotValidation.valid || !slotValidation.startAt || !slotValidation.endAt) {
      redirect(`/offer/book?leadId=${currentLeadId}&token=${encodeURIComponent(currentToken)}&error=${encodeURIComponent(slotValidation.error ?? 'Invalid appointment slot')}`)
    }

    const startAt = slotValidation.startAt
    const endAt = slotValidation.endAt

    const { data: existingLeadBooking } = await svc
      .from('appointments')
      .select('id')
      .eq('lead_id', currentLeadId)
      .eq('status', 'booked')
      .limit(1)
      .maybeSingle()

    if (existingLeadBooking) {
      redirect('/offer/done')
    }

    if (submitId) {
      const { data: existingSubmit } = await svc
        .from('appointments')
        .select('id')
        .eq('booking_submit_id', submitId)
        .limit(1)
        .maybeSingle()

      if (existingSubmit) {
        redirect('/offer/done')
      }
    }

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
      redirect(`/offer/book?leadId=${currentLeadId}&token=${encodeURIComponent(currentToken)}&error=That+slot+was+just+taken.+Please+choose+another.`)
    }

    // Create appointment
    const { error: apptErr } = await svc
      .from('appointments')
      .insert({
        lead_id: currentLeadId,
        type,
        start_at: startAt.toISOString(),
        end_at: endAt.toISOString(),
        status: 'booked',
        location_or_link: type === 'video' ? 'Link will be sent via email' : 'Address to be confirmed',
        booking_submit_id: submitId || null,
      })

    if (apptErr) {
      redirect(`/offer/book?leadId=${currentLeadId}&token=${encodeURIComponent(currentToken)}&error=Failed+to+book.+Please+try+again.`)
    }

    // Update lead status
    const { error: leadUpdateErr } = await svc
      .from('leads')
      .update({ status: 'appointment_booked' })
      .eq('id', currentLeadId)

    if (leadUpdateErr) {
      await reportError(leadUpdateErr, {
        severity: 'critical',
        area: 'offer_booking',
        operation: 'lead_status_update',
        leadId: currentLeadId,
        requestId,
      })
      redirect(`/offer/book?leadId=${currentLeadId}&token=${encodeURIComponent(currentToken)}&error=Failed+to+book.+Please+try+again.`)
    }

    // Audit log
    await writeAuditLog(svc, {
      leadId: currentLeadId,
      action: 'status_change',
      actorKind: 'public_user',
      oldValue: { status: lead.status },
      newValue: { status: 'appointment_booked', appointment_start_at: startAt.toISOString() },
      requestId,
    }, { area: 'offer_booking', blocking: false })

    await writeAuditLog(svc, {
      leadId: currentLeadId,
      action: 'booking_created',
      actorKind: 'public_user',
      oldValue: null,
      newValue: {
        appointment_type: type,
        start_at: startAt.toISOString(),
        end_at: endAt.toISOString(),
      },
      requestId,
    }, { area: 'offer_booking', blocking: false })

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
        appointmentDate: formatBookingSlotLabel(startAt),
        estimatedMin: lead.estimated_min ?? 0,
        estimatedMax: lead.estimated_max ?? 0,
      }).catch((emailErr) => reportError(emailErr, {
        severity: 'error',
        area: 'email',
        operation: 'booking_confirmation',
        leadId: currentLeadId,
        requestId,
        provider: 'resend',
      }))
    }

    redirect('/offer/done')
  }

  return (
    <OfferShell>
      {/* Fire once on mount — user passed contact + OTP step */}
      <TrackEvent event="contact_submitted" />
      <StepIndicator current={3} />

      <div className="text-center mb-8 animate-fade-in-up">
        <h1 className="text-3xl font-extrabold text-foreground tracking-[-0.02em]">Book Appointment</h1>
        <p className="mt-2 text-warm-gray text-sm">Choose how and when you would like to meet</p>
      </div>

      {/* Offer summary */}
      {autoQuote && activeSnapshot.result_min > 0 ? (
        <div className="card-premium p-8 mb-6 text-center animate-slide-up">
          <p className="text-xs text-warm-gray uppercase tracking-widest mb-4 font-semibold">Your Estimated Valuation</p>
          {/* Big bold midpoint */}
          <p className="text-5xl font-extrabold gradient-gold-text mb-1">
            £{Math.round(activeSnapshot.result_midpoint ?? ((activeSnapshot.result_min + activeSnapshot.result_max) / 2)).toLocaleString()}
          </p>
          {/* Smaller min/max range */}
          <p className="text-sm text-warm-gray">
            £{activeSnapshot.result_min?.toLocaleString()} – £{activeSnapshot.result_max?.toLocaleString()}
          </p>
          <p className="text-xs text-warm-gray mt-3">
            {lead.reg} — {lead.make} {lead.model} ({lead.year})
          </p>
          {valuation && valuation.riskTier !== 'low' && (
            <p className="text-xs text-warm-gray mt-3">
              Final offer confirmed at appointment after inspection
            </p>
          )}
          {/* Customer explanation bullets */}
          {valuation?.customerBullets && valuation.customerBullets.length > 0 && (
            <ul className="mt-5 text-left space-y-2 border-t border-warm-border pt-5">
              {valuation.customerBullets.map((b: string, i: number) => (
                <li key={i} className="text-xs text-warm-gray flex items-start gap-2">
                  <svg className="w-4 h-4 mt-0.5 shrink-0 text-gold" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="card-premium p-8 mb-6 text-center animate-slide-up">
          <p className="text-xs text-gold-dark uppercase tracking-widest mb-2 font-semibold">Review Required</p>
          <p className="text-lg font-semibold text-foreground">
            We&apos;ll provide a personalised offer at your appointment
          </p>
          <p className="text-xs text-warm-gray mt-3">
            {lead.reg} — {lead.make} {lead.model} ({lead.year})
          </p>
          <p className="text-xs text-warm-gray mt-2">
            Our specialist will assess your vehicle and provide a competitive offer
          </p>
        </div>
      )}

      {/* Quote expiry notice */}
      {activeSnapshot && (
        <p className="text-xs text-warm-gray text-center mb-4">
          Quote valid until{' '}
          {new Date(new Date(activeSnapshot.created_at).getTime() + QUOTE_TTL_MS).toLocaleDateString('en-GB', {
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

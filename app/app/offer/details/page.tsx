import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { verifyOfferToken, createOfferToken } from '@/lib/offerSession'
import DetailsForm from './DetailsForm'
import OfferShell from '../OfferShell'
import StepIndicator from '../StepIndicator'

export const metadata = {
  title: 'Vehicle Details',
  description: 'Enter your vehicle mileage and condition for an accurate valuation.',
  robots: { index: false, follow: false },
}

interface DetailsPageProps {
  searchParams: Promise<{ token?: string }>
}

export default async function OfferDetailsPage({ searchParams }: DetailsPageProps) {
  const { token } = await searchParams
  console.log(`[offer/details] token present=${!!token}, length=${token?.length ?? 0}, dots=${token?.split('.').length ?? 0}`)
  const payload = token ? verifyOfferToken(token) : null

  if (!payload) {
    console.error(`[offer/details] verifyOfferToken returned null — redirecting to /offer`)
    redirect('/offer?error=Session+expired+or+invalid.+Please+start+again.')
  }

  // Pre-fill mileage from MOT analysis if available
  const defaultMileage = payload.motSummary?.latestMileage ?? null

  async function submitDetails(formData: FormData) {
    'use server'

    const mileageRaw = formData.get('mileage') as string
    const condition = formData.get('condition') as string

    const mileage = parseInt(mileageRaw, 10)
    if (isNaN(mileage) || mileage < 0 || mileage > 500000) {
      redirect('/offer?error=Invalid+mileage')
    }

    if (!['excellent', 'good', 'fair', 'poor'].includes(condition)) {
      redirect('/offer?error=Invalid+condition')
    }

    // Create new token with mileage + condition added, carry motSummary through
    const newToken = createOfferToken({
      reg: payload!.reg,
      vehicle: payload!.vehicle,
      motSummary: payload!.motSummary,
      mileage,
      condition: condition as 'excellent' | 'good' | 'fair' | 'poor',
    })

    console.log(`[offer/details] submitDetails: newToken length=${newToken.length}, parts=${newToken.split('.').length}`)

    // Store token in cookie as primary transport (immune to URL encoding issues)
    const cookieStore = await cookies()
    cookieStore.set('offer_token', newToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/offer',
      maxAge: 7200, // 2 hours
    })

    redirect(`/offer/contact?token=${encodeURIComponent(newToken)}`)
  }

  return (
    <OfferShell>
      <StepIndicator current={1} />

      <div className="text-center mb-8 animate-fade-in-up">
        <h1 className="text-3xl font-extrabold text-charcoal-deep tracking-[-0.02em]">Vehicle Details</h1>
        <p className="mt-2 text-warm-gray text-sm">Confirm your vehicle info below</p>
      </div>

      {/* Vehicle summary card */}
      <div className="card-premium p-6 mb-6 animate-slide-up">
        <div className="text-center">
          <span className="inline-flex items-center gap-2 bg-charcoal-deep text-white font-mono text-lg font-bold px-5 py-2.5 rounded-xl mb-4 shadow-md">
            <span className="text-[9px] text-gold font-sans">GB</span>
            {payload.reg}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
            <Field label="Make" value={payload.vehicle.make} />
            <Field label="Model" value={payload.vehicle.model || '—'} />
            <Field label="Year" value={payload.vehicle.year.toString()} />
            <Field label="Fuel" value={payload.vehicle.fuel} />
            {payload.vehicle.colour && <Field label="Colour" value={payload.vehicle.colour} />}
            {payload.vehicle.engineCapacity != null && (
              <Field label="Engine" value={`${payload.vehicle.engineCapacity} cc`} />
            )}
            {payload.vehicle.taxStatus && (
              <Field label="Tax Status" value={payload.vehicle.taxStatus} />
            )}
            {payload.vehicle.taxDueDate && (
              <Field label="Tax Due" value={payload.vehicle.taxDueDate} />
            )}
            {payload.vehicle.motStatus && (
              <Field label="MOT Status" value={payload.vehicle.motStatus} />
            )}
            {payload.vehicle.motExpiryDate && (
              <Field label="MOT Expiry" value={payload.vehicle.motExpiryDate} />
            )}
          </div>
        </div>

      {/* MOT summary card (if available) */}
      {payload.motSummary && (
        <div className="card-premium p-5 mb-6 text-sm animate-slide-up" style={{ animationDelay: '100ms' }}>
          <h3 className="font-bold text-charcoal-deep mb-3 flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg gradient-gold flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </span>
            MOT Summary
          </h3>
          <div className="grid grid-cols-2 gap-3 text-charcoal-light">
              <div>
                <span className="text-warm-gray text-xs">MOT Remaining</span>
                <p className="font-medium">
                  {payload.motSummary.monthsRemaining > 0
                    ? `${payload.motSummary.monthsRemaining} months`
                    : 'Expired'}
                </p>
              </div>
              {payload.motSummary.latestMileage != null && (
                <div>
                  <span className="text-warm-gray text-xs">Last Recorded Mileage</span>
                  <p className="font-medium">{payload.motSummary.latestMileage.toLocaleString()} mi</p>
                </div>
              )}
              <div>
                <span className="text-warm-gray text-xs">Est. Annual Mileage</span>
                <p className="font-medium">{payload.motSummary.annualMileageEstimate.toLocaleString()} mi/yr</p>
              </div>
              <div>
                <span className="text-warm-gray text-xs">Recent Failures</span>
                <p className="font-medium">{payload.motSummary.recentFailCount}</p>
              </div>
            </div>
            {payload.motSummary.mileageConsistency !== 'consistent' && (
              <div className="mt-3 rounded-lg bg-gold-light/60 border border-gold/20 px-3 py-2 text-xs text-gold-dark flex items-start gap-1.5">
                <svg className="w-4 h-4 shrink-0 mt-0.5 text-gold" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86l-8.6 14.86A1 1 0 002.56 20h18.88a1 1 0 00.87-1.28l-8.6-14.86a1 1 0 00-1.72 0z" /></svg>
                <span>{payload.motSummary.mileageConsistency === 'rollback_detected'
                  ? 'Mileage discrepancy detected in MOT history'
                  : 'Unusual mileage pattern detected'}</span>
              </div>
            )}
          </div>
        )}

      <DetailsForm submitDetails={submitDetails} defaultMileage={defaultMileage} />
    </OfferShell>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-warm-gray text-xs font-medium">{label}</span>
      <p className="text-charcoal-deep font-semibold">{value}</p>
    </div>
  )
}

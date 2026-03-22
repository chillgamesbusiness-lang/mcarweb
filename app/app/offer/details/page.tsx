import { redirect } from 'next/navigation'
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

    redirect(`/offer/contact?token=${encodeURIComponent(newToken)}`)
  }

  return (
    <OfferShell>
      <StepIndicator current={1} />

      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Vehicle Details</h1>
        <p className="mt-2 text-gray-500 text-sm">Confirm your vehicle info below</p>
      </div>

      {/* Vehicle summary card */}
      <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-100 p-5 mb-6">
        <div className="text-center">
          <span className="inline-block bg-yellow-50 text-yellow-700 font-mono text-lg font-bold px-4 py-1.5 rounded-lg mb-3 ring-1 ring-yellow-200">
            {payload.reg}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2.5 text-sm">
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
        <div className="bg-blue-50/60 rounded-xl ring-1 ring-blue-100 p-4 mb-6 text-sm">
          <h3 className="font-semibold text-blue-900 mb-2">MOT Summary</h3>
          <div className="grid grid-cols-2 gap-2.5 text-blue-800">
              <div>
                <span className="text-blue-500 text-xs">MOT Remaining</span>
                <p className="font-medium">
                  {payload.motSummary.monthsRemaining > 0
                    ? `${payload.motSummary.monthsRemaining} months`
                    : 'Expired'}
                </p>
              </div>
              {payload.motSummary.latestMileage != null && (
                <div>
                  <span className="text-blue-500 text-xs">Last Recorded Mileage</span>
                  <p className="font-medium">{payload.motSummary.latestMileage.toLocaleString()} mi</p>
                </div>
              )}
              <div>
                <span className="text-blue-500 text-xs">Est. Annual Mileage</span>
                <p className="font-medium">{payload.motSummary.annualMileageEstimate.toLocaleString()} mi/yr</p>
              </div>
              <div>
                <span className="text-blue-500 text-xs">Recent Failures</span>
                <p className="font-medium">{payload.motSummary.recentFailCount}</p>
              </div>
            </div>
            {payload.motSummary.mileageConsistency !== 'consistent' && (
              <div className="mt-2 rounded-lg bg-amber-50 ring-1 ring-amber-200 px-3 py-1.5 text-xs text-amber-700">
                {payload.motSummary.mileageConsistency === 'rollback_detected'
                  ? '⚠️ Mileage discrepancy detected in MOT history'
                  : '⚠️ Unusual mileage pattern detected'}
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
      <span className="text-gray-400 text-xs">{label}</span>
      <p className="text-gray-900 font-medium">{value}</p>
    </div>
  )
}

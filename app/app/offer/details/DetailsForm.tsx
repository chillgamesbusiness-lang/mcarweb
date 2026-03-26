'use client'

import { useFormStatus } from 'react-dom'

interface DetailsFormProps {
  submitDetails: (formData: FormData) => Promise<void>
  defaultMileage?: number | null
}

/** Submit button with automatic pending state — prevents double-submit */
function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-gold px-4 py-3.5 text-sm font-semibold text-white hover:bg-gold-dark transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {pending ? 'Processing…' : 'Continue'}
    </button>
  )
}

export default function DetailsForm({ submitDetails, defaultMileage }: DetailsFormProps) {
  return (
    <form action={submitDetails} className="bg-surface rounded-2xl shadow-lg border border-warm-border p-7 space-y-5">
      <div>
        <label htmlFor="mileage" className="block text-sm font-medium text-charcoal mb-1.5">
          Current Mileage
        </label>
        <input
          id="mileage"
          name="mileage"
          type="number"
          min={0}
          max={500000}
          required
          defaultValue={defaultMileage ?? undefined}
          placeholder="e.g. 45000"
          className="w-full rounded-lg border border-warm-border px-4 py-3 text-sm text-charcoal focus:border-gold focus:ring-2 focus:ring-gold/15 outline-none transition-shadow bg-surface"
        />
        {defaultMileage != null && (
          <p className="text-xs text-warm-gray mt-1.5">
            Pre-filled from MOT records — please update if different
          </p>
        )}
      </div>

      <div>
        <label htmlFor="condition" className="block text-sm font-medium text-charcoal mb-1.5">
          Overall Condition
        </label>
        <select
          id="condition"
          name="condition"
          required
          defaultValue=""
          className="w-full rounded-lg border border-warm-border px-4 py-3 text-sm text-charcoal focus:border-gold focus:ring-2 focus:ring-gold/15 outline-none transition-shadow bg-surface"
        >
          <option value="" disabled>Select condition</option>
          <option value="excellent">Excellent</option>
          <option value="good">Good</option>
          <option value="fair">Fair</option>
          <option value="poor">Poor</option>
        </select>
      </div>

      <SubmitButton />
    </form>
  )
}

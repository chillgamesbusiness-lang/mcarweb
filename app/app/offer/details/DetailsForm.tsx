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
      className="w-full rounded-2xl gradient-gold px-4 py-4 text-[15px] font-bold text-white transition-all duration-300 shadow-lg shadow-gold/20 hover:shadow-xl hover:shadow-gold/30 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {pending ? 'Processing…' : 'Continue'}
    </button>
  )
}

export default function DetailsForm({ submitDetails, defaultMileage }: DetailsFormProps) {
  return (
    <form action={submitDetails} className="card-premium p-7 sm:p-8 space-y-5 animate-slide-up">
      <div>
        <label htmlFor="mileage" className="block text-sm font-semibold text-foreground mb-2">
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
          className="w-full rounded-xl border border-warm-border px-4 py-3.5 text-sm text-foreground input-premium focus:outline-none bg-[var(--input-bg)]"
        />
        {defaultMileage != null && (
          <p className="text-xs text-warm-gray mt-2 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-gold" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" /></svg>
            Pre-filled from MOT records — please update if different
          </p>
        )}
      </div>

      <div>
        <label htmlFor="condition" className="block text-sm font-semibold text-foreground mb-2">
          Overall Condition
        </label>
        <select
          id="condition"
          name="condition"
          required
          defaultValue=""
          className="w-full rounded-xl border border-warm-border px-4 py-3.5 text-sm text-foreground input-premium focus:outline-none bg-[var(--input-bg)] appearance-none"
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

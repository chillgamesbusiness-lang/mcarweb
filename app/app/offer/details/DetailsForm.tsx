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
      className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {pending ? 'Processing…' : 'Continue'}
    </button>
  )
}

export default function DetailsForm({ submitDetails, defaultMileage }: DetailsFormProps) {
  return (
    <form action={submitDetails} className="bg-white rounded-xl shadow-sm ring-1 ring-gray-100 p-6 space-y-5">
      <div>
        <label htmlFor="mileage" className="block text-sm font-medium text-gray-700 mb-1">
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
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
        />
        {defaultMileage != null && (
          <p className="text-xs text-gray-400 mt-1">
            Pre-filled from MOT records — please update if different
          </p>
        )}
      </div>

      <div>
        <label htmlFor="condition" className="block text-sm font-medium text-gray-700 mb-1">
          Overall Condition
        </label>
        <select
          id="condition"
          name="condition"
          required
          defaultValue=""
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
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

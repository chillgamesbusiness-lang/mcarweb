'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface OutcomeFormProps {
  leadId: string
  currentOutcome: string | null
  currentReason: string | null
  currentFinalOffer: number | null
  submitOutcome: (formData: FormData) => Promise<void>
}

const LOSS_REASONS: { value: string; label: string }[] = [
  { value: 'price_too_low', label: 'Price too low' },
  { value: 'sold_elsewhere', label: 'Sold elsewhere' },
  { value: 'changed_mind', label: 'Changed mind' },
  { value: 'failed_inspection', label: 'Failed inspection' },
  { value: 'no_response', label: 'No response' },
  { value: 'other', label: 'Other' },
]

export default function OutcomeForm({
  leadId,
  currentOutcome,
  currentReason,
  currentFinalOffer,
  submitOutcome,
}: OutcomeFormProps) {
  const [outcome, setOutcome] = useState(currentOutcome ?? '')
  const [submitted, setSubmitted] = useState(false)
  const router = useRouter()

  return (
    <form
      action={async (formData) => {
        setSubmitted(true)
        await submitOutcome(formData)
        router.refresh()
        setSubmitted(false)
      }}
      className="space-y-4"
    >
      <input type="hidden" name="leadId" value={leadId} />

      <div className="flex gap-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="outcome"
            value="won"
            checked={outcome === 'won'}
            onChange={() => setOutcome('won')}
            className="text-green-600"
          />
          <span className="text-sm font-medium text-green-700">Won</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="outcome"
            value="lost"
            checked={outcome === 'lost'}
            onChange={() => setOutcome('lost')}
            className="text-red-600"
          />
          <span className="text-sm font-medium text-red-700">Lost</span>
        </label>
      </div>

      {outcome === 'won' && (
        <div>
          <label htmlFor="final_offer" className="block text-sm font-medium text-gray-700 mb-1">
            Final Agreed Price (£)
          </label>
          <input
            id="final_offer"
            name="final_offer"
            type="number"
            min={0}
            defaultValue={currentFinalOffer ?? ''}
            placeholder="e.g. 4500"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
          />
        </div>
      )}

      {outcome === 'lost' && (
        <div>
          <label htmlFor="reason_if_lost" className="block text-sm font-medium text-gray-700 mb-1">
            Reason
          </label>
          <select
            id="reason_if_lost"
            name="reason_if_lost"
            defaultValue={currentReason ?? ''}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
          >
            <option value="" disabled>Select reason</option>
            {LOSS_REASONS.map(r => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>
      )}

      {outcome && (
        <button
          type="submit"
          disabled={submitted}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {submitted ? 'Saving…' : 'Save Outcome'}
        </button>
      )}
    </form>
  )
}

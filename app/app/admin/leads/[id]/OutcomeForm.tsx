'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface OutcomeFormProps {
  leadId: string
  currentOutcome: string | null
  currentReason: string | null
  currentFinalOffer: number | null
  currentActualPurchase: number | null
  currentActualResale: number | null
  currentReconCost: number | null
  currentDaysToSale: number | null
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
  currentActualPurchase,
  currentActualResale,
  currentReconCost,
  currentDaysToSale,
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
        <div className="space-y-4 max-w-sm">
          <div>
            <label htmlFor="final_offer" className="block text-xs text-warm-gray mb-1">
              Final Agreed Price (£) <span className="text-red-500">*</span>
            </label>
            <input
              id="final_offer"
              name="final_offer"
              type="number"
              min={0}
              defaultValue={currentFinalOffer ?? ''}
              placeholder="e.g. 4500"
              className="w-full border-b border-warm-border bg-transparent px-1 py-2 text-sm text-charcoal focus:border-gold focus:outline-none"
              required
            />
          </div>
          <div>
            <label htmlFor="actual_purchase_price" className="block text-xs text-warm-gray mb-1">
              Actual Purchase Price (£)
            </label>
            <input
              id="actual_purchase_price"
              name="actual_purchase_price"
              type="number"
              min={0}
              defaultValue={currentActualPurchase ?? ''}
              placeholder="What was paid to seller"
              className="w-full border-b border-warm-border bg-transparent px-1 py-2 text-sm text-charcoal focus:border-gold focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="actual_recon_cost" className="block text-xs text-warm-gray mb-1">
              Recon Cost (£)
            </label>
            <input
              id="actual_recon_cost"
              name="actual_recon_cost"
              type="number"
              min={0}
              defaultValue={currentReconCost ?? ''}
              placeholder="Actual recon spend"
              className="w-full border-b border-warm-border bg-transparent px-1 py-2 text-sm text-charcoal focus:border-gold focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="actual_resale_price" className="block text-xs text-warm-gray mb-1">
              Resale Price (£)
            </label>
            <input
              id="actual_resale_price"
              name="actual_resale_price"
              type="number"
              min={0}
              defaultValue={currentActualResale ?? ''}
              placeholder="What the car sold for"
              className="w-full border-b border-warm-border bg-transparent px-1 py-2 text-sm text-charcoal focus:border-gold focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="days_to_sale" className="block text-xs text-warm-gray mb-1">
              Days to Sale
            </label>
            <input
              id="days_to_sale"
              name="days_to_sale"
              type="number"
              min={0}
              defaultValue={currentDaysToSale ?? ''}
              placeholder="Days from purchase to resale"
              className="w-full border-b border-warm-border bg-transparent px-1 py-2 text-sm text-charcoal focus:border-gold focus:outline-none"
            />
          </div>
          <p className="text-[11px] text-warm-gray/60">
            Feeds the calibration engine. Fill in as data becomes available.
          </p>
        </div>
      )}

      {outcome === 'lost' && (
        <div className="max-w-sm">
          <label htmlFor="reason_if_lost" className="block text-xs text-warm-gray mb-1">
            Reason
          </label>
          <select
            id="reason_if_lost"
            name="reason_if_lost"
            defaultValue={currentReason ?? ''}
            className="w-full border-b border-warm-border bg-transparent px-1 py-2 text-sm text-charcoal focus:border-gold focus:outline-none"
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
          className="text-sm font-medium text-gold hover:text-gold-dark transition-colors disabled:opacity-60"
        >
          {submitted ? 'Saving…' : 'Save Outcome'}
        </button>
      )}
    </form>
  )
}

'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useRef } from 'react'
import { useFormStatus } from 'react-dom'
import { generateAvailableSlots } from '@/lib/bookingSlots'

interface BookFormProps {
  submitBooking: (formData: FormData) => Promise<void>
}

/** Submit button with automatic pending state — prevents double-booking */
function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-2xl gradient-gold px-4 py-4 text-[15px] font-bold text-white transition-all duration-300 shadow-lg shadow-gold/20 hover:shadow-xl hover:shadow-gold/30 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {pending ? 'Booking…' : 'Confirm Booking'}
    </button>
  )
}

function BookFormInner({ submitBooking }: BookFormProps) {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')
  const slots = generateAvailableSlots()
  const submitIdInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const fallback = `booking-${Date.now()}-${Math.random().toString(16).slice(2)}`
    if (submitIdInputRef.current) {
      submitIdInputRef.current.value = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : fallback
    }
  }, [])

  return (
    <form action={submitBooking} className="card-premium p-7 sm:p-8 space-y-5 animate-slide-up">
      <input ref={submitIdInputRef} type="hidden" name="submitId" />
      {error && (
        <div role="alert" aria-live="polite" className="rounded-xl bg-red-50 border border-red-200/50 p-4 text-sm text-red-700 flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
          {error}
        </div>
      )}

      <div>
        <label htmlFor="type" className="block text-sm font-semibold text-foreground mb-2">
          Appointment Type
        </label>
        <select
          id="type"
          name="type"
          required
          defaultValue=""
          autoComplete="off"
          className="w-full rounded-xl border border-warm-border px-4 py-3.5 text-sm text-foreground input-premium focus:outline-none bg-[var(--input-bg)] appearance-none"
        >
          <option value="" disabled>Choose type</option>
          <option value="in_person">In Person</option>
          <option value="video">Video Call</option>
        </select>
      </div>

      <div>
        <label htmlFor="slot" className="block text-sm font-semibold text-foreground mb-2">
          Time Slot
        </label>
        <select
          id="slot"
          name="slot"
          required
          defaultValue=""
          autoComplete="off"
          className="w-full rounded-xl border border-warm-border px-4 py-3.5 text-sm text-foreground input-premium focus:outline-none bg-[var(--input-bg)] appearance-none"
        >
          <option value="" disabled>Choose a slot</option>
          {slots.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      <SubmitButton />
    </form>
  )
}

export default function BookForm(props: BookFormProps) {
  return (
    <Suspense>
      <BookFormInner {...props} />
    </Suspense>
  )
}

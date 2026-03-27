'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { useFormStatus } from 'react-dom'

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

/**
 * Generate the next 5 available weekday slots starting from tomorrow.
 * Simple: 10:00, 11:00, 14:00, 15:00 each day.
 */
function generateSlots(): { label: string; value: string }[] {
  const slots: { label: string; value: string }[] = []
  const now = new Date()
  let day = new Date(now)
  day.setDate(day.getDate() + 1)
  day.setHours(0, 0, 0, 0)

  const hours = [10, 11, 14, 15]
  let daysAdded = 0

  while (daysAdded < 5) {
    const dow = day.getDay()
    if (dow !== 0 && dow !== 6) {
      for (const h of hours) {
        const slot = new Date(day)
        slot.setHours(h, 0, 0, 0)
        const label = slot.toLocaleDateString('en-GB', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        }) + ` at ${h}:00`
        slots.push({ label, value: slot.toISOString() })
      }
      daysAdded++
    }
    day = new Date(day)
    day.setDate(day.getDate() + 1)
  }

  return slots
}

function BookFormInner({ submitBooking }: BookFormProps) {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')
  const slots = generateSlots()

  return (
    <form action={submitBooking} className="card-premium p-7 sm:p-8 space-y-5 animate-slide-up">
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200/50 p-4 text-sm text-red-700 flex items-center gap-2">
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

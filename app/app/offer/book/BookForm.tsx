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
      className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
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
    <form action={submitBooking} className="bg-white rounded-xl shadow-sm ring-1 ring-gray-100 p-6 space-y-5">
      {error && (
        <div className="rounded-lg bg-amber-50 ring-1 ring-amber-200 p-3 text-sm text-amber-700">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
          Appointment Type
        </label>
        <select
          id="type"
          name="type"
          required
          defaultValue=""
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
        >
          <option value="" disabled>Choose type</option>
          <option value="in_person">In Person</option>
          <option value="video">Video Call</option>
        </select>
      </div>

      <div>
        <label htmlFor="slot" className="block text-sm font-medium text-gray-700 mb-1">
          Time Slot
        </label>
        <select
          id="slot"
          name="slot"
          required
          defaultValue=""
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
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

export const BOOKING_TIME_ZONE = 'Europe/London'
export const APPOINTMENT_DURATION_MINUTES = 30
export const MIN_BOOKING_NOTICE_MINUTES = 60
export const ALLOWED_BOOKING_HOURS = [10, 11, 14, 15] as const

interface LondonParts {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
  weekday: number
}

export interface GeneratedSlot {
  label: string
  value: string
}

export interface BookingSlotValidation {
  valid: boolean
  error?: string
  startAt?: Date
  endAt?: Date
}

const londonFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: BOOKING_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
  weekday: 'short',
})

function getPart(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string {
  return parts.find((part) => part.type === type)?.value ?? '0'
}

export function getLondonParts(date: Date): LondonParts {
  const parts = londonFormatter.formatToParts(date)
  const weekdayName = getPart(parts, 'weekday')
  const weekdays: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 0 }

  return {
    year: Number(getPart(parts, 'year')),
    month: Number(getPart(parts, 'month')),
    day: Number(getPart(parts, 'day')),
    hour: Number(getPart(parts, 'hour')),
    minute: Number(getPart(parts, 'minute')),
    second: Number(getPart(parts, 'second')),
    weekday: weekdays[weekdayName] ?? 0,
  }
}

function getTimeZoneOffsetMs(date: Date): number {
  const parts = getLondonParts(date)
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second)
  return asUtc - date.getTime()
}

export function londonLocalToUtc(year: number, month: number, day: number, hour: number, minute = 0): Date {
  let utcMs = Date.UTC(year, month - 1, day, hour, minute, 0)
  for (let i = 0; i < 3; i += 1) {
    utcMs = Date.UTC(year, month - 1, day, hour, minute, 0) - getTimeZoneOffsetMs(new Date(utcMs))
  }
  return new Date(utcMs)
}

function addDays(parts: Pick<LondonParts, 'year' | 'month' | 'day'>, days: number): Pick<LondonParts, 'year' | 'month' | 'day'> {
  const utcNoon = Date.UTC(parts.year, parts.month - 1, parts.day + days, 12, 0, 0)
  const date = new Date(utcNoon)
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  }
}

export function formatBookingSlotLabel(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: BOOKING_TIME_ZONE,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date)
}

export function generateAvailableSlots(now = new Date(), workingDays = 5): GeneratedSlot[] {
  const slots: GeneratedSlot[] = []
  const nowParts = getLondonParts(now)
  let cursor = addDays(nowParts, 1)
  let daysAdded = 0

  while (daysAdded < workingDays) {
    const dayProbe = londonLocalToUtc(cursor.year, cursor.month, cursor.day, 12)
    const dayParts = getLondonParts(dayProbe)

    if (dayParts.weekday >= 1 && dayParts.weekday <= 5) {
      for (const hour of ALLOWED_BOOKING_HOURS) {
        const slot = londonLocalToUtc(cursor.year, cursor.month, cursor.day, hour, 0)
        if (slot.getTime() > now.getTime() + MIN_BOOKING_NOTICE_MINUTES * 60 * 1000) {
          slots.push({ label: formatBookingSlotLabel(slot), value: slot.toISOString() })
        }
      }
      daysAdded += 1
    }

    cursor = addDays(cursor, 1)
  }

  return slots
}

export function validateBookingSlot(slot: string, now = new Date()): BookingSlotValidation {
  if (!slot || typeof slot !== 'string') {
    return { valid: false, error: 'Please select a time slot.' }
  }

  const startAt = new Date(slot)
  if (Number.isNaN(startAt.getTime())) {
    return { valid: false, error: 'Invalid appointment time.' }
  }

  if (startAt.getTime() <= now.getTime() + MIN_BOOKING_NOTICE_MINUTES * 60 * 1000) {
    return { valid: false, error: 'Please choose a slot at least 1 hour from now.' }
  }

  const london = getLondonParts(startAt)
  if (london.weekday === 0 || london.weekday === 6) {
    return { valid: false, error: 'Please choose a weekday appointment.' }
  }

  if (!ALLOWED_BOOKING_HOURS.includes(london.hour as (typeof ALLOWED_BOOKING_HOURS)[number])) {
    return { valid: false, error: 'Please choose one of the available business-hour slots.' }
  }

  if (london.minute !== 0 || london.second !== 0 || startAt.getUTCMilliseconds() !== 0) {
    return { valid: false, error: 'Please choose a listed appointment slot.' }
  }

  return {
    valid: true,
    startAt,
    endAt: new Date(startAt.getTime() + APPOINTMENT_DURATION_MINUTES * 60 * 1000),
  }
}
/**
 * DVLA Vehicle Enquiry Service (VES) API integration.
 *
 * Sanitises input, throttles to 1 req/s, normalises fuel types,
 * checks ULEZ compliance, and caches results in Supabase.
 *
 * Spec reference: valuationeng.md Part 1A
 */

import { createServiceClient } from '@/lib/supabase/server'
import type { FuelType } from '@/lib/types'

// ── Constants ──────────────────────────────────────────────────────────────────

const DVLA_VES_URL =
  'https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles'

const CACHE_TTL_HOURS = 24

// ── Rate limiter (1 req/s) ─────────────────────────────────────────────────────

let lastDvlaCall = 0

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function throttle(): Promise<void> {
  const now = Date.now()
  const elapsed = now - lastDvlaCall
  if (elapsed < 1000) {
    await sleep(1000 - elapsed)
  }
  lastDvlaCall = Date.now()
}

// ── Input sanitisation ─────────────────────────────────────────────────────────

export function sanitiseReg(input: string): string {
  return input
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .trim()
}

export function isValidRegFormat(reg: string): boolean {
  return /^[A-Z0-9]{2,7}$/.test(reg)
}

// ── Fuel normalisation ─────────────────────────────────────────────────────────

const FUEL_MAP: Record<string, FuelType> = {
  PETROL: 'petrol',
  DIESEL: 'diesel',
  ELECTRICITY: 'electric',
  'HYBRID ELECTRIC': 'hybrid',
  'ELECTRIC DIESEL': 'hybrid',
  'GAS BI-FUEL': 'petrol',
  'GAS/PETROL': 'petrol',
  STEAM: 'petrol',
}

export function normaliseFuel(dvlaFuel: string): FuelType {
  return FUEL_MAP[dvlaFuel.toUpperCase().trim()] ?? 'petrol'
}

// ── ULEZ compliance ────────────────────────────────────────────────────────────

function parseEuroStatus(status: string): number | null {
  if (!status) return null
  const match = status.match(/(\d+)/)
  return match ? parseInt(match[1]) : null
}

export function checkUlezCompliance(fuel: FuelType, euroStatus: string): boolean {
  const euroNum = parseEuroStatus(euroStatus)
  if (euroNum === null) return false
  if (fuel === 'electric') return true
  if (fuel === 'hybrid') return true
  if (fuel === 'petrol' && euroNum >= 4) return true
  if (fuel === 'diesel' && euroNum >= 6) return true
  return false
}

// ── DVLA raw response shape ────────────────────────────────────────────────────

export interface DvlaRawResponse {
  registrationNumber: string
  make: string
  colour: string
  yearOfManufacture: number
  fuelType: string
  engineCapacity: number | null
  co2Emissions: number | null
  euroStatus: string | null
  taxStatus: string
  taxDueDate: string | null
  motStatus: string
  motExpiryDate: string | null
  dateOfLastV5CIssued: string | null
}

// ── Cache helpers ──────────────────────────────────────────────────────────────

async function getCached(reg: string): Promise<DvlaRawResponse | null> {
  try {
    const svc = createServiceClient()
    const cutoff = new Date(
      Date.now() - CACHE_TTL_HOURS * 60 * 60 * 1000
    ).toISOString()

    const { data } = await svc
      .from('vehicle_lookup_cache')
      .select('payload')
      .eq('reg', reg)
      .gte('fetched_at', cutoff)
      .order('fetched_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (data?.payload) {
      return data.payload as unknown as DvlaRawResponse
    }
    return null
  } catch {
    return null
  }
}

async function setCache(
  reg: string,
  payload: DvlaRawResponse
): Promise<void> {
  try {
    const svc = createServiceClient()
    await svc
      .from('vehicle_lookup_cache')
      .upsert(
        {
          reg,
          payload: payload as unknown as Record<string, unknown>,
          fetched_at: new Date().toISOString(),
        },
        { onConflict: 'reg' }
      )
  } catch {
    // Non-critical
  }
}

// ── DVLA API call ──────────────────────────────────────────────────────────────

async function callDvlaApi(reg: string, _retryCount = 0): Promise<DvlaRawResponse> {
  const apiKey = process.env.DVLA_VES_API_KEY
  if (!apiKey) throw new Error('DVLA_VES_API_KEY not configured')

  await throttle()

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5000)

  let res: Response
  try {
    res = await fetch(DVLA_VES_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({ registrationNumber: reg }),
      signal: controller.signal,
    })
  } catch (err) {
    clearTimeout(timeout)
    // Retry once on timeout
    if ((err as Error).name === 'AbortError') {
      const retryController = new AbortController()
      const retryTimeout = setTimeout(() => retryController.abort(), 5000)
      try {
        await throttle()
        res = await fetch(DVLA_VES_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
          },
          body: JSON.stringify({ registrationNumber: reg }),
          signal: retryController.signal,
        })
      } catch {
        clearTimeout(retryTimeout)
        throw new Error(
          'Service temporarily unavailable, please try again.'
        )
      } finally {
        clearTimeout(retryTimeout)
      }
    } else {
      throw err
    }
  } finally {
    clearTimeout(timeout)
  }

  if (res!.status === 400) {
    throw new Error('Please check the registration and try again.')
  }
  if (res!.status === 404) {
    throw new Error("We couldn't find that registration.")
  }
  if (res!.status === 429) {
    if (_retryCount >= 1) {
      throw new Error('Service temporarily unavailable, please try again.')
    }
    await sleep(1000)
    return callDvlaApi(reg, _retryCount + 1)
  }
  if (!res!.ok) {
    const text = await res!.text().catch(() => '')
    console.error('[DVLA VES] Error:', res!.status, text)
    throw new Error(
      'Service temporarily unavailable, please try again.'
    )
  }

  return (await res!.json()) as DvlaRawResponse
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Fetch vehicle data from DVLA VES API with caching.
 * Returns the raw DVLA response or null if not found / not configured.
 */
export async function fetchDvlaData(
  reg: string
): Promise<DvlaRawResponse | null> {
  const cleanReg = sanitiseReg(reg)
  if (!isValidRegFormat(cleanReg)) return null

  // Check cache first
  const cached = await getCached(cleanReg)
  if (cached) {
    console.log('[dvlaService] Cache HIT for', cleanReg)
    return cached
  }
  console.log('[dvlaService] Cache MISS for', cleanReg)

  // If no API key, return null (allows mock/test flows)
  if (!process.env.DVLA_VES_API_KEY) {
    console.warn('[dvlaService] No DVLA_VES_API_KEY — skipping')
    return null
  }

  const data = await callDvlaApi(cleanReg)
  await setCache(cleanReg, data)
  return data
}

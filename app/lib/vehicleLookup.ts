/**
 * Vehicle lookup via DVLA Vehicle Enquiry Service (VES) API.
 *
 * Uses DVLA_VES_API_KEY to call the real DVLA endpoint.
 * Falls back to deterministic mock data when the key is missing.
 * Caches results in Supabase table `vehicle_lookup_cache` for 24 hours.
 */

import { createServiceClient } from '@/lib/supabase/server'
import type { VehicleInfo } from '@/lib/offerSession'

// ── DVLA VES endpoint ──────────────────────────────────────────────────────────

const DVLA_VES_URL = 'https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles'

// ── Mock fallback ──────────────────────────────────────────────────────────────

const MOCK_VEHICLES: VehicleInfo[] = [
  { make: 'Ford', model: 'Focus', year: 2019, fuel: 'Petrol', transmission: 'Manual' },
  { make: 'Vauxhall', model: 'Corsa', year: 2020, fuel: 'Petrol', transmission: 'Manual' },
  { make: 'BMW', model: '3 Series', year: 2018, fuel: 'Diesel', transmission: 'Automatic' },
  { make: 'Volkswagen', model: 'Golf', year: 2021, fuel: 'Petrol', transmission: 'Automatic' },
  { make: 'Toyota', model: 'Yaris', year: 2022, fuel: 'Hybrid', transmission: 'Automatic' },
  { make: 'Audi', model: 'A3', year: 2017, fuel: 'Diesel', transmission: 'Manual' },
  { make: 'Mercedes', model: 'A-Class', year: 2020, fuel: 'Petrol', transmission: 'Automatic' },
  { make: 'Nissan', model: 'Qashqai', year: 2019, fuel: 'Diesel', transmission: 'Manual' },
  { make: 'Hyundai', model: 'i30', year: 2021, fuel: 'Petrol', transmission: 'Manual' },
  { make: 'Tesla', model: 'Model 3', year: 2023, fuel: 'Electric', transmission: 'Automatic' },
]

function mockLookup(reg: string): VehicleInfo {
  const sum = reg.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
  return MOCK_VEHICLES[sum % MOCK_VEHICLES.length]
}

// ── Cache helpers ──────────────────────────────────────────────────────────────

const CACHE_TTL_HOURS = 24

async function getCached(reg: string): Promise<VehicleInfo | null> {
  try {
    const svc = createServiceClient()
    const cutoff = new Date(Date.now() - CACHE_TTL_HOURS * 60 * 60 * 1000).toISOString()

    const { data } = await svc
      .from('vehicle_lookup_cache')
      .select('payload')
      .eq('reg', reg)
      .gte('fetched_at', cutoff)
      .order('fetched_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (data?.payload) {
      return data.payload as unknown as VehicleInfo
    }
    return null
  } catch {
    return null
  }
}

async function setCache(reg: string, vehicle: VehicleInfo): Promise<void> {
  try {
    const svc = createServiceClient()
    await svc
      .from('vehicle_lookup_cache')
      .upsert(
        { reg, payload: vehicle as unknown as Record<string, unknown>, fetched_at: new Date().toISOString() },
        { onConflict: 'reg' }
      )
  } catch {
    // Non-critical
  }
}

// ── DVLA VES lookup ────────────────────────────────────────────────────────────

async function dvlaLookup(reg: string): Promise<VehicleInfo> {
  const apiKey = process.env.DVLA_VES_API_KEY
  if (!apiKey) throw new Error('DVLA_VES_API_KEY not configured')

  const res = await fetch(DVLA_VES_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify({ registrationNumber: reg }),
  })

  if (res.status === 404) {
    throw new Error('Vehicle not found. Please check the registration and try again.')
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    console.error('[DVLA VES] Error response:', res.status, text)
    throw new Error("Couldn't verify that registration right now. Please try again shortly.")
  }

  const d = await res.json()

  // DVLA VES response fields:
  // make, colour, yearOfManufacture, fuelType, engineCapacity,
  // co2Emissions, taxStatus, taxDueDate, motStatus, motExpiryDate, etc.
  // Note: DVLA does NOT return model or transmission.

  return {
    make: titleCase(d.make || 'Unknown') as string,
    model: '', // DVLA VES does not provide model
    year: typeof d.yearOfManufacture === 'number' ? d.yearOfManufacture : parseInt(d.yearOfManufacture || '0', 10),
    fuel: titleCase(d.fuelType || 'Unknown') as string,
    transmission: 'Unknown', // DVLA VES does not provide transmission
    colour: titleCase(d.colour || undefined),
    engineCapacity: d.engineCapacity || undefined,
    co2Emissions: d.co2Emissions || undefined,
    taxStatus: d.taxStatus || undefined,
    taxDueDate: d.taxDueDate || undefined,
    motStatus: d.motStatus || undefined,
    motExpiryDate: d.motExpiryDate || undefined,
    euroStatus: d.euroStatus || undefined,
  }
}

function titleCase(str: string | undefined): string | undefined {
  if (!str) return undefined
  return str
    .toLowerCase()
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

// ── Public API ─────────────────────────────────────────────────────────────────

export async function lookupVehicle(reg: string): Promise<VehicleInfo> {
  // 1. Check cache
  const cached = await getCached(reg)
  if (cached) {
    console.log('[vehicleLookup] Cache HIT for', reg)
    return cached
  }
  console.log('[vehicleLookup] Cache MISS for', reg)

  // 2. Try DVLA VES
  const hasDvla = !!process.env.DVLA_VES_API_KEY
  console.log('[vehicleLookup] DVLA_VES_API_KEY present:', hasDvla)
  let vehicle: VehicleInfo

  if (hasDvla) {
    vehicle = await dvlaLookup(reg) // Let errors propagate with user-friendly messages
    console.log('[vehicleLookup] DVLA returned:', vehicle.make, vehicle.year)
  } else {
    console.warn('[vehicleLookup] No DVLA key — using MOCK fallback')
    vehicle = mockLookup(reg)
  }

  // 3. Cache result
  await setCache(reg, vehicle)

  return vehicle
}

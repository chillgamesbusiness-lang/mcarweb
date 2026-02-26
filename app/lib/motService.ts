/**
 * MOT History API (DVSA) — Trade API integration.
 *
 * Uses OAuth2 client credentials flow for bearer token,
 * then calls the MOT Trade API with x-api-key + bearer auth.
 *
 * Reliability features:
 *  - Token caching with 60s safety buffer before expiry
 *  - Automatic token refresh on 401 (expired/revoked)
 *  - Retry on 429 with max 2 retries (prevents infinite loop)
 *  - Graceful degradation: returns null on any failure (never crashes quote)
 *
 * Spec reference: valuationeng.md Part 1B
 */

import type { MOTTestRecord, MOTDefect } from '@/lib/types'

// ── OAuth2 token cache ─────────────────────────────────────────────────────────

let cachedToken: string | null = null
let tokenExpiresAt = 0

/** Invalidate the cached token (called on 401) */
function invalidateToken(): void {
  cachedToken = null
  tokenExpiresAt = 0
}

async function getBearerToken(forceRefresh = false): Promise<string> {
  if (!forceRefresh && cachedToken && Date.now() < tokenExpiresAt - 60_000) {
    return cachedToken
  }

  const clientId = process.env.MOT_API_CLIENT_ID
  const clientSecret = process.env.MOT_API_CLIENT_SECRET
  const scope = process.env.MOT_API_SCOPE
  const tokenUrl = process.env.MOT_API_TOKEN_URL

  if (!clientId || !clientSecret || !scope || !tokenUrl) {
    throw new Error('MOT API OAuth2 env vars not configured')
  }

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
    scope,
  })

  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    console.error('[MOT OAuth2] Token error:', res.status, text)
    invalidateToken()
    throw new Error(`Failed to obtain MOT API access token (HTTP ${res.status})`)
  }

  const json = await res.json()
  cachedToken = json.access_token as string
  const expiresIn = (json.expires_in as number) || 3600
  tokenExpiresAt = Date.now() + expiresIn * 1000

  return cachedToken
}

// ── Odometer normalisation ─────────────────────────────────────────────────────

export function normaliseMileage(value: number, unit: string): number {
  if (unit === 'km') return Math.round(value * 0.621371)
  return value
}

// ── MOT API shapes ─────────────────────────────────────────────────────────────

interface MotApiDefect {
  type?: string
  text?: string
  comment?: string
}

interface MotApiTest {
  completedDate?: string
  testResult?: string
  odometerValue?: string | number
  odometerUnit?: string
  motTestNumber?: string
  expiryDate?: string
  rfrAndComments?: MotApiDefect[]
  defects?: MotApiDefect[]
}

interface MotApiVehicle {
  registration?: string
  make?: string
  model?: string
  primaryColour?: string
  colour?: string
  fuelType?: string
  motTests?: MotApiTest[]
}

// ── Return type ────────────────────────────────────────────────────────────────

export interface MotLookupResult {
  registration: string
  make: string
  model: string
  colour: string
  fuelType: string
  motTests: MOTTestRecord[]
}

// ── MOT API call ───────────────────────────────────────────────────────────────

const MOT_API_BASE =
  'https://history.mot.api.gov.uk/v1/trade/vehicles/registration'

const MAX_RETRIES = 2

export async function fetchMotHistory(
  reg: string,
  _retryCount = 0
): Promise<MotLookupResult | null> {
  const apiKey = process.env.MOT_API_KEY
  if (!apiKey) {
    console.warn('[motService] MOT_API_KEY not configured — skipping')
    return null
  }

  try {
    const token = await getBearerToken()

    const encodedReg = encodeURIComponent(
      reg.replace(/\s+/g, '').toUpperCase()
    )
    const url = `${MOT_API_BASE}/${encodedReg}`

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'x-api-key': apiKey,
        Authorization: `Bearer ${token}`,
      },
    })

    if (res.status === 404) {
      return null // No MOT history — may be <3 years old or imported
    }

    // 401 Unauthorized — token expired/revoked, refresh and retry once
    if (res.status === 401 && _retryCount < 1) {
      console.warn('[motService] 401 — refreshing OAuth2 token and retrying')
      invalidateToken()
      await getBearerToken(true)
      return fetchMotHistory(reg, _retryCount + 1)
    }

    // 429 Rate limited — wait and retry with limit
    if (res.status === 429 && _retryCount < MAX_RETRIES) {
      const retryAfter = parseInt(res.headers.get('Retry-After') || '2', 10)
      const delay = Math.min(retryAfter * 1000, 5000) // Cap at 5s
      console.warn(`[motService] 429 rate limited — retrying in ${delay}ms (attempt ${_retryCount + 1}/${MAX_RETRIES})`)
      await new Promise((r) => setTimeout(r, delay))
      return fetchMotHistory(reg, _retryCount + 1)
    }

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      console.error('[motService] API error:', res.status, text)
      return null // Graceful degradation — don't crash the funnel
    }

    const data = await res.json()

    // Trade API returns array or single object
    const vehicle: MotApiVehicle = Array.isArray(data) ? data[0] : data
    if (!vehicle) return null

    // Parse tests into our typed format
    const motTests: MOTTestRecord[] = (vehicle.motTests || []).map(
      (t: MotApiTest) => {
        const rawOdometer =
          t.odometerValue != null ? Number(t.odometerValue) : 0
        const unit = (t.odometerUnit || 'mi') as 'mi' | 'km'
        const odometerValue =
          rawOdometer > 0 ? normaliseMileage(rawOdometer, unit) : 0

        // Unify defect sources: rfrAndComments (v6) or defects
        const rawDefects: MotApiDefect[] = [
          ...(t.rfrAndComments || []),
          ...(t.defects || []),
        ]

        const defects: MOTDefect[] = rawDefects.map((d) => ({
          type: (d.type?.toUpperCase() || 'ADVISORY') as MOTDefect['type'],
          text: d.text || d.comment || '',
        }))

        return {
          completedDate: t.completedDate || '',
          testResult: (t.testResult?.toUpperCase() === 'PASSED'
            ? 'PASSED'
            : 'FAILED') as 'PASSED' | 'FAILED',
          odometerValue,
          odometerUnit: 'mi' as const, // normalised to miles
          motTestNumber: t.motTestNumber || '',
          expiryDate: t.expiryDate || null,
          defects,
        }
      }
    )

    return {
      registration: vehicle.registration || reg,
      make: vehicle.make || '',
      model: vehicle.model || '',
      colour: vehicle.primaryColour || vehicle.colour || '',
      fuelType: vehicle.fuelType || '',
      motTests,
    }
  } catch (err) {
    console.error('[motService] Lookup failed:', err)
    return null // Non-critical — don't block funnel
  }
}

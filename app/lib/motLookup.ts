/**
 * MOT History API (DVSA) client.
 *
 * Uses OAuth2 client credentials flow to obtain a bearer token,
 * then calls the MOT Trade API with x-api-key + bearer auth.
 *
 * Reliability features:
 *  - Token caching with 60s safety buffer
 *  - Auto-refresh on 401 (expired/revoked token)
 *  - Retry on 429 with max 2 attempts (prevents infinite loop)
 *  - Graceful degradation: returns null on any failure
 *
 * Environment variables required:
 *   MOT_API_CLIENT_ID, MOT_API_CLIENT_SECRET, MOT_API_KEY,
 *   MOT_API_SCOPE, MOT_API_TOKEN_URL
 */

// ── Types ──────────────────────────────────────────────────────────────────────

export interface MotTest {
  completedDate: string
  testResult: string          // 'PASSED' | 'FAILED'
  odometerValue: number | null
  odometerUnit: string | null // 'mi' | 'km'
  advisoryItems: string[]
  failureItems: string[]
}

export interface MotVehicle {
  registration: string
  make: string
  model: string
  colour: string
  fuelType: string
  motTests: MotTest[]
}

// ── OAuth2 token cache ─────────────────────────────────────────────────────────

let cachedToken: string | null = null
let tokenExpiresAt = 0

async function getBearerToken(forceRefresh = false): Promise<string> {
  // Return cached token if still valid (with 60s buffer)
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
    cachedToken = null
    tokenExpiresAt = 0
    throw new Error(`Failed to obtain MOT API access token (HTTP ${res.status})`)
  }

  const json = await res.json()
  cachedToken = json.access_token as string
  const expiresIn = (json.expires_in as number) || 3600
  tokenExpiresAt = Date.now() + expiresIn * 1000

  return cachedToken
}

// ── MOT API call ───────────────────────────────────────────────────────────────

const MOT_API_BASE = 'https://history.mot.api.gov.uk/v1/trade/vehicles/registration'

const MAX_RETRIES = 2

export async function lookupMot(reg: string, _retryCount = 0): Promise<MotVehicle | null> {
  const apiKey = process.env.MOT_API_KEY
  if (!apiKey) {
    console.warn('[MOT] MOT_API_KEY not configured — skipping MOT lookup')
    return null
  }

  try {
    const token = await getBearerToken()

    const encodedReg = encodeURIComponent(reg.replace(/\s+/g, '').toUpperCase())
    const url = `${MOT_API_BASE}/${encodedReg}`

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'x-api-key': apiKey,
        'Authorization': `Bearer ${token}`,
      },
    })

    if (res.status === 404) {
      return null // No MOT history for this vehicle
    }

    // 401 Unauthorized — token expired/revoked, refresh and retry once
    if (res.status === 401 && _retryCount < 1) {
      console.warn('[MOT] 401 — refreshing OAuth2 token and retrying')
      cachedToken = null
      tokenExpiresAt = 0
      await getBearerToken(true)
      return lookupMot(reg, _retryCount + 1)
    }

    // 429 Rate limited — retry with backoff, max attempts
    if (res.status === 429 && _retryCount < MAX_RETRIES) {
      const retryAfter = parseInt(res.headers.get('Retry-After') || '2', 10)
      const delay = Math.min(retryAfter * 1000, 5000)
      console.warn(`[MOT] 429 rate limited — retrying in ${delay}ms (attempt ${_retryCount + 1}/${MAX_RETRIES})`)
      await new Promise((r) => setTimeout(r, delay))
      return lookupMot(reg, _retryCount + 1)
    }

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      console.error('[MOT] API error:', res.status, text)
      return null // Non-critical — return null instead of throwing
    }

    const data = await res.json()

    // The Trade API v1 returns an array with one vehicle object
    // or an object with vehicle + motTests depending on endpoint version
    const vehicle = Array.isArray(data) ? data[0] : data

    if (!vehicle) return null

    const motTests: MotTest[] = (vehicle.motTests || []).map((t: Record<string, unknown>) => ({
      completedDate: (t.completedDate as string) || '',
      testResult: (t.testResult as string) || '',
      odometerValue: t.odometerValue != null ? Number(t.odometerValue) : null,
      odometerUnit: (t.odometerUnit as string) || null,
      advisoryItems: ((t.rfrAndComments || t.defects || []) as Record<string, unknown>[])
        .filter((d) => (d.type as string) === 'ADVISORY')
        .map((d) => (d.text as string) || (d.comment as string) || ''),
      failureItems: ((t.rfrAndComments || t.defects || []) as Record<string, unknown>[])
        .filter((d) => (d.type as string) === 'FAIL' || (d.type as string) === 'MAJOR' || (d.type as string) === 'DANGEROUS')
        .map((d) => (d.text as string) || (d.comment as string) || ''),
    }))

    return {
      registration: (vehicle.registration as string) || reg,
      make: (vehicle.make as string) || '',
      model: (vehicle.model as string) || '',
      colour: (vehicle.primaryColour as string) || (vehicle.colour as string) || '',
      fuelType: (vehicle.fuelType as string) || '',
      motTests,
    }
  } catch (err) {
    console.error('[MOT] Lookup failed:', err)
    return null // Non-critical — don't block the funnel
  }
}

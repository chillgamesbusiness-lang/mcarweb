import { NextRequest } from 'next/server'
import { POST as lookupPost } from '../app/api/vehicle/lookup/route'
import { POST as otpSendPost } from '../app/api/otp/send/route'
import { verifyTurnstileDetailed } from '../lib/turnstile'

type FetchKind = 'turnstile' | 'dvla' | 'supabase' | 'twilio' | 'other'

interface FetchCall {
  kind: FetchKind
  url: string
}

type DvlaMode = 'success' | 'not-found' | 'provider-error' | 'timeout'

const originalFetch = globalThis.fetch
const originalEnv = { ...process.env }

let passed = 0
let failed = 0

function assert(name: string, ok: boolean, detail = '') {
  if (ok) {
    passed += 1
    console.log(`PASS ${name}`)
  } else {
    failed += 1
    console.error(`FAIL ${name}${detail ? ` - ${detail}` : ''}`)
  }
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function textResponse(text: string, status: number): Response {
  return new Response(text, {
    status,
    headers: { 'Content-Type': 'text/plain' },
  })
}

function fetchUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.toString()
  return input.url
}

function fetchBody(init?: RequestInit): string {
  const body = init?.body
  if (!body) return ''
  if (typeof body === 'string') return body
  if (body instanceof URLSearchParams) return body.toString()
  return String(body)
}

function classifyUrl(url: string): FetchKind {
  if (url.includes('challenges.cloudflare.com')) return 'turnstile'
  if (url.includes('driver-vehicle-licensing.api.gov.uk')) return 'dvla'
  if (url.includes('supabase.test')) return 'supabase'
  if (url.includes('verify.twilio.com')) return 'twilio'
  return 'other'
}

function abortError(): Error {
  const error = new Error('The operation was aborted')
  error.name = 'AbortError'
  return error
}

function installFetchMock(dvlaMode: DvlaMode = 'success'): FetchCall[] {
  const calls: FetchCall[] = []

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = fetchUrl(input)
    const kind = classifyUrl(url)
    calls.push({ kind, url })

    if (kind === 'turnstile') {
      const responseToken = new URLSearchParams(fetchBody(init)).get('response')
      if (responseToken === 'valid-turnstile-token') return jsonResponse({ success: true })
      return jsonResponse({ success: false, 'error-codes': ['invalid-input-response'] })
    }

    if (kind === 'dvla') {
      if (dvlaMode === 'timeout') throw abortError()
      if (dvlaMode === 'not-found') return textResponse('provider says missing registration', 404)
      if (dvlaMode === 'provider-error') return textResponse('raw provider failure body', 500)
      return jsonResponse({
        registrationNumber: 'AB12CDE',
        make: 'FORD',
        colour: 'BLUE',
        yearOfManufacture: 2021,
        fuelType: 'PETROL',
        engineCapacity: 999,
        co2Emissions: 99,
        euroStatus: 'EURO 6',
        taxStatus: 'Taxed',
        taxDueDate: '2026-12-01',
        motStatus: 'Valid',
        motExpiryDate: '2026-11-01',
        dateOfLastV5CIssued: '2025-01-01',
      })
    }

    if (kind === 'supabase') {
      return jsonResponse([], init?.method === 'POST' ? 201 : 200)
    }

    return jsonResponse({ ok: true })
  }

  return calls
}

function countCalls(calls: FetchCall[], kind: FetchKind): number {
  return calls.filter((call) => call.kind === kind).length
}

function configureIsolatedEnv() {
  process.env.NODE_ENV = 'test'
  process.env.VERCEL_ENV = 'preview'
  process.env.MCAR_REQUIRE_PROD_ENV = 'false'
  process.env.TURNSTILE_SECRET_KEY = 'turnstile-test-secret'
  process.env.OFFER_SESSION_SECRET = 'offer-session-secret-for-public-guard-tests'
  process.env.DVLA_VES_API_KEY = 'dvla-test-key'
  process.env.UPSTASH_REDIS_REST_URL = ''
  process.env.UPSTASH_REDIS_REST_TOKEN = ''
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://supabase.test'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test-key'
  process.env.OTP_BYPASS_ENABLED = 'true'
  process.env.TWILIO_ACCOUNT_SID = ''
  process.env.TWILIO_AUTH_TOKEN = ''
  process.env.TWILIO_VERIFY_SERVICE_SID = ''
  process.env.MOT_API_KEY = ''
  process.env.MOT_API_CLIENT_ID = ''
  process.env.MOT_API_CLIENT_SECRET = ''
  process.env.MOT_API_SCOPE = ''
  process.env.MOT_API_TOKEN_URL = ''
}

async function postJson<T>(
  path: string,
  body: Record<string, unknown>,
  handler: (request: NextRequest) => Promise<Response>
): Promise<{ status: number; data: T }> {
  const request = new NextRequest(`http://localhost${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-real-ip': '127.0.0.1',
    },
    body: JSON.stringify(body),
  })
  const response = await handler(request)
  return { status: response.status, data: (await response.json()) as T }
}

function isSafeMessage(value: unknown): boolean {
  return typeof value === 'string' && !/provider|DVLA VES|raw provider failure body|api\.gov\.uk/i.test(value)
}

async function runTurnstileHelperTests() {
  installFetchMock()

  const valid = await verifyTurnstileDetailed(' valid-turnstile-token ')
  assert('valid Turnstile token is accepted by verifier', valid.success === true)

  const missing = await verifyTurnstileDetailed('')
  assert('missing Turnstile token is rejected by verifier', missing.success === false && missing.reason === 'missing-token')

  const invalid = await verifyTurnstileDetailed('invalid-turnstile-token')
  assert('invalid Turnstile token is rejected by verifier', invalid.success === false && invalid.reason === 'invalid-token')
}

async function runLookupTurnstileRouteTests() {
  let calls = installFetchMock()
  const missing = await postJson<{ code?: string }>('/api/vehicle/lookup', { reg: 'AB12CDE' }, lookupPost)
  assert('lookup route rejects missing Turnstile token', missing.status === 400 && missing.data.code === 'TURNSTILE_FAILED')
  assert('missing Turnstile lookup does not call DVLA', countCalls(calls, 'dvla') === 0)

  calls = installFetchMock()
  const invalid = await postJson<{ code?: string }>('/api/vehicle/lookup', { reg: 'AB12CDE', turnstileToken: 'invalid-turnstile-token' }, lookupPost)
  assert('lookup route rejects invalid Turnstile token', invalid.status === 400 && invalid.data.code === 'TURNSTILE_FAILED')
  assert('invalid Turnstile lookup does not call DVLA', countCalls(calls, 'dvla') === 0)

  calls = installFetchMock('success')
  const valid = await postJson<{ vehicle?: { make?: string; fuel?: string }; token?: string }>(
    '/api/vehicle/lookup',
    { reg: ' ab12 cde ', turnstileToken: 'valid-turnstile-token' },
    lookupPost
  )
  assert('valid Turnstile token allows lookup route to reach DVLA', valid.status === 200 && countCalls(calls, 'dvla') === 1)
  assert('valid registration returns safe vehicle result and signed token', valid.data.vehicle?.make === 'FORD' && typeof valid.data.token === 'string' && valid.data.token.length > 20)
}

async function runOtpTurnstileRouteTests() {
  let calls = installFetchMock()
  const missing = await postJson<{ error?: string; sessionId?: string | null }>('/api/otp/send', { phone: '07968212121' }, otpSendPost)
  assert('OTP send route rejects missing Turnstile token', missing.status === 400 && missing.data.sessionId === null)
  assert('missing Turnstile OTP does not call Twilio', countCalls(calls, 'twilio') === 0)

  calls = installFetchMock()
  const invalid = await postJson<{ error?: string; sessionId?: string | null }>('/api/otp/send', { phone: '07968212121', turnstileToken: 'invalid-turnstile-token' }, otpSendPost)
  assert('OTP send route rejects invalid Turnstile token', invalid.status === 400 && invalid.data.sessionId === null)
  assert('invalid Turnstile OTP does not call Twilio', countCalls(calls, 'twilio') === 0)

  calls = installFetchMock()
  const valid = await postJson<{ sessionId?: string | null }>('/api/otp/send', { phone: '07968212121', turnstileToken: 'valid-turnstile-token' }, otpSendPost)
  assert('valid Turnstile token allows OTP route to create a verification session', valid.status === 200 && typeof valid.data.sessionId === 'string')
  assert('local OTP route proof does not call Twilio without live credentials', countCalls(calls, 'twilio') === 0)
}

async function runDvlaRouteTests() {
  let calls = installFetchMock()
  const invalidReg = await postJson<{ error?: string }>('/api/vehicle/lookup', { reg: '@@@', turnstileToken: 'valid-turnstile-token' }, lookupPost)
  assert('invalid registration is rejected before DVLA lookup', invalidReg.status === 400 && countCalls(calls, 'dvla') === 0)
  assert('invalid registration response is user-safe', isSafeMessage(invalidReg.data.error))

  calls = installFetchMock('not-found')
  const notFound = await postJson<{ error?: string; code?: string }>('/api/vehicle/lookup', { reg: 'AB12CDE', turnstileToken: 'valid-turnstile-token' }, lookupPost)
  assert('DVLA not-found maps to safe 404', notFound.status === 404 && notFound.data.code === 'REG_NOT_FOUND')
  assert('DVLA not-found response does not leak provider detail', isSafeMessage(notFound.data.error))

  calls = installFetchMock('provider-error')
  const providerError = await postJson<{ error?: string; code?: string }>('/api/vehicle/lookup', { reg: 'AB12CDE', turnstileToken: 'valid-turnstile-token' }, lookupPost)
  assert('DVLA provider failure maps to safe 503', providerError.status === 503 && providerError.data.code === 'LOOKUP_UNAVAILABLE')
  assert('DVLA provider failure response does not leak raw body', isSafeMessage(providerError.data.error))

  calls = installFetchMock('timeout')
  const timeout = await postJson<{ error?: string; code?: string }>('/api/vehicle/lookup', { reg: 'AB12CDE', turnstileToken: 'valid-turnstile-token' }, lookupPost)
  assert('DVLA timeout maps to safe 503', timeout.status === 503 && timeout.data.code === 'LOOKUP_UNAVAILABLE')
  assert('DVLA timeout response does not leak provider detail', isSafeMessage(timeout.data.error))
  assert('DVLA timeout retries once then stops', countCalls(calls, 'dvla') === 2)
}

async function main() {
  configureIsolatedEnv()
  await runTurnstileHelperTests()
  await runLookupTurnstileRouteTests()
  await runOtpTurnstileRouteTests()
  await runDvlaRouteTests()

  console.log(`Public provider guard tests: ${passed} passed, ${failed} failed`)
  if (failed > 0) process.exit(1)
}

main()
  .catch((error) => {
    console.error('Fatal:', error instanceof Error ? error.message : error)
    process.exit(1)
  })
  .finally(() => {
    globalThis.fetch = originalFetch
    process.env = originalEnv
  })
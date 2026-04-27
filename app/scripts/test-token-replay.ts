import { createOfferToken, verifyOfferToken } from '../lib/offerSession'

process.env.OFFER_SESSION_SECRET ||= 'handoff-test-secret-32-characters-minimum'

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

const basePayload = {
  reg: 'AB12CDE',
  vehicle: {
    make: 'FORD',
    model: 'FOCUS',
    year: 2020,
    fuel: 'petrol',
    transmission: 'manual',
  },
}

const token = createOfferToken(basePayload)
const payload = verifyOfferToken(token)
assert('valid token verifies', payload?.reg === 'AB12CDE')
assert('token includes jti', typeof payload?.jti === 'string' && payload.jti.length > 10)

const [payloadB64, signature] = token.split('.')
const decoded = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'))
decoded.reg = 'ZZ99ZZZ'
const tampered = `${Buffer.from(JSON.stringify(decoded), 'utf8').toString('base64url')}.${signature}`
assert('tampered token rejected', verifyOfferToken(tampered) === null)

const expired = createOfferToken(basePayload, { ttlMs: -1000 })
assert('expired token rejected', verifyOfferToken(expired) === null)

const fixedJti = 'test-jti-fixed'
const tokenA = verifyOfferToken(createOfferToken(basePayload, { jti: fixedJti }))
const tokenB = verifyOfferToken(createOfferToken(basePayload, { jti: fixedJti }))
assert('jti can be preserved across funnel steps', tokenA?.jti === fixedJti && tokenB?.jti === fixedJti)

console.log(`Token replay tests: ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
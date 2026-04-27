import { getMissingProductionEnv } from '../lib/env'

const missing = getMissingProductionEnv()

if (missing.length > 0) {
  console.error('Production environment check failed.')
  console.error(`Missing: ${missing.join(', ')}`)
  process.exit(1)
}

if (process.env.OTP_BYPASS_ENABLED === 'true') {
  console.error('Production environment check failed.')
  console.error('OTP_BYPASS_ENABLED must not be true for handoff/production.')
  process.exit(1)
}

console.log('Production environment check passed.')
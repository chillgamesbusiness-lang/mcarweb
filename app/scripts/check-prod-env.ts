import {
  getInvalidProductionEnv,
  getMissingOptionalProductionEnv,
  getMissingProductionEnv,
  getOptionalProductionEnvRequirement,
  getProductionEnvRequirement,
} from '../lib/env'

const missing = getMissingProductionEnv()
const missingOptional = getMissingOptionalProductionEnv()
const invalid = getInvalidProductionEnv()

if (missing.length > 0 || invalid.length > 0) {
  console.error('Production environment check failed.')
  if (missing.length > 0) {
    console.error('Missing:')
    for (const key of missing) {
      console.error(`- ${key}: ${getProductionEnvRequirement(key)}`)
    }
  }
  if (invalid.length > 0) {
    console.error(`Invalid: ${invalid.join('; ')}`)
  }
  process.exit(1)
}

if (process.env.OTP_BYPASS_ENABLED === 'true') {
  console.error('Production environment check failed.')
  console.error('OTP_BYPASS_ENABLED must not be true for handoff/production.')
  process.exit(1)
}

if (missingOptional.length > 0) {
  console.warn('Optional production environment values are not configured:')
  for (const key of missingOptional) {
    console.warn(`- ${key}: ${getOptionalProductionEnvRequirement(key)}`)
  }
}

if (process.env.MCAR_PUBLIC_OTP_PROOF_DEFERRED === 'true') {
  console.warn('Public OTP proof is deferred by operator decision; do not claim public booking E2E complete until a real QA code is verified.')
}

console.log('Production environment check passed.')
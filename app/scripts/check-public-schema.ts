import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const requiredColumns = [
  ['leads', 'offer_token_jti'],
  ['leads', 'contact_submit_id'],
  ['leads', 'otp_session_id'],
  ['appointments', 'booking_submit_id'],
  ['valuation_snapshots', 'valuation_engine_version'],
  ['audit_log', 'actor_kind'],
] as const

async function main() {
  let failed = 0

  for (const [table, column] of requiredColumns) {
    const { error } = await supabase.from(table).select(column).limit(1)
    if (error) {
      failed += 1
      console.error(`FAIL ${table}.${column}: ${error.message}`)
    } else {
      console.log(`PASS ${table}.${column}`)
    }
  }

  if (failed > 0) {
    console.error(`Public schema check failed: ${failed} missing/invalid prerequisite(s).`)
    console.error('Apply sql-migration/patch_public_funnel_schema_gap.sql, then rerun this check.')
    process.exit(1)
  }

  console.log('Public schema check passed.')
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function addVersionColumns() {
  // Check if coefficient_version exists
  const { error: e1 } = await sb.from('valuation_snapshots').select('coefficient_version').limit(1)
  if (e1) {
    console.log('coefficient_version: MISSING — needs manual ALTER TABLE')
    console.log('Run in Supabase SQL editor:')
    console.log('  ALTER TABLE valuation_snapshots ADD COLUMN coefficient_version text;')
  } else {
    console.log('coefficient_version: EXISTS')
  }

  // Check if git_commit_hash exists
  const { error: e2 } = await sb.from('valuation_snapshots').select('git_commit_hash').limit(1)
  if (e2) {
    console.log('git_commit_hash: MISSING — needs manual ALTER TABLE')
    console.log('Run in Supabase SQL editor:')
    console.log('  ALTER TABLE valuation_snapshots ADD COLUMN git_commit_hash text;')
  } else {
    console.log('git_commit_hash: EXISTS')
  }
}

addVersionColumns().catch(e => console.error('Fatal:', e))

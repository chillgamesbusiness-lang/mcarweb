/**
 * Run ALTER TABLE via Supabase SQL endpoint to add version tracking columns.
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars.
 */

async function run() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  const sql = `
    ALTER TABLE valuation_snapshots ADD COLUMN IF NOT EXISTS coefficient_version text;
    ALTER TABLE valuation_snapshots ADD COLUMN IF NOT EXISTS git_commit_hash text;
  `

  // Try /pg/query
  console.log('Trying /pg/query endpoint...')
  const r1 = await fetch(`${supabaseUrl}/pg/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({ query: sql }),
  })
  console.log('Status:', r1.status)
  const t1 = await r1.text()
  console.log('Response:', t1.slice(0, 300))

  if (r1.ok) {
    console.log('\n✅ Columns added via /pg/query')
    return
  }

  // Alternative: create a temporary RPC function then use it
  console.log('\nFallback: trying via PostgREST function creation...')

  // Direct approach - use the Supabase Management API
  const projectRef = supabaseUrl.replace('https://', '').split('.')[0]

  // Try the SQL query via /sql endpoint (management API)
  console.log('Trying management API /v1/projects/.../sql...')
  const r3 = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({ query: sql }),
  })
  console.log('Status:', r3.status)
  const t3 = await r3.text()
  console.log('Response:', t3.slice(0, 300))

  if (!r3.ok) {
    console.log('\n⚠️  Could not run migration automatically.')
    console.log('Please run this SQL in the Supabase SQL Editor:')
    console.log(sql)
  }
}

run().catch(e => console.error('Fatal:', e))

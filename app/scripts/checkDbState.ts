import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Check which v3 columns/tables exist
async function check() {
  // 1. valuation_snapshots.customer_explanation
  const r1 = await sb.from('valuation_snapshots').select('customer_explanation').limit(1)
  console.log('valuation_snapshots.customer_explanation:', r1.error ? 'MISSING' : 'EXISTS')

  // 2. engine_coefficients table
  const r2 = await sb.from('engine_coefficients').select('id').limit(1)
  console.log('engine_coefficients table:', r2.error ? 'MISSING' : 'EXISTS')

  // 3. shadow_comparison_log table
  const r3 = await sb.from('shadow_comparison_log').select('id').limit(1)
  console.log('shadow_comparison_log table:', r3.error ? 'MISSING' : 'EXISTS')

  // 4. leads.actual_purchase_price
  const r4 = await sb.from('leads').select('actual_purchase_price').limit(1)
  console.log('leads.actual_purchase_price:', r4.error ? 'MISSING' : 'EXISTS')

  // 5. leads.days_to_sale
  const r5 = await sb.from('leads').select('days_to_sale').limit(1)
  console.log('leads.days_to_sale:', r5.error ? 'MISSING' : 'EXISTS')
}

check().catch(e => console.error('Fatal:', e))

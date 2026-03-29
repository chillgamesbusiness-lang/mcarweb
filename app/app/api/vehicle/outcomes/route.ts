import { NextRequest, NextResponse } from 'next/server'
import { logOutcome, getRecalibrationInsights, getOutcomesForVehicle } from '@/lib/outcomeTracker'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/vehicle/outcomes — Log a buy/sell outcome
 * GET  /api/vehicle/outcomes — Get recalibration insights or vehicle outcomes
 *
 * Admin-only. Requires authenticated session with admin/owner role.
 */

async function requireAdmin(): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!data || !['admin', 'owner'].includes(data.role)) {
    return { error: 'Admin access required' }
  }
  return {}
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: 403 })

  try {
    const body = await request.json()
    const {
      registration, make, model, year, mileage, fuel, engineCC,
      predicted, eventType, actualPrice, eventDate, notes, leadId,
    } = body ?? {}

    if (!make || !model || !year || !mileage || !predicted || !eventType || !actualPrice) {
      return NextResponse.json(
        { error: 'Required: make, model, year, mileage, predicted, eventType, actualPrice' },
        { status: 400 },
      )
    }

    if (!['purchase', 'sale'].includes(eventType)) {
      return NextResponse.json({ error: 'eventType must be "purchase" or "sale"' }, { status: 400 })
    }

    const result = await logOutcome({
      registration, make, model, year, mileage, fuel, engineCC,
      predicted, eventType, actualPrice, eventDate, notes, leadId,
    })

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({ id: result.id, status: 'logged' })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin()
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const make = searchParams.get('make')
  const model = searchParams.get('model')

  if (make && model) {
    const outcomes = await getOutcomesForVehicle(make, model)
    return NextResponse.json({ outcomes })
  }

  const insights = await getRecalibrationInsights()
  return NextResponse.json({ insights })
}

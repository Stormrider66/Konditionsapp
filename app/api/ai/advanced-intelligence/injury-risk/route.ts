// app/api/ai/advanced-intelligence/injury-risk/route.ts
// Injury risk prediction API endpoint

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calculateInjuryRisk } from '@/lib/ai/advanced-intelligence'
import { logger } from '@/lib/logger'

/**
 * GET /api/ai/advanced-intelligence/injury-risk
 * Calculate comprehensive injury risk assessment
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const clientId = searchParams.get('clientId')

    if (!clientId) {
      return NextResponse.json(
        { error: 'clientId är obligatoriskt' },
        { status: 400 }
      )
    }

    const riskAssessment = await calculateInjuryRisk(clientId)

    return NextResponse.json({
      success: true,
      clientId,
      assessment: riskAssessment,
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('Error calculating injury risk', {}, error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

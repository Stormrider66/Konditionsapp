// app/api/ai/advanced-intelligence/patterns/route.ts
// Training pattern recognition API endpoint

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { analyzeTrainingPatterns } from '@/lib/ai/advanced-intelligence'
import { logger } from '@/lib/logger'

/**
 * GET /api/ai/advanced-intelligence/patterns
 * Analyze training history patterns for an athlete
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
    const weeks = parseInt(searchParams.get('weeks') || '12')

    if (!clientId) {
      return NextResponse.json(
        { error: 'clientId är obligatoriskt' },
        { status: 400 }
      )
    }

    const patterns = await analyzeTrainingPatterns(clientId, weeks)

    return NextResponse.json({
      success: true,
      clientId,
      lookbackWeeks: weeks,
      patterns,
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('Error analyzing training patterns', {}, error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

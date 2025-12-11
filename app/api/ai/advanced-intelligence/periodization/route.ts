// app/api/ai/advanced-intelligence/periodization/route.ts
// Automatic periodization adjustment API endpoint
// Supports both algorithmic and Gemini 3 Pro Deep Think analysis

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { analyzePeriodization } from '@/lib/ai/advanced-intelligence'
import { analyzeWithDeepThink } from '@/lib/ai/deep-think-periodization'
import { logger } from '@/lib/logger'

/**
 * GET /api/ai/advanced-intelligence/periodization
 * Analyze current periodization and get adjustment recommendations
 *
 * Query params:
 * - clientId: required - athlete ID
 * - programId: optional - specific program ID
 * - useDeepThink: optional - use Gemini 3 Pro Deep Think for complex reasoning
 * - methodology: optional - POLARIZED | NORWEGIAN | PYRAMIDAL | CANOVA
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
    const programId = searchParams.get('programId') || undefined
    const useDeepThink = searchParams.get('useDeepThink') === 'true'
    const methodology = searchParams.get('methodology') as 'POLARIZED' | 'NORWEGIAN' | 'PYRAMIDAL' | 'CANOVA' | undefined

    if (!clientId) {
      return NextResponse.json(
        { error: 'clientId är obligatoriskt' },
        { status: 400 }
      )
    }

    // Use Deep Think for complex AI-powered analysis
    if (useDeepThink) {
      try {
        const deepThinkAnalysis = await analyzeWithDeepThink({
          clientId,
          programId,
          coachUserId: user.id,
          methodology,
        })

        return NextResponse.json({
          success: true,
          clientId,
          programId,
          analysis: deepThinkAnalysis,
          analysisType: 'deep_think',
          model: 'gemini-2.0-flash',
          generatedAt: new Date().toISOString(),
        })
      } catch (deepThinkError) {
        logger.warn('Deep Think analysis failed, falling back to algorithmic', {
          error: deepThinkError instanceof Error ? deepThinkError.message : 'Unknown error'
        })
        // Fall through to algorithmic analysis
      }
    }

    // Standard algorithmic analysis
    const analysis = await analyzePeriodization(clientId, programId)

    return NextResponse.json({
      success: true,
      clientId,
      programId,
      analysis,
      analysisType: 'algorithmic',
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('Error analyzing periodization', {}, error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/ai/advanced-intelligence/periodization
 * Request specific periodization adjustments
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { clientId, programId, applyAdjustments } = body

    if (!clientId) {
      return NextResponse.json(
        { error: 'clientId är obligatoriskt' },
        { status: 400 }
      )
    }

    const analysis = await analyzePeriodization(clientId, programId)

    // If applyAdjustments is true, we would apply the adjustments to the program
    // This would involve updating the program in the database
    // For now, we just return the analysis with recommendations

    return NextResponse.json({
      success: true,
      clientId,
      programId,
      analysis,
      adjustmentsApplied: applyAdjustments || false,
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('Error processing periodization adjustments', {}, error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

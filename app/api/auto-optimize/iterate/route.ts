/**
 * POST /api/auto-optimize/iterate
 *
 * Trigger an iteration run comparing a candidate variant against the baseline.
 * Admin-only endpoint.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { runIteration } from '@/lib/auto-optimize/iteration-engine'
import type { IterationOptions } from '@/lib/auto-optimize/types'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin role
    const profile = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true },
    })
    if (!profile || !['ADMIN', 'COACH'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { candidateVariantId, options } = body as {
      candidateVariantId: string
      options?: IterationOptions
    }

    if (!candidateVariantId) {
      return NextResponse.json(
        { error: 'Missing candidateVariantId' },
        { status: 400 }
      )
    }

    const result = await runIteration(candidateVariantId, options)

    return NextResponse.json({
      success: true,
      run: {
        id: result.id,
        decision: result.decision,
        candidateAvgScore: result.candidateAvgScore,
        baselineAvgScore: result.baselineAvgScore,
        scoreDelta: result.scoreDelta,
        scenarioCount: result.results.candidate.length,
        slot: result.slot,
      },
    })
  } catch (error) {
    console.error('Auto-optimize iterate error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export const maxDuration = 300 // 5 minutes — iterations involve multiple AI calls
export const dynamic = 'force-dynamic'

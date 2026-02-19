/**
 * Multi-Part Program Generation API
 *
 * POST /api/ai/generate-program
 *
 * Starts a multi-part program generation session.
 * Programs longer than 8 weeks are automatically split into phases.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireCoach } from '@/lib/auth-utils'
import { getDecryptedUserApiKeys } from '@/lib/user-api-keys'
import { rateLimitJsonResponse } from '@/lib/api/rate-limit'
import { requireCoachFeatureAccess } from '@/lib/subscription/require-feature-access'
import { logger } from '@/lib/logger'
import {
  calculatePhases,
  estimateGenerationMinutes,
  generateMultiPartProgram,
  type GenerationContext,
  type StartGenerationRequest,
} from '@/lib/ai/program-generator'

// ============================================
// POST - Start Program Generation
// ============================================

export async function POST(request: NextRequest) {
  try {
    // Authenticate
    const user = await requireCoach()

    // Subscription gate (coach-level)
    const denied = await requireCoachFeatureAccess(user.id, 'program_generation')
    if (denied) return denied

    // Rate limit
    const rateLimited = await rateLimitJsonResponse('ai:program-gen:start', user.id, {
      limit: 10,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    // Parse request
    const body = (await request.json()) as StartGenerationRequest
    const { conversationId, programContext, totalWeeks, modelId, provider } = body

    // Validate
    if (!programContext || !totalWeeks) {
      return NextResponse.json(
        { error: 'Missing required fields: programContext and totalWeeks' },
        { status: 400 }
      )
    }

    if (totalWeeks < 1 || totalWeeks > 52) {
      return NextResponse.json(
        { error: 'totalWeeks must be between 1 and 52' },
        { status: 400 }
      )
    }

    // Get API key
    const selectedProvider = provider || 'ANTHROPIC'
    const apiKeys = await getDecryptedUserApiKeys(user.id)

    let apiKey: string | null = null
    switch (selectedProvider) {
      case 'ANTHROPIC':
        apiKey = apiKeys.anthropicKey
        break
      case 'GOOGLE':
        apiKey = apiKeys.googleKey
        break
      case 'OPENAI':
        apiKey = apiKeys.openaiKey
        break
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: `No API key configured for ${selectedProvider}` },
        { status: 400 }
      )
    }

    // Calculate phases
    const phases = calculatePhases(totalWeeks)
    const estimatedMinutes = estimateGenerationMinutes(phases.length)

    // Create session
    const session = await prisma.programGenerationSession.create({
      data: {
        coachId: user.id,
        conversationId: conversationId || null,
        query: programContext.goal || `${totalWeeks}-week ${programContext.sport} program`,
        totalWeeks,
        sport: programContext.sport,
        methodology: programContext.methodology || null,
        athleteContext: programContext as object,
        athleteId: programContext.athleteId || null,
        status: 'PENDING',
        totalPhases: phases.length,
        modelUsed: modelId || null,
        provider: selectedProvider,
      },
    })

    // Start generation in background (non-blocking)
    // The cron job will pick this up, or we can start it directly
    if (process.env.VERCEL !== '1') {
      // Local development: start immediately in background
      startGenerationBackground(session.id, programContext, apiKey, selectedProvider, modelId)
    }
    // On Vercel, the cron job will poll and process pending sessions

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      totalPhases: phases.length,
      estimatedMinutes,
      message: totalWeeks > 8
        ? `Programmet på ${totalWeeks} veckor genereras i ${phases.length} faser`
        : 'Programmet genereras',
    })
  } catch (error) {
    logger.error('POST /api/ai/generate-program error', {}, error)
    return NextResponse.json(
      { error: 'Failed to start program generation' },
      { status: 500 }
    )
  }
}

// ============================================
// Background Generation (Local Dev)
// ============================================

function startGenerationBackground(
  sessionId: string,
  context: GenerationContext,
  apiKey: string,
  provider: 'ANTHROPIC' | 'GOOGLE' | 'OPENAI',
  modelId?: string
): void {
  // Run generation without awaiting (fire and forget)
  generateMultiPartProgram({
    sessionId,
    context,
    apiKey,
    provider,
    modelId,
  }).catch((error) => {
    logger.error('Background program generation failed', { sessionId }, error)
  })
}

// ============================================
// GET - Get Session Status
// ============================================

export async function GET(request: NextRequest) {
  try {
    const user = await requireCoach()

    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      // List recent sessions
      const sessions = await prisma.programGenerationSession.findMany({
        where: { coachId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          status: true,
          sport: true,
          totalWeeks: true,
          totalPhases: true,
          currentPhase: true,
          progressPercent: true,
          progressMessage: true,
          createdAt: true,
          completedAt: true,
        },
      })

      return NextResponse.json({ success: true, sessions })
    }

    // Get specific session
    const session = await prisma.programGenerationSession.findFirst({
      where: {
        id: sessionId,
        coachId: user.id,
      },
      include: {
        progressUpdates: {
          orderBy: { timestamp: 'desc' },
          take: 10,
        },
      },
    })

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        status: session.status,
        sport: session.sport,
        totalWeeks: session.totalWeeks,
        methodology: session.methodology,
        totalPhases: session.totalPhases,
        currentPhase: session.currentPhase,
        progressPercent: session.progressPercent,
        progressMessage: session.progressMessage,
        outline: session.programOutline,
        phases: session.phases,
        mergedProgram: session.mergedProgram,
        errorMessage: session.errorMessage,
        createdAt: session.createdAt,
        completedAt: session.completedAt,
        progressUpdates: session.progressUpdates,
      },
    })
  } catch (error) {
    logger.error('GET /api/ai/generate-program error', {}, error)
    return NextResponse.json(
      { error: 'Failed to get session' },
      { status: 500 }
    )
  }
}

// Route config
export const maxDuration = 60
export const dynamic = 'force-dynamic'

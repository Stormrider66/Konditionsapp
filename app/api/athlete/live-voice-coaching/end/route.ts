import { NextResponse } from 'next/server'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { endSessionSchema } from '@/lib/ai/live-voice-coaching/schemas'
import { estimateLiveSessionCost } from '@/lib/ai/gemini-config'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    // Auth
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { clientId } = resolved

    // Validate body
    const body = await request.json()
    const parsed = endSessionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const {
      sessionId,
      durationSeconds,
      audioInputSeconds,
      audioOutputSeconds,
      segmentsCompleted,
      endReason,
    } = parsed.data

    // Find session and verify ownership
    const session = await prisma.liveVoiceCoachingSession.findFirst({
      where: {
        id: sessionId,
        clientId,
        status: 'ACTIVE',
      },
    })

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found or already ended' },
        { status: 404 }
      )
    }

    // Calculate cost
    const cost = estimateLiveSessionCost(durationSeconds, audioInputSeconds, audioOutputSeconds)

    // Update session
    await prisma.liveVoiceCoachingSession.update({
      where: { id: sessionId },
      data: {
        status: endReason === 'error' ? 'ERROR' : 'COMPLETED',
        durationSeconds,
        audioInputSeconds,
        audioOutputSeconds,
        estimatedCostUsd: cost.totalCost,
        segmentsCompleted,
        endReason,
        endedAt: new Date(),
      },
    })

    logger.info('Live voice coaching session ended', {
      sessionId,
      clientId,
      durationSeconds,
      estimatedCost: cost.totalCost,
      endReason,
    })

    return NextResponse.json({
      success: true,
      estimatedCost: cost.totalCost,
      breakdown: cost,
    })
  } catch (error) {
    logger.error('Live voice coaching end failed', { error })
    return NextResponse.json(
      { error: 'Failed to end voice coaching session' },
      { status: 500 }
    )
  }
}

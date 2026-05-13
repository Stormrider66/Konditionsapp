import { NextResponse } from 'next/server'
import { z } from 'zod'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { estimateLiveSessionCost } from '@/lib/ai/gemini-config'
import { generateSessionSummary } from '@/lib/ai/live-voice-coaching/session-summarizer'
import { logAiUsage } from '@/lib/ai/usage-logger'

export const dynamic = 'force-dynamic'

const endSchema = z.object({
  sessionId: z.string().uuid(),
  durationSeconds: z.number().int().min(0).max(7200),
  audioInputSeconds: z.number().min(0).max(7200),
  audioOutputSeconds: z.number().min(0).max(7200),
  segmentsCompleted: z.number().int().min(0),
  endReason: z.enum(['completed', 'user_cancelled', 'error', 'timeout']),
  transcripts: z.array(z.object({
    role: z.enum(['athlete', 'coach_ai']),
    content: z.string(),
    timestamp: z.string(),
  })).optional(),
})

export async function POST(request: Request) {
  try {
    // Auth
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { clientId, user } = resolved

    // Validate body
    const body = await request.json()
    const parsed = endSchema.safeParse(body)
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
      transcripts,
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
    logAiUsage({
      userId: user.id,
      clientId,
      category: 'live_voice_coaching',
      provider: 'GOOGLE',
      model: session.modelUsed,
      inputTokens: 0,
      outputTokens: 0,
      estimatedCost: cost.totalCost,
    })

    // Save transcripts if provided
    if (transcripts && transcripts.length > 0) {
      await prisma.liveVoiceTranscript.createMany({
        data: transcripts.map((t) => ({
          sessionId,
          role: t.role,
          content: t.content,
          timestamp: new Date(t.timestamp),
        })),
      })
    }

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
      transcriptCount: transcripts?.length ?? 0,
    })

    // Fire async summary generation (don't block the response)
    if (transcripts && transcripts.length > 0) {
      generateSessionSummary(sessionId, clientId).catch((err) => {
        logger.error('Failed to generate voice coaching summary', { sessionId, error: err })
      })
    }

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

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { estimateLiveSessionCost } from '@/lib/ai/gemini-config'
import { generateSessionSummary } from '@/lib/ai/live-voice-coaching/session-summarizer'
import { buildSyntheticLiveVoiceTranscripts } from '@/lib/ai/live-voice-coaching/end-report'
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
  debrief: z.object({
    sessionRpe: z.number().int().min(1).max(10).nullable().optional(),
    notes: z.string().max(2000).nullable().optional(),
    painMentioned: z.boolean().optional(),
    painDetails: z.string().max(1000).nullable().optional(),
    mood: z.enum(['positive', 'neutral', 'struggling', 'frustrated']).nullable().optional(),
    capturedAt: z.string().optional(),
  }).optional(),
  performanceSnapshot: z.object({
    workoutName: z.string().max(200).optional(),
    sport: z.string().max(60).optional(),
    totalSegments: z.number().int().min(0).max(200).optional(),
    completedSegments: z.number().int().min(0).max(200).optional(),
    skippedSegments: z.number().int().min(0).max(200).optional(),
    totalPlannedDurationSeconds: z.number().int().min(0).max(24 * 3600).nullable().optional(),
    totalActualDurationSeconds: z.number().int().min(0).max(24 * 3600).nullable().optional(),
    avgHeartRate: z.number().int().min(0).max(260).nullable().optional(),
    maxHeartRate: z.number().int().min(0).max(260).nullable().optional(),
    avgPower: z.number().int().min(0).max(3000).nullable().optional(),
    maxPower: z.number().int().min(0).max(3000).nullable().optional(),
    totalDistanceKm: z.number().min(0).max(1000).nullable().optional(),
    totalCalories: z.number().int().min(0).max(20000).nullable().optional(),
    segments: z.array(z.object({
      index: z.number().int().min(0).max(500),
      typeName: z.string().max(120),
      completed: z.boolean().optional(),
      skipped: z.boolean().optional(),
      plannedDurationSeconds: z.number().int().min(0).max(24 * 3600).nullable().optional(),
      actualDurationSeconds: z.number().int().min(0).max(24 * 3600).nullable().optional(),
      plannedPower: z.number().int().min(0).max(3000).nullable().optional(),
      actualAvgPower: z.number().int().min(0).max(3000).nullable().optional(),
      actualMaxPower: z.number().int().min(0).max(3000).nullable().optional(),
      actualAvgHR: z.number().int().min(0).max(260).nullable().optional(),
      actualMaxHR: z.number().int().min(0).max(260).nullable().optional(),
      actualCalories: z.number().int().min(0).max(20000).nullable().optional(),
      notes: z.string().max(500).nullable().optional(),
    })).max(200).optional(),
  }).optional(),
})

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

export async function POST(request: Request) {
  let locale: AppLocale = resolveRequestLocale(request)

  try {
    // Auth
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    locale = resolveRequestLocale(request, resolved.user.language)
    const { clientId, user } = resolved

    // Validate body
    const body = await request.json()
    const parsed = endSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: t(locale, 'Invalid request', 'Ogiltig förfrågan'), details: parsed.error.flatten() },
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
      debrief,
      performanceSnapshot,
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
        { error: t(locale, 'Session not found or already ended', 'Passet hittades inte eller har redan avslutats') },
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

    const syntheticTranscripts = buildSyntheticLiveVoiceTranscripts({
      debrief,
      performanceSnapshot,
    })
    const allTranscripts = [...(transcripts ?? []), ...syntheticTranscripts]

    // Save transcripts if provided
    if (allTranscripts.length > 0) {
      await prisma.liveVoiceTranscript.createMany({
        data: allTranscripts.map((t) => ({
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
      transcriptCount: allTranscripts.length,
      syntheticTranscriptCount: syntheticTranscripts.length,
    })

    // Fire async summary generation (don't block the response)
    if (allTranscripts.length > 0) {
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
      { error: t(locale, 'Failed to end voice coaching session', 'Kunde inte avsluta röstcoachningspasset') },
      { status: 500 }
    )
  }
}

import { NextResponse } from 'next/server'
import { GoogleGenAI, Modality } from '@google/genai'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { rateLimitJsonResponse } from '@/lib/api/rate-limit'
import { requireFeatureAccess } from '@/lib/subscription/require-feature-access'
import { resolveAthleteGoogleKeyContext } from '@/lib/ai/resolve-athlete-google-key'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { z } from 'zod'
import { buildLiveCoachingSystemInstruction } from '@/lib/ai/live-voice-coaching/system-prompt'
import { LIVE_COACHING_TOOLS } from '@/lib/ai/live-voice-coaching/tools'
import { GEMINI_MODELS } from '@/lib/ai/gemini-config'
import type { WorkoutContextForLive, LiveSegmentInfo } from '@/lib/ai/live-voice-coaching/types'

export const maxDuration = 30
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    // Auth
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { user, clientId, isCoachInAthleteMode } = resolved

    // Rate limit
    const rateLimited = await rateLimitJsonResponse('live-voice-init', user.id, {
      limit: 5,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    // Feature check (PRO/ELITE only)
    const denied = await requireFeatureAccess(clientId, 'live_voice_coaching', {
      featureLabel: 'AI-Röstcoach (Live)',
    })
    if (denied) return denied

    // Validate body
    const body = await request.json()
    const parsed = z.object({
      assignmentId: z.string().uuid(),
      enableCamera: z.boolean().optional().default(false),
    }).safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { assignmentId, enableCamera } = parsed.data

    // Fetch assignment with session data and verify ownership
    const assignment = await prisma.cardioSessionAssignment.findFirst({
      where: {
        id: assignmentId,
        athleteId: clientId,
      },
      include: {
        session: true,
        athlete: {
          select: { name: true, preferredVoiceCoachVoice: true },
        },
      },
    })

    if (!assignment) {
      return NextResponse.json(
        { error: 'Assignment not found or access denied' },
        { status: 404 }
      )
    }

    // Resolve Google API key
    const keyContext = await resolveAthleteGoogleKeyContext({
      clientId,
      userId: user.id,
      isCoachInAthleteMode,
    })

    if (!keyContext?.googleKey) {
      return NextResponse.json(
        {
          error: 'Google API key not configured. Set up your API key in settings to use live voice coaching.',
          code: 'NO_API_KEY',
        },
        { status: 400 }
      )
    }

    // Build workout context from session JSON segments
    const rawSegments = (assignment.session.segments ?? []) as Array<{
      type?: string
      typeName?: string
      duration?: number
      plannedDuration?: number
      distance?: number
      plannedDistance?: number
      zone?: number
      plannedZone?: number
      notes?: string
    }>

    const segments: LiveSegmentInfo[] = rawSegments.map((seg, i) => ({
      index: i,
      type: seg.type || 'STEADY',
      typeName: seg.typeName || seg.type || 'Steady',
      plannedDuration: seg.plannedDuration ?? seg.duration ?? undefined,
      plannedDistance: seg.plannedDistance ?? seg.distance ?? undefined,
      plannedZone: seg.plannedZone ?? seg.zone ?? undefined,
      notes: seg.notes ?? undefined,
    }))

    const totalDuration = segments.reduce((sum, s) => sum + (s.plannedDuration || 0), 0)

    const workoutContext: WorkoutContextForLive = {
      sessionName: assignment.session.name || 'Cardio Session',
      sport: assignment.session.sport || 'Running',
      segments,
      athleteName: assignment.athlete?.name ?? undefined,
      coachNotes: assignment.notes ?? undefined,
      totalDuration: totalDuration > 0 ? totalDuration : undefined,
    }

    // Check if athlete has active HR session
    const hrParticipant = await prisma.liveHRParticipant.findFirst({
      where: { clientId, session: { status: 'ACTIVE' } },
      select: { id: true },
    })
    const hrAvailable = !!hrParticipant

    const systemInstruction = buildLiveCoachingSystemInstruction(workoutContext, {
      hrAvailable,
      cameraEnabled: enableCamera,
    })

    // Get voice preference
    const voiceName = assignment.athlete?.preferredVoiceCoachVoice || 'Kore'

    // Create ephemeral token with locked config
    const model = GEMINI_MODELS.VOICE_COACHING
    const ai = new GoogleGenAI({
      apiKey: keyContext.googleKey,
      httpOptions: { apiVersion: 'v1alpha' },
    })

    const responseModalities = enableCamera
      ? [Modality.AUDIO, Modality.IMAGE]
      : [Modality.AUDIO]

    const token = await ai.authTokens.create({
      config: {
        uses: 1,
        expireTime: new Date(Date.now() + 30 * 60_000).toISOString(),
        liveConnectConstraints: {
          model,
          config: {
            systemInstruction: { parts: [{ text: systemInstruction }] },
            tools: [{ functionDeclarations: LIVE_COACHING_TOOLS }],
            responseModalities,
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName },
              },
            },
            enableAffectiveDialog: true,
            inputAudioTranscription: {},
            outputAudioTranscription: {},
            sessionResumption: {},
          },
        },
      },
    })

    if (!token.name) {
      logger.error('Failed to create ephemeral token — no name returned')
      return NextResponse.json(
        { error: 'Failed to initialize voice coaching session' },
        { status: 500 }
      )
    }

    // Create tracking session in DB
    const session = await prisma.liveVoiceCoachingSession.create({
      data: {
        clientId,
        assignmentId,
        status: 'ACTIVE',
        modelUsed: model,
        keyOwnerId: keyContext.keyOwnerId,
      },
    })

    logger.info('Live voice coaching session initialized', {
      sessionId: session.id,
      clientId,
      assignmentId,
      model,
    })

    return NextResponse.json({
      ephemeralToken: token.name,
      sessionId: session.id,
      model,
      workoutContext,
    })
  } catch (error) {
    logger.error('Live voice coaching init failed', { error })
    return NextResponse.json(
      { error: 'Failed to initialize voice coaching session' },
      { status: 500 }
    )
  }
}

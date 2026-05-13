import { NextResponse } from 'next/server'
import { GoogleGenAI, Modality } from '@google/genai'
import { z } from 'zod'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { rateLimitJsonResponse } from '@/lib/api/rate-limit'
import { requireFeatureAccess } from '@/lib/subscription/require-feature-access'
import { requireAiAllowance } from '@/lib/ai/billing/require-ai-allowance'
import { resolveAthleteGoogleKeyContext } from '@/lib/ai/resolve-athlete-google-key'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import {
  buildLiveCoachingSystemInstruction,
  buildStrengthCoachingSystemInstruction,
  buildHybridCoachingSystemInstruction,
} from '@/lib/ai/live-voice-coaching/system-prompt'
import { CARDIO_COACHING_TOOLS, STRENGTH_COACHING_TOOLS, HYBRID_COACHING_TOOLS } from '@/lib/ai/live-voice-coaching/tools'
import { GEMINI_MODELS } from '@/lib/ai/gemini-config'
import type {
  WorkoutContextForLive,
  LiveSegmentInfo,
  StrengthWorkoutContextForLive,
  StrengthExerciseForLive,
  HybridWorkoutContextForLive,
  HybridMovementForLive,
} from '@/lib/ai/live-voice-coaching/types'

export const maxDuration = 30
export const dynamic = 'force-dynamic'

const initSchema = z.object({
  workoutType: z.enum(['cardio', 'strength', 'hybrid']).default('cardio'),
  assignmentId: z.string().uuid(),
  enableCamera: z.boolean().optional().default(false),
})

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

    const allowanceDenied = await requireAiAllowance(clientId)
    if (allowanceDenied) return allowanceDenied

    // Validate body
    const body = await request.json()
    const parsed = initSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { workoutType, assignmentId, enableCamera } = parsed.data

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

    // Check if athlete has active HR session
    const hrParticipant = await prisma.liveHRParticipant.findFirst({
      where: { clientId, session: { status: 'ACTIVE' } },
      select: { id: true },
    })
    const hrAvailable = !!hrParticipant

    let systemInstruction: string
    let tools: typeof CARDIO_COACHING_TOOLS
    let workoutContext: WorkoutContextForLive | StrengthWorkoutContextForLive | HybridWorkoutContextForLive
    let voiceName = 'Kore'
    let cardioAssignmentId: string | null = null
    let strengthAssignmentId: string | null = null
    let hybridAssignmentId: string | null = null

    if (workoutType === 'strength') {
      // ─── Strength Workout ───────────────────────────────────────────
      const assignment = await prisma.strengthSessionAssignment.findFirst({
        where: { id: assignmentId, athleteId: clientId },
        include: {
          session: true,
          athlete: { select: { name: true, preferredVoiceCoachVoice: true } },
          setLogs: { orderBy: { createdAt: 'desc' } },
        },
      })

      if (!assignment) {
        return NextResponse.json({ error: 'Assignment not found or access denied' }, { status: 404 })
      }

      voiceName = assignment.athlete?.preferredVoiceCoachVoice || 'Kore'
      strengthAssignmentId = assignmentId

      // Parse exercises from session JSON fields
      const exercises: StrengthExerciseForLive[] = []
      const sections = [
        { key: 'warmupData', section: 'WARMUP' },
        { key: 'exercises', section: 'MAIN' },
        { key: 'coreData', section: 'CORE' },
        { key: 'cooldownData', section: 'COOLDOWN' },
      ] as const

      for (const { key, section } of sections) {
        const raw = key === 'exercises'
          ? (assignment.session as Record<string, unknown>)[key]
          : ((assignment.session as Record<string, unknown>)[key] as { exercises?: unknown[] } | null)?.exercises

        const exerciseArray = (Array.isArray(raw) ? raw : []) as Array<{
          exerciseId?: string
          name?: string
          sets?: number
          reps?: number | string
          weight?: number
          tempo?: string
          rest?: number
          restSeconds?: number
          notes?: string
        }>

        for (const ex of exerciseArray) {
          const exerciseId = ex.exerciseId || ''
          const completedSets = assignment.setLogs.filter(
            (l) => l.exerciseId === exerciseId
          ).length

          exercises.push({
            index: exercises.length,
            name: ex.name || 'Exercise',
            section,
            sets: ex.sets || 3,
            repsTarget: ex.reps || 10,
            weight: ex.weight ?? undefined,
            tempo: ex.tempo ?? undefined,
            restSeconds: ex.restSeconds ?? ex.rest ?? 90,
            notes: ex.notes ?? undefined,
            completedSets,
          })
        }
      }

      const ctx: StrengthWorkoutContextForLive = {
        workoutName: assignment.session.name || 'Strength Session',
        phase: (assignment.session as Record<string, unknown>).phase as string | undefined,
        exercises,
        athleteName: assignment.athlete?.name ?? undefined,
        coachNotes: assignment.notes ?? undefined,
        estimatedDuration: assignment.session.estimatedDuration ?? undefined,
      }

      workoutContext = ctx
      systemInstruction = buildStrengthCoachingSystemInstruction(ctx, { hrAvailable, cameraEnabled: enableCamera })
      tools = STRENGTH_COACHING_TOOLS
    } else if (workoutType === 'hybrid') {
      // ─── Hybrid Workout ─────────────────────────────────────────────
      const assignment = await prisma.hybridWorkoutAssignment.findFirst({
        where: { id: assignmentId, athleteId: clientId },
        include: {
          workout: { include: { movements: { orderBy: { order: 'asc' }, include: { exercise: { select: { name: true } } } } } },
          athlete: { select: { name: true, preferredVoiceCoachVoice: true } },
        },
      })

      if (!assignment) {
        return NextResponse.json({ error: 'Assignment not found or access denied' }, { status: 404 })
      }

      voiceName = assignment.athlete?.preferredVoiceCoachVoice || 'Kore'
      hybridAssignmentId = assignmentId

      const movements: HybridMovementForLive[] = assignment.workout.movements.map((m) => ({
        order: m.order,
        name: m.exercise?.name || 'Movement',
        reps: m.reps ?? undefined,
        calories: m.calories ?? undefined,
        distance: m.distance ? Number(m.distance) : undefined,
        duration: m.duration ?? undefined,
        weight: m.weightMale ? `${m.weightMale}kg` : undefined,
        notes: m.notes ?? undefined,
      }))

      const ctx: HybridWorkoutContextForLive = {
        workoutName: assignment.workout.name || 'Hybrid Workout',
        format: assignment.workout.format,
        timeCap: assignment.workout.timeCap ?? undefined,
        workTime: assignment.workout.workTime ?? undefined,
        restTime: assignment.workout.restTime ?? undefined,
        totalRounds: assignment.workout.totalRounds ?? undefined,
        totalMinutes: assignment.workout.totalMinutes ?? undefined,
        repScheme: assignment.workout.repScheme ?? undefined,
        movements,
        athleteName: assignment.athlete?.name ?? undefined,
        coachNotes: assignment.notes ?? undefined,
      }

      workoutContext = ctx
      systemInstruction = buildHybridCoachingSystemInstruction(ctx, { hrAvailable, cameraEnabled: enableCamera })
      tools = HYBRID_COACHING_TOOLS
    } else {
      // ─── Cardio Workout ─────────────────────────────────────────────
      const assignment = await prisma.cardioSessionAssignment.findFirst({
        where: { id: assignmentId, athleteId: clientId },
        include: {
          session: true,
          athlete: { select: { name: true, preferredVoiceCoachVoice: true } },
        },
      })

      if (!assignment) {
        return NextResponse.json({ error: 'Assignment not found or access denied' }, { status: 404 })
      }

      voiceName = assignment.athlete?.preferredVoiceCoachVoice || 'Kore'
      cardioAssignmentId = assignmentId

      const rawSegments = (assignment.session.segments ?? []) as Array<{
        type?: string; typeName?: string; duration?: number; plannedDuration?: number
        distance?: number; plannedDistance?: number; zone?: number; plannedZone?: number; notes?: string
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

      const ctx: WorkoutContextForLive = {
        sessionName: assignment.session.name || 'Cardio Session',
        sport: assignment.session.sport || 'Running',
        segments,
        athleteName: assignment.athlete?.name ?? undefined,
        coachNotes: assignment.notes ?? undefined,
        totalDuration: totalDuration > 0 ? totalDuration : undefined,
      }

      workoutContext = ctx
      systemInstruction = buildLiveCoachingSystemInstruction(ctx, { hrAvailable, cameraEnabled: enableCamera })
      tools = CARDIO_COACHING_TOOLS
    }

    // Create ephemeral token
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
            tools: [{ functionDeclarations: tools }],
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
        workoutType: workoutType.toUpperCase(),
        cardioAssignmentId,
        strengthAssignmentId,
        hybridAssignmentId,
        status: 'ACTIVE',
        modelUsed: model,
        keyOwnerId: keyContext.keyOwnerId,
      },
    })

    logger.info('Live voice coaching session initialized', {
      sessionId: session.id,
      clientId,
      workoutType,
      assignmentId,
      model,
    })

    return NextResponse.json({
      ephemeralToken: token.name,
      sessionId: session.id,
      model,
      workoutType,
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

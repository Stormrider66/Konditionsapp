/**
 * Live HR interval export API
 *
 * Converts coach-tagged Live HR blocks into a regular IntervalSession.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireCoach } from '@/lib/auth-utils'
import { exportLiveHRWorkflowToIntervalSession } from '@/lib/live-hr/workflow-export'
import { resolveLocale, t, type AppLocale } from '@/lib/live-hr/api-locale'

interface RouteContext {
  params: Promise<{ id: string }>
}

const targetStepSchema = z.object({
  id: z.string(),
  index: z.number().int().min(0),
  label: z.string(),
  type: z.enum(['INTERVAL', 'REST', 'LAP', 'WARMUP', 'COOLDOWN']),
  durationSeconds: z.number().int().positive().optional(),
  targetPower: z.number().int().positive().optional(),
  targetCadence: z.number().int().positive().optional(),
  targetZone: z.number().int().min(1).max(5).optional(),
  targetHeartRate: z.string().optional(),
  targetCalories: z.number().int().positive().optional(),
  targetDistanceMeters: z.number().int().positive().optional(),
  equipment: z.string().optional(),
  notes: z.string().optional(),
})

const blockSchema = z.object({
  id: z.string(),
  clientId: z.string().nullable(),
  type: z.enum(['INTERVAL', 'REST', 'LAP', 'WARMUP', 'COOLDOWN']),
  label: z.string().min(1).max(120),
  sequence: z.number().int().min(0),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime().nullable().optional(),
  stepIndex: z.number().int().min(0).nullable().optional(),
  target: targetStepSchema.nullable().optional(),
})

const assignmentSchema = z.object({
  clientId: z.string(),
  workoutType: z.enum(['CARDIO', 'HYBRID']),
  workoutId: z.string(),
  workoutName: z.string(),
  sourceAssignmentId: z.string().nullable().optional(),
  currentStepIndex: z.number().int().min(0),
  steps: z.array(targetStepSchema),
  assignedAt: z.string().datetime(),
})

const exportSchema = z.object({
  blocks: z.array(blockSchema).min(1),
  assignments: z.record(assignmentSchema).optional(),
})

export async function POST(req: NextRequest, context: RouteContext) {
  let locale: AppLocale = 'en'

  try {
    const user = await requireCoach()
    locale = resolveLocale(user.language)
    const { id } = await context.params
    const parsed = exportSchema.safeParse(await req.json())

    if (!parsed.success) {
      return NextResponse.json(
        { error: t(locale, 'Invalid interval tags', 'Ogiltiga intervalltaggar') },
        { status: 400 }
      )
    }

    const result = await exportLiveHRWorkflowToIntervalSession({
      coachId: user.id,
      sessionId: id,
      blocks: parsed.data.blocks,
      assignments: parsed.data.assignments,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ intervalSessionId: result.intervalSessionId })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    console.error('Error exporting Live HR interval session:', error)
    return NextResponse.json(
      { error: t(locale, 'Failed to save interval session', 'Kunde inte spara intervallsessionen') },
      { status: 500 }
    )
  }
}

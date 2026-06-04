// app/api/physio/rehab-programs/[id]/exercises/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePhysio } from '@/lib/auth-utils'
import { z } from 'zod'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

const addExerciseSchema = z.object({
  exerciseId: z.string().uuid(),
  phases: z.array(z.enum(['ACUTE', 'SUBACUTE', 'REMODELING', 'FUNCTIONAL', 'RETURN_TO_SPORT'])).default([]),
  sets: z.number().int().min(1).default(3),
  reps: z.string().optional(), // Can be "10-12" or "30 sec"
  duration: z.number().int().optional(), // Duration in seconds
  frequency: z.string().optional(), // "Daily", "2x/day", etc.
  intensity: z.string().optional(),
  progressionCriteria: z.string().optional(),
  regressionCriteria: z.string().optional(),
  notes: z.string().optional(),
  order: z.number().int().optional(),
})

/**
 * POST /api/physio/rehab-programs/[id]/exercises
 * Add an exercise to a rehab program
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let locale = resolveRequestLocale(request)

  try {
    const user = await requirePhysio()
    locale = resolveRequestLocale(request, user.language)
    const { id: programId } = await params
    const body = await request.json()
    const validatedData = addExerciseSchema.parse(body)

    // Check if program exists and belongs to this physio
    const program = await prisma.rehabProgram.findUnique({
      where: { id: programId },
    })

    if (!program) {
      return NextResponse.json({ error: t(locale, 'Rehab program not found', 'Rehabprogrammet hittades inte') }, { status: 404 })
    }

    if (program.physioUserId !== user.id) {
      return NextResponse.json({ error: t(locale, 'Access denied', 'Åtkomst nekad') }, { status: 403 })
    }

    // Verify exercise exists
    const exercise = await prisma.exercise.findUnique({
      where: { id: validatedData.exerciseId },
    })

    if (!exercise) {
      return NextResponse.json({ error: t(locale, 'Exercise not found', 'Övningen hittades inte') }, { status: 404 })
    }

    // Get next order if not provided
    let order = validatedData.order
    if (order === undefined) {
      const lastExercise = await prisma.rehabExercise.findFirst({
        where: { programId },
        orderBy: { order: 'desc' },
      })
      order = (lastExercise?.order ?? 0) + 1
    }

    const rehabExercise = await prisma.rehabExercise.create({
      data: {
        programId,
        exerciseId: validatedData.exerciseId,
        phases: validatedData.phases,
        sets: validatedData.sets,
        reps: validatedData.reps,
        duration: validatedData.duration,
        frequency: validatedData.frequency,
        intensity: validatedData.intensity,
        progressionCriteria: validatedData.progressionCriteria,
        regressionCriteria: validatedData.regressionCriteria,
        notes: validatedData.notes,
        order,
        isActive: true,
      },
      include: {
        exercise: {
          select: {
            id: true,
            name: true,
            nameSv: true,
            nameEn: true,
            videoUrl: true,
          },
        },
      },
    })

    return NextResponse.json(rehabExercise, { status: 201 })
  } catch (error) {
    console.error('Error adding exercise to rehab program:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: t(locale, 'Validation error', 'Valideringsfel'), details: error.errors },
        { status: 400 }
      )
    }
    if (error instanceof Error && error.message.includes('Access denied')) {
      return NextResponse.json({ error: t(locale, 'Access denied', 'Åtkomst nekad') }, { status: 403 })
    }
    return NextResponse.json(
      { error: t(locale, 'Failed to add exercise to rehab program', 'Kunde inte lägga till övningen i rehabprogrammet') },
      { status: 500 }
    )
  }
}

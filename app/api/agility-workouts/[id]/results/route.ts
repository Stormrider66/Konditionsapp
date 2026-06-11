// app/api/agility-workouts/[id]/results/route.ts
// API routes for agility workout results

import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { canAccessAthlete } from '@/lib/auth/athlete-access'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { getFutureWorkoutCompletionWarning } from '@/lib/workouts/future-completion-guard'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

const drillResultSchema = z.object({
  drillId: z.string().uuid(),
  completed: z.boolean(),
  timeSeconds: z.number().optional().nullable(),
  notes: z.string().optional().nullable()
})

const submitResultSchema = z.object({
  totalDuration: z.number().int().min(0).optional(),
  perceivedEffort: z.number().int().min(1).max(10).optional(),
  notes: z.string().optional(),
  drillResults: z.array(drillResultSchema).optional(),
  assignmentId: z.string().uuid().optional(),
  allowFutureCompletion: z.boolean().optional()
})

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/agility-workouts/[id]/results - List results for workout
export async function GET(request: NextRequest, { params }: RouteParams) {
  const locale = resolveRequestLocale(request)

  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const athleteId = searchParams.get('athleteId')
    const limit = parseInt(searchParams.get('limit') || '50')

    // Verify workout exists
    const workout = await prisma.agilityWorkout.findUnique({
      where: { id },
      select: { coachId: true }
    })

    if (!workout) {
      return NextResponse.json({ error: t(locale, 'Workout not found', 'Passet hittades inte') }, { status: 404 })
    }

    // Coaches can only access results for workouts they own.
    if (workout.coachId !== user.id) {
      return NextResponse.json({ error: t(locale, 'Forbidden', 'Förbjudet') }, { status: 403 })
    }

    const where: Record<string, unknown> = { workoutId: id }

    if (athleteId) {
      const access = await canAccessAthlete(user.id, athleteId)
      if (!access.allowed) {
        return NextResponse.json({ error: t(locale, 'Forbidden', 'Förbjudet') }, { status: 403 })
      }
      where.athleteId = athleteId
    }

    const results = await prisma.agilityWorkoutResult.findMany({
      where,
      orderBy: { completedAt: 'desc' },
      take: limit,
      include: {
        athlete: {
          select: { id: true, name: true }
        },
        workout: {
          select: { id: true, name: true }
        }
      }
    })

    return NextResponse.json(results)
  } catch (error) {
    console.error('Error fetching workout results:', error)
    return NextResponse.json(
      { error: t(locale, 'Failed to fetch workout results', 'Kunde inte hämta passresultat') },
      { status: 500 }
    )
  }
}

// POST /api/agility-workouts/[id]/results - Submit workout result (athlete)
export async function POST(request: NextRequest, { params }: RouteParams) {
  let locale = resolveRequestLocale(request)

  try {
    const { id } = await params
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    const { clientId } = resolved
    locale = resolveRequestLocale(request, resolved.user.language)

    // Verify workout exists
    const workout = await prisma.agilityWorkout.findUnique({
      where: { id },
      include: {
        drills: {
          select: { drillId: true }
        }
      }
    })

    if (!workout) {
      return NextResponse.json({ error: t(locale, 'Workout not found', 'Passet hittades inte') }, { status: 404 })
    }

    const body = await request.json()
    const validatedData = submitResultSchema.parse(body)

    const assignment = validatedData.assignmentId
      ? await prisma.agilityWorkoutAssignment.findUnique({
          where: { id: validatedData.assignmentId },
          select: { id: true, workoutId: true, athleteId: true, assignedDate: true }
        })
      : await prisma.agilityWorkoutAssignment.findFirst({
          where: {
            workoutId: id,
            athleteId: clientId,
            status: { not: 'COMPLETED' }
          },
          orderBy: { assignedDate: 'asc' },
          select: { id: true, workoutId: true, athleteId: true, assignedDate: true }
        })

    if (assignment) {
      if (assignment.workoutId !== id || assignment.athleteId !== clientId) {
        return NextResponse.json({ error: t(locale, 'Forbidden', 'Förbjudet') }, { status: 403 })
      }

      const warning = getFutureWorkoutCompletionWarning({
        assignedDate: assignment.assignedDate,
        allowFutureCompletion: validatedData.allowFutureCompletion,
        locale,
      })

      if (warning) {
        return NextResponse.json({ success: false, ...warning }, { status: 409 })
      }
    }

    // Create result
    const result = await prisma.agilityWorkoutResult.create({
      data: {
        workoutId: id,
        athleteId: clientId,
        completedAt: new Date(),
        totalDuration: validatedData.totalDuration,
        perceivedEffort: validatedData.perceivedEffort,
        notes: validatedData.notes,
        drillResults: validatedData.drillResults || Prisma.JsonNull
      },
      include: {
        athlete: {
          select: { id: true, name: true }
        },
        workout: {
          select: { id: true, name: true }
        }
      }
    })

    // Update assignment status if exists
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    await prisma.agilityWorkoutAssignment.updateMany({
      where: {
        workoutId: id,
        athleteId: clientId,
        status: { in: ['ASSIGNED', 'IN_PROGRESS'] }
      },
      data: {
        status: 'COMPLETED',
        completedAt: new Date()
      }
    })

    // Create TrainingLoad entry for agility workout
    const durationMinutes = (validatedData.totalDuration || 0) / 60
    if (durationMinutes > 0) {
      const rpeValue = validatedData.perceivedEffort || 6
      const agilityTSS = Math.round(durationMinutes * (rpeValue / 10) * 0.9)
      const intensity = rpeValue <= 3 ? 'EASY' : rpeValue <= 5 ? 'MODERATE' : rpeValue <= 7 ? 'HARD' : 'VERY_HARD'

      const existingLoad = await prisma.trainingLoad.findFirst({
        where: {
          clientId,
          date: today,
          workoutType: 'AGILITY',
          source: 'WORKOUT',
        },
      })

      if (existingLoad) {
        await prisma.trainingLoad.update({
          where: { id: existingLoad.id },
          data: {
            dailyLoad: existingLoad.dailyLoad + agilityTSS,
            duration: existingLoad.duration + durationMinutes,
          },
        })
      } else {
        await prisma.trainingLoad.create({
          data: {
            clientId,
            date: today,
            dailyLoad: agilityTSS,
            loadType: 'AGILITY_TSS',
            duration: durationMinutes,
            intensity,
            workoutType: 'AGILITY',
          },
        })
      }
    }

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: t(locale, 'Validation error', 'Valideringsfel'), details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error submitting workout result:', error)
    return NextResponse.json(
      { error: t(locale, 'Failed to submit workout result', 'Kunde inte skicka in passresultat') },
      { status: 500 }
    )
  }
}

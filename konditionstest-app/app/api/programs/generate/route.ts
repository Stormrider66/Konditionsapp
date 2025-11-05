// app/api/programs/generate/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { generateBaseProgram, validateProgramParams, ProgramGenerationParams } from '@/lib/program-generator'
import { requireCoach, hasReachedAthleteLimit } from '@/lib/auth-utils'

/**
 * POST /api/programs/generate
 * Generate a new training program from test results
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate and authorize
    const user = await requireCoach()

    // Check subscription limits
    const limitReached = await hasReachedAthleteLimit(user.id)
    if (limitReached) {
      return NextResponse.json(
        {
          success: false,
          error: 'Du har nått gränsen för antalet atleter i din prenumeration',
        },
        { status: 403 }
      )
    }

    const body = await request.json()

    // Validate parameters
    const params: ProgramGenerationParams = {
      testId: body.testId,
      clientId: body.clientId,
      coachId: user.id,
      goalType: body.goalType || 'fitness',
      targetRaceDate: body.targetRaceDate ? new Date(body.targetRaceDate) : undefined,
      durationWeeks: body.durationWeeks || 12,
      trainingDaysPerWeek: body.trainingDaysPerWeek || 4,
      experienceLevel: body.experienceLevel || 'intermediate',
      currentWeeklyVolume: body.currentWeeklyVolume,
      notes: body.notes,
    }

    // Validate parameters
    const validationErrors = validateProgramParams(params)
    if (validationErrors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Valideringsfel',
          details: validationErrors,
        },
        { status: 400 }
      )
    }

    // Fetch test with training zones
    const test = await prisma.test.findUnique({
      where: { id: params.testId },
      include: {
        testStages: {
          orderBy: { sequence: 'asc' },
        },
      },
    })

    if (!test) {
      return NextResponse.json(
        {
          success: false,
          error: 'Test hittades inte',
        },
        { status: 404 }
      )
    }

    // Verify test has training zones
    if (!test.trainingZones || (test.trainingZones as any[]).length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Testet saknar träningszoner. Vänligen beräkna zoner först.',
        },
        { status: 400 }
      )
    }

    // Fetch client
    const client = await prisma.client.findUnique({
      where: { id: params.clientId },
    })

    if (!client) {
      return NextResponse.json(
        {
          success: false,
          error: 'Klient hittades inte',
        },
        { status: 404 }
      )
    }

    // Verify ownership
    if (test.userId !== user.id || client.userId !== user.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Obehörig åtkomst',
        },
        { status: 403 }
      )
    }

    // Generate program
    const programData = await generateBaseProgram(test as any, client as any, params)

    // Validate program data
    if (!programData.weeks || programData.weeks.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Program generation failed: no weeks generated',
        },
        { status: 500 }
      )
    }

    // Save to database
    const program = await prisma.trainingProgram.create({
      data: {
        clientId: programData.clientId,
        coachId: programData.coachId,
        testId: programData.testId,
        name: programData.name,
        goalType: programData.goalType,
        startDate: programData.startDate,
        endDate: programData.endDate,
        description: programData.notes || null,
        generatedFromTest: true,
        weeks: {
          create: programData.weeks.map((week) => ({
            weekNumber: week.weekNumber,
            startDate: new Date(
              programData.startDate.getTime() + (week.weekNumber - 1) * 7 * 24 * 60 * 60 * 1000
            ),
            endDate: new Date(
              programData.startDate.getTime() + week.weekNumber * 7 * 24 * 60 * 60 * 1000
            ),
            phase: week.phase,
            weeklyVolume: week.volume,
            focus: week.focus,
            days: {
              create: week.days.map((day) => ({
                dayNumber: day.dayNumber,
                date: new Date(
                  programData.startDate.getTime() + (week.weekNumber - 1) * 7 * 24 * 60 * 60 * 1000 + (day.dayNumber - 1) * 24 * 60 * 60 * 1000
                ),
                notes: day.notes,
                workouts: {
                  create: day.workouts.map((workout, index) => ({
                    type: workout.type,
                    name: workout.name,
                    order: index + 1,
                    intensity: workout.intensity,
                    duration: workout.duration,
                    distance: workout.distance,
                    instructions: workout.instructions,
                    segments: {
                      create: workout.segments?.map((segment) => ({
                        order: segment.order,
                        type: segment.type,
                        duration: segment.duration,
                        distance: segment.distance,
                        zone: segment.zone,
                        pace: segment.pace,
                        power: segment.power,
                        heartRate: segment.heartRate,
                        reps: segment.reps,
                        sets: segment.sets,
                        repsCount: segment.repsCount,
                        rest: segment.rest,
                        tempo: segment.tempo,
                        weight: segment.weight,
                        exerciseId: segment.exerciseId,
                        description: segment.description,
                        notes: segment.notes,
                      })) || [],
                    },
                  })),
                },
              })),
            },
          })),
        },
      },
      include: {
        weeks: {
          include: {
            days: {
              include: {
                workouts: {
                  include: {
                    segments: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    return NextResponse.json(
      {
        success: true,
        data: program,
        message: 'Träningsprogram skapat',
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Error generating program:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Misslyckades med att skapa träningsprogram',
      },
      { status: 500 }
    )
  }
}

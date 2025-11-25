// app/api/programs/generate/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { generateBaseProgram, validateProgramParams, ProgramGenerationParams } from '@/lib/program-generator'
import { requireCoach, hasReachedAthleteLimit } from '@/lib/auth-utils'
import { logger } from '@/lib/logger'

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

      // Phase 6: Methodology integration
      methodology: body.methodology, // Optional - defaults to POLARIZED if not provided
      athleteLevel: body.athleteLevel, // Optional - will be mapped from experienceLevel if not provided

      // Granular session control
      runningSessionsPerWeek: body.runningSessionsPerWeek || body.trainingDaysPerWeek || 4,
      strengthSessionsPerWeek: body.strengthSessionsPerWeek || 0,
      coreSessionsPerWeek: body.coreSessionsPerWeek || 0,
      alternativeTrainingSessionsPerWeek: body.alternativeTrainingSessionsPerWeek || 0,
      scheduleStrengthAfterRunning: body.scheduleStrengthAfterRunning !== undefined ? body.scheduleStrengthAfterRunning : false,
      scheduleCoreAfterRunning: body.scheduleCoreAfterRunning !== undefined ? body.scheduleCoreAfterRunning : false,
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
    let programData;

    if (params.methodology === 'CUSTOM') {
        // 1. Calculate Start and End Dates
        // Default to tomorrow if no race date, or back-calculate if needed.
        // For custom, start tomorrow and create empty structure for manual building
        const startDate = new Date();
        startDate.setDate(startDate.getDate() + 1); // Start tomorrow
        startDate.setHours(0, 0, 0, 0);

        const durationWeeks = params.durationWeeks;
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + (durationWeeks * 7));

        // 2. Construct empty program structure
        programData = {
            name: `Custom Program - ${params.goalType}`,
            clientId: params.clientId,
            coachId: user.id,
            testId: params.testId,
            goalType: params.goalType,
            startDate,
            endDate,
            notes: params.notes,
            weeks: Array.from({ length: durationWeeks }).map((_, i) => ({
                weekNumber: i + 1,
                phase: 'BASE',
                volume: 0,
                focus: 'General',
                days: Array.from({ length: 7 }).map((_, j) => ({
                    dayNumber: j + 1,
                    notes: '',
                    workouts: [] // Empty workouts
                }))
            }))
        };
    } else {
        // Standard generation
        programData = await generateBaseProgram(test as any, client as any, params)
    }

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
  } catch (error: unknown) {
    logger.error('Error generating program', {}, error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      {
        success: false,
        error: 'Misslyckades med att skapa träningsprogram',
      },
      { status: 500 }
    )
  }
}

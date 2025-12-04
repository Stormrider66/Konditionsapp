// app/api/programs/generate/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { generateBaseProgram, validateProgramParams, ProgramGenerationParams } from '@/lib/program-generator'
import { generateSportProgram, SportProgramParams, DataSourceType } from '@/lib/program-generator/sport-router'
import { requireCoach, hasReachedAthleteLimit } from '@/lib/auth-utils'
import { logger } from '@/lib/logger'
import { WorkoutType, WorkoutIntensity, SportType } from '@prisma/client'
import {
  getGeneralFitnessProgram,
  getProgramDescription,
  type FitnessGoal,
  type FitnessLevel,
} from '@/lib/program-generator/templates/general-fitness'

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

    // ========================================
    // NEW: Multi-Sport Program Generation
    // ========================================
    // If `sport` is provided, use the new sport router
    if (body.sport && Object.values(SportType).includes(body.sport as SportType)) {
      console.log(`[API] Using sport router for sport: ${body.sport}`)

      // Fetch client
      const client = await prisma.client.findUnique({
        where: { id: body.clientId },
      })

      if (!client) {
        return NextResponse.json(
          { success: false, error: 'Klient hittades inte' },
          { status: 404 }
        )
      }

      // Verify client ownership
      if (client.userId !== user.id) {
        return NextResponse.json(
          { success: false, error: 'Obehörig åtkomst' },
          { status: 403 }
        )
      }

      // Fetch test if testId provided
      let test = null
      if (body.testId && body.testId.trim() !== '') {
        test = await prisma.test.findUnique({
          where: { id: body.testId },
          include: {
            testStages: { orderBy: { sequence: 'asc' } },
          },
        })

        if (test && test.userId !== user.id) {
          return NextResponse.json(
            { success: false, error: 'Obehörig åtkomst till test' },
            { status: 403 }
          )
        }
      }

      // Build sport program params
      const sportParams: SportProgramParams = {
        clientId: body.clientId,
        coachId: user.id,
        sport: body.sport as SportType,
        goal: body.goal || body.goalType || 'custom',
        dataSource: (body.dataSource || 'MANUAL') as DataSourceType,
        durationWeeks: body.durationWeeks || 12,
        sessionsPerWeek: body.sessionsPerWeek || body.trainingDaysPerWeek || 4,
        notes: body.notes,
        targetRaceDate: body.targetRaceDate ? new Date(body.targetRaceDate) : undefined,
        testId: body.testId,

        // Manual values
        manualFtp: body.manualFtp || body.ftp,
        manualCss: body.manualCss || body.css,
        manualVdot: body.manualVdot || body.vdot,

        // Sport-specific
        methodology: body.methodology,
        weeklyHours: body.weeklyHours,
        bikeType: body.bikeType,
        technique: body.technique,
        poolLength: body.poolLength,

        // Strength integration
        includeStrength: body.includeStrength,
        strengthSessionsPerWeek: body.strengthSessionsPerWeek,

        // ===== NEW FIELDS FROM WIZARD =====

        // Athlete Profile (Running/HYROX/Triathlon)
        experienceLevel: body.experienceLevel,
        yearsRunning: body.yearsRunning,
        currentWeeklyVolume: body.currentWeeklyVolume,
        longestLongRun: body.longestLongRun,

        // Race Results for VDOT (pure running races only)
        recentRaceDistance: body.recentRaceDistance,
        recentRaceTime: body.recentRaceTime,

        // Target Race Goal Time (for progressive pace calculation)
        targetTime: body.targetTime,

        // Core & Alternative Training
        coreSessionsPerWeek: body.coreSessionsPerWeek,
        alternativeTrainingSessionsPerWeek: body.alternativeTrainingSessionsPerWeek,
        scheduleStrengthAfterRunning: body.scheduleStrengthAfterRunning,
        scheduleCoreAfterRunning: body.scheduleCoreAfterRunning,

        // Equipment & Monitoring
        hasLactateMeter: body.hasLactateMeter,
        hasHRVMonitor: body.hasHRVMonitor,
        hasPowerMeter: body.hasPowerMeter,

        // ===== HYROX Station Times =====
        hyroxStationTimes: body.hyroxStationTimes ? parseHyroxStationTimes(body.hyroxStationTimes) : undefined,
        hyroxDivision: body.hyroxDivision,
        hyroxGender: body.hyroxGender,
        hyroxBodyweight: body.hyroxBodyweight,

        // ===== Strength PRs =====
        strengthPRs: body.strengthPRs,

        // General Fitness
        fitnessGoal: body.fitnessGoal,
        fitnessLevel: body.fitnessLevel,
        hasGymAccess: body.hasGymAccess,
        preferredActivities: body.preferredActivities,
      }

      // Generate program using sport router
      const programData = await generateSportProgram(
        sportParams,
        client as any,
        test as any
      )

      // Save to database
      const program = await prisma.trainingProgram.create({
        data: {
          clientId: programData.clientId,
          coachId: programData.coachId,
          testId: programData.testId || null,
          name: programData.name,
          goalType: programData.goalType,
          startDate: programData.startDate,
          endDate: programData.endDate,
          description: programData.notes || null,
          generatedFromTest: !!programData.testId,
          weeks: {
            create: programData.weeks?.map((week) => ({
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
            })) || [],
          },
        },
        include: {
          weeks: {
            include: {
              days: {
                include: {
                  workouts: {
                    include: { segments: true },
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
    }

    // ========================================
    // LEGACY: Original Program Generation
    // ========================================
    // Validate parameters
    const params: ProgramGenerationParams = {
      testId: body.testId,
      clientId: body.clientId,
      coachId: user.id,
      goalType: body.goalType || 'fitness',
      targetRaceDate: body.targetRaceDate ? new Date(body.targetRaceDate) : undefined,
      targetTime: body.targetTime, // Target race time (e.g., "3:00:00" for 3h marathon)
      durationWeeks: body.durationWeeks || 12,
      trainingDaysPerWeek: body.trainingDaysPerWeek || 4,
      experienceLevel: body.experienceLevel || 'intermediate',
      currentWeeklyVolume: body.currentWeeklyVolume,
      notes: body.notes,

      // Recent race result for current fitness (Canova: "10k/HM PRs used to calculate baseline")
      recentRaceDistance: body.recentRaceDistance, // e.g., "HALF", "10K", "5K"
      recentRaceTime: body.recentRaceTime, // e.g., "1:28:00" for half marathon

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

    // Extract General Fitness specific params
    const fitnessParams = {
      fitnessGoal: (body.fitnessGoal || 'general_health') as FitnessGoal,
      fitnessLevel: (body.fitnessLevel || 'moderately_active') as FitnessLevel,
      hasGymAccess: body.hasGymAccess || false,
      preferredActivities: body.preferredActivities || [],
    }

    // For CUSTOM methodology, testId is optional
    const isCustomProgram = (params.methodology as string) === 'CUSTOM'

    // Validate parameters (skip testId validation for custom programs)
    if (!isCustomProgram) {
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
    }

    // Fetch client first (always required)
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

    // Verify client ownership
    if (client.userId !== user.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Obehörig åtkomst',
        },
        { status: 403 }
      )
    }

    // Fetch test with training zones (only if testId is provided and not empty)
    let test = null
    if (params.testId && params.testId.trim() !== '') {
      test = await prisma.test.findUnique({
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

      // Verify test ownership
      if (test.userId !== user.id) {
        return NextResponse.json(
          {
            success: false,
            error: 'Obehörig åtkomst',
          },
          { status: 403 }
        )
      }

      // Verify test has training zones (only for non-custom programs)
      if (!isCustomProgram && (!test.trainingZones || (test.trainingZones as any[]).length === 0)) {
        return NextResponse.json(
          {
            success: false,
            error: 'Testet saknar träningszoner. Vänligen beräkna zoner först.',
          },
          { status: 400 }
        )
      }
    } else if (!isCustomProgram) {
      // Test is required for non-custom programs
      return NextResponse.json(
        {
          success: false,
          error: 'Test krävs för detta programtyp',
        },
        { status: 400 }
      )
    }

    // Generate program
    let programData;

    // Custom programs always create empty structure (regardless of goalType)
    if (isCustomProgram) {
        // 1. Calculate Start and End Dates
        // Default to tomorrow if no race date, or back-calculate if needed.
        // For custom, start tomorrow and create empty structure for manual building
        const startDate = new Date();
        startDate.setDate(startDate.getDate() + 1); // Start tomorrow
        startDate.setHours(0, 0, 0, 0);

        const durationWeeks = params.durationWeeks;
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + (durationWeeks * 7));

        // Map goal type to display name
        const goalTypeLabels: Record<string, string> = {
          'marathon': 'Marathon',
          'half-marathon': 'Halvmaraton',
          '10k': '10K',
          '5k': '5K',
          'fitness': 'Fitness',
          'cycling': 'Cykling',
          'skiing': 'Skidåkning',
          'swimming': 'Simning',
          'triathlon': 'Triathlon',
          'hyrox': 'HYROX',
          'custom': 'Anpassad',
        }

        const goalLabel = goalTypeLabels[params.goalType] || params.goalType

        // 2. Construct empty program structure
        programData = {
            name: `${goalLabel} - ${client.name}`,
            clientId: params.clientId,
            coachId: user.id,
            testId: params.testId || null, // testId is optional for custom programs
            goalType: params.goalType,
            startDate,
            endDate,
            notes: params.notes || `Anpassat ${goalLabel.toLowerCase()}-program`,
            weeks: Array.from({ length: durationWeeks }).map((_, i) => ({
                weekNumber: i + 1,
                phase: 'BASE' as const,
                volume: 0,
                focus: 'General',
                days: Array.from({ length: 7 }).map((_, j) => ({
                    dayNumber: j + 1,
                    notes: '',
                    workouts: [] // Empty workouts
                }))
            }))
        };
    } else if (params.goalType === 'fitness') {
      // Generate General Fitness program from templates
      const fitnessWeeks = getGeneralFitnessProgram(
        fitnessParams.fitnessGoal,
        fitnessParams.fitnessLevel,
        Math.min(6, Math.max(3, params.trainingDaysPerWeek)) as 3 | 4 | 5 | 6,
        {
          hasGymAccess: fitnessParams.hasGymAccess,
          preferredActivities: fitnessParams.preferredActivities,
        }
      )

      const programDesc = getProgramDescription(fitnessParams.fitnessGoal)
      const durationWeeks = fitnessWeeks.length

      const startDate = new Date()
      startDate.setDate(startDate.getDate() + 1) // Start tomorrow
      startDate.setHours(0, 0, 0, 0)

      const endDate = new Date(startDate)
      endDate.setDate(endDate.getDate() + durationWeeks * 7)

      programData = {
        name: `${programDesc.titleSv} - ${client.name}`,
        clientId: params.clientId,
        coachId: user.id,
        testId: params.testId || null,
        goalType: params.goalType,
        startDate,
        endDate,
        notes: params.notes || programDesc.descriptionSv,
        weeks: fitnessWeeks.map((week, weekIndex) => ({
          weekNumber: week.week,
          phase: week.phase,
          volume: 0,
          focus: week.focus,
          days: Array.from({ length: 7 }).map((_, dayIndex) => {
            // Distribute workouts across available days
            const workout = week.workouts[dayIndex % week.workouts.length]
            const hasWorkout = dayIndex < week.workouts.length

            return {
              dayNumber: dayIndex + 1,
              notes: hasWorkout ? week.tips[dayIndex % week.tips.length] || '' : '',
              workouts: hasWorkout && workout
                ? [
                    {
                      type: mapFitnessWorkoutType(workout.type),
                      name: workout.name,
                      intensity: mapIntensity(workout.intensity),
                      duration: workout.duration,
                      distance: undefined,
                      instructions: workout.description,
                      segments: [],
                    },
                  ]
                : [],
            }
          }),
        })),
      }
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

// Helper function to map fitness workout types to database workout types
function mapFitnessWorkoutType(
  type: 'cardio' | 'strength' | 'hiit' | 'mobility' | 'yoga' | 'active-rest' | 'circuit' | 'core'
): WorkoutType {
  const typeMap: Record<string, WorkoutType> = {
    cardio: WorkoutType.RUNNING,
    strength: WorkoutType.STRENGTH,
    hiit: WorkoutType.RUNNING, // HIIT typically running-based intervals
    mobility: WorkoutType.RECOVERY,
    yoga: WorkoutType.RECOVERY,
    'active-rest': WorkoutType.RECOVERY,
    circuit: WorkoutType.STRENGTH,
    core: WorkoutType.CORE,
  }
  return typeMap[type] || WorkoutType.OTHER
}

// Helper function to map intensity levels
function mapIntensity(intensity: 'low' | 'moderate' | 'high' | 'very_high'): WorkoutIntensity {
  const intensityMap: Record<string, WorkoutIntensity> = {
    low: WorkoutIntensity.EASY,
    moderate: WorkoutIntensity.MODERATE,
    high: WorkoutIntensity.THRESHOLD,
    very_high: WorkoutIntensity.INTERVAL,
  }
  return intensityMap[intensity] || WorkoutIntensity.MODERATE
}

// Helper function to parse HYROX station times from MM:SS strings to seconds
function parseHyroxStationTimes(times: {
  skierg?: string
  sledPush?: string
  sledPull?: string
  burpeeBroadJump?: string
  rowing?: string
  farmersCarry?: string
  sandbagLunge?: string
  wallBalls?: string
  averageRunPace?: string
}): {
  skierg?: number | null
  sledPush?: number | null
  sledPull?: number | null
  burpeeBroadJump?: number | null
  rowing?: number | null
  farmersCarry?: number | null
  sandbagLunge?: number | null
  wallBalls?: number | null
  averageRunPace?: number | null
} {
  const parseTimeToSeconds = (timeStr?: string): number | null => {
    if (!timeStr || timeStr.trim() === '') return null
    const parts = timeStr.split(':').map(Number)
    if (parts.some(isNaN)) return null
    if (parts.length === 2) {
      // MM:SS
      return parts[0] * 60 + parts[1]
    } else if (parts.length === 3) {
      // H:MM:SS
      return parts[0] * 3600 + parts[1] * 60 + parts[2]
    }
    return null
  }

  return {
    skierg: parseTimeToSeconds(times.skierg),
    sledPush: parseTimeToSeconds(times.sledPush),
    sledPull: parseTimeToSeconds(times.sledPull),
    burpeeBroadJump: parseTimeToSeconds(times.burpeeBroadJump),
    rowing: parseTimeToSeconds(times.rowing),
    farmersCarry: parseTimeToSeconds(times.farmersCarry),
    sandbagLunge: parseTimeToSeconds(times.sandbagLunge),
    wallBalls: parseTimeToSeconds(times.wallBalls),
    averageRunPace: parseTimeToSeconds(times.averageRunPace),
  }
}

// app/api/programs/generate/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateBaseProgram, validateProgramParams, ProgramGenerationParams } from '@/lib/program-generator'
import { generateSportProgram, SportProgramParams, DataSourceType } from '@/lib/program-generator/sport-router'
import { getProgramStartDate, getProgramEndDate } from '@/lib/program-generator/date-utils'
import { canAccessClient, requireCoach, hasReachedAthleteLimit } from '@/lib/auth-utils'
import { logger } from '@/lib/logger'
import { Prisma, WorkoutType, WorkoutIntensity, SportType } from '@prisma/client'
import { logDebug, logError } from '@/lib/logger-console'
import { Client as AppClient, Test as AppTest, type CreateTrainingProgramDTO } from '@/types'
import {
  getGeneralFitnessProgram,
  getProgramDescription,
  type FitnessGoal,
  type FitnessLevel,
} from '@/lib/program-generator/templates/general-fitness'
import { metricValuesForTest, type HockeyTestForSummary } from '@/lib/hockey/team-test-metrics'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'
import { testQualityReviewBlocksProgram } from '@/lib/testing/test-quality-review'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

function testQualityReviewError(locale: AppLocale) {
  return t(
    locale,
    'This test has data-quality warnings and must be approved before it can be used for program generation.',
    'Det här testet har datakvalitetsvarningar och måste godkännas innan det används för programgenerering.'
  )
}

const hockeyTestSelect = {
  id: true,
  clientId: true,
  testDate: true,
  sprint5m: true,
  sprint10m: true,
  sprint20m: true,
  sprint30m: true,
  sprint20mFly: true,
  sprint30mFly: true,
  agility505Left: true,
  agility505Right: true,
  endurance7x40: true,
  gripStrengthLeft: true,
  gripStrengthRight: true,
  standingLongJump: true,
  threeJumpLeft: true,
  threeJumpRight: true,
  beepTestLevel: true,
  beepTestShuttle: true,
  wingate30sAveragePower: true,
  vo2Max: true,
  lt1SpeedKmh: true,
  lt1HeartRate: true,
  lt1Lactate: true,
  lt2SpeedKmh: true,
  lt2HeartRate: true,
  lt2Lactate: true,
  maxLactate: true,
  maxHeartRate: true,
  rampTimeSeconds: true,
  backSquat1RM: true,
  powerClean1RM: true,
  benchPress1RM: true,
  pullUp1RM: true,
  muscleLabMaxima: true,
} satisfies Prisma.HockeyPhysicalTestSelect

type HockeyTestRecord = HockeyTestForSummary & { id: string }

async function saveGeneratedProgram(programData: CreateTrainingProgramDTO, generatedFromTest: boolean) {
  return prisma.trainingProgram.create({
    data: {
      clientId: programData.clientId,
      coachId: programData.coachId,
      testId: programData.testId || null,
      name: programData.name,
      goalType: programData.goalType,
      startDate: programData.startDate,
      endDate: programData.endDate,
      description: programData.notes || null,
      generatedFromTest,
      planningMetadata: programData.planningMetadata as Prisma.InputJsonValue | undefined,
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
}

function normalizeClientIds(body: Record<string, unknown>): string[] {
  const ids = Array.isArray(body.clientIds)
    ? body.clientIds.filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
    : []
  if (typeof body.clientId === 'string' && body.clientId.trim().length > 0) {
    ids.unshift(body.clientId)
  }
  return Array.from(new Set(ids))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

async function resolveHockeyTestForClient(
  clientId: string,
  body: Record<string, unknown>
): Promise<HockeyTestRecord | null> {
  const mappedId = isRecord(body.hockeyTestIdsByClient)
    ? body.hockeyTestIdsByClient[clientId]
    : undefined
  const hockeyTestId = typeof mappedId === 'string' ? mappedId : body.hockeyTestId

  if (typeof hockeyTestId === 'string' && hockeyTestId.trim().length > 0) {
    return prisma.hockeyPhysicalTest.findFirst({
      where: {
        id: hockeyTestId,
        clientId,
      },
      select: hockeyTestSelect,
    }) as Promise<HockeyTestRecord | null>
  }

  return prisma.hockeyPhysicalTest.findFirst({
    where: { clientId },
    orderBy: { testDate: 'desc' },
    select: hockeyTestSelect,
  }) as Promise<HockeyTestRecord | null>
}

/**
 * POST /api/programs/generate
 * Generate a new training program from test results
 */
export async function POST(request: NextRequest) {
  let locale: AppLocale = resolveRequestLocale(request)

  try {
    // Authenticate and authorize
    const user = await requireCoach()
    locale = resolveRequestLocale(request, user.language)

    // Check subscription limits
    const limitReached = await hasReachedAthleteLimit(user.id)
    if (limitReached) {
      return NextResponse.json(
        {
          success: false,
          error: t(locale, 'You have reached the athlete limit for your subscription', 'Du har nått gränsen för antalet atleter i din prenumeration'),
        },
        { status: 403 }
      )
    }

    const body = await request.json()
    const clientIds = normalizeClientIds(body)
    if (clientIds.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: t(locale, 'Client ID is missing', 'Klient-ID saknas'),
        },
        { status: 400 }
      )
    }

    const accessResults = await Promise.all(clientIds.map((clientId) => canAccessClient(user.id, clientId)))
    if (accessResults.some((hasAccess) => !hasAccess)) {
      return NextResponse.json(
        {
          success: false,
          error: t(locale, 'Unauthorized access', 'Obehörig åtkomst'),
        },
        { status: 403 }
      )
    }

    // ========================================
    // NEW: Multi-Sport Program Generation
    // ========================================
    // If `sport` is provided, use the new sport router
    if (body.sport && Object.values(SportType).includes(body.sport as SportType)) {
      logDebug(`[API] Using sport router for sport: ${body.sport}`)

      const clients = await prisma.client.findMany({
        where: { id: { in: clientIds } },
        include: {
          sportProfile: {
            select: {
              hockeySettings: true,
              footballSettings: true,
              basketballSettings: true,
              handballSettings: true,
              floorballSettings: true,
              volleyballSettings: true,
              tennisSettings: true,
              padelSettings: true,
            },
          },
        },
      })

      if (clients.length !== clientIds.length) {
        return NextResponse.json(
          { success: false, error: t(locale, 'Client not found', 'Klient hittades inte') },
          { status: 404 }
        )
      }

      const clientsById = new Map(clients.map((client) => [client.id, client]))
      const createdPrograms = []

      for (const clientId of clientIds) {
        const client = clientsById.get(clientId)
        if (!client) continue

        const testIdsByClient = body.testIdsByClient && typeof body.testIdsByClient === 'object'
          ? body.testIdsByClient as Record<string, string>
          : {}
        const testId = testIdsByClient[clientId] || (clientIds.length === 1 ? body.testId : undefined)

        let test = null
        if (typeof testId === 'string' && testId.trim() !== '') {
          test = await prisma.test.findUnique({
            where: { id: testId },
            include: {
              testStages: { orderBy: { sequence: 'asc' } },
            },
          })

          if (test && test.clientId !== clientId) {
            return NextResponse.json(
              { success: false, error: t(locale, 'Unauthorized access to test', 'Obehörig åtkomst till test') },
              { status: 403 }
            )
          }

          if (test && testQualityReviewBlocksProgram(test)) {
            return NextResponse.json(
              { success: false, error: testQualityReviewError(locale), code: 'TEST_REVIEW_REQUIRED' },
              { status: 400 }
            )
          }
        }

        const hockeyTest = body.sport === 'TEAM_ICE_HOCKEY' && (body.dataSource === 'TEST' || body.hockeyTestId || body.hockeyTestIdsByClient)
          ? await resolveHockeyTestForClient(clientId, body)
          : null

        // Build sport program params
        const sportParams: SportProgramParams = {
          clientId,
          coachId: user.id,
          sport: body.sport as SportType,
          goal: body.goal || body.goalType || 'custom',
          dataSource: (body.dataSource || 'MANUAL') as DataSourceType,
          durationWeeks: body.durationWeeks || 12,
          sessionsPerWeek: body.sessionsPerWeek || body.trainingDaysPerWeek || 4,
          notes: body.notes,
          targetRaceDate: body.targetRaceDate ? new Date(body.targetRaceDate) : undefined,
          locale,
          testId,

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
          hockeySettings: body.hockeySettings ?? client.sportProfile?.hockeySettings ?? null,
          hockeyTestId: hockeyTest?.id,
          hockeyTestDate: hockeyTest?.testDate,
          hockeyTestMetrics: hockeyTest ? metricValuesForTest(hockeyTest) : undefined,
          footballSettings: body.footballSettings ?? client.sportProfile?.footballSettings ?? null,
          basketballSettings: body.basketballSettings ?? client.sportProfile?.basketballSettings ?? null,
          handballSettings: body.handballSettings ?? client.sportProfile?.handballSettings ?? null,
          floorballSettings: body.floorballSettings ?? client.sportProfile?.floorballSettings ?? null,
          volleyballSettings: body.volleyballSettings ?? client.sportProfile?.volleyballSettings ?? null,
          tennisSettings: body.tennisSettings ?? client.sportProfile?.tennisSettings ?? null,
          padelSettings: body.padelSettings ?? client.sportProfile?.padelSettings ?? null,

          // Calendar constraints
          calendarConstraints: body.calendarConstraints,
        }

        const programData = await generateSportProgram(
          sportParams,
          client as unknown as AppClient,
          test as unknown as AppTest | undefined
        )

        const program = await saveGeneratedProgram(programData, Boolean(programData.testId || hockeyTest?.id))
        createdPrograms.push(program)
      }

      const firstProgram = createdPrograms[0]

      return NextResponse.json(
        {
          success: true,
          data: createdPrograms.length === 1
            ? firstProgram
            : {
                id: firstProgram?.id,
                count: createdPrograms.length,
                programs: createdPrograms.map((program) => ({
                  id: program.id,
                  name: program.name,
                  clientId: program.clientId,
                })),
              },
          message: createdPrograms.length === 1
            ? t(locale, 'Training program created', 'Träningsprogram skapat')
            : t(locale, 'Training programs created', 'Träningsprogram skapade'),
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
      locale,
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
            error: t(locale, 'Validation error', 'Valideringsfel'),
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
          error: t(locale, 'Client not found', 'Klient hittades inte'),
        },
        { status: 404 }
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
            error: t(locale, 'Test not found', 'Test hittades inte'),
          },
          { status: 404 }
        )
      }

      // Verify test ownership
      if (test.userId !== user.id) {
        return NextResponse.json(
          {
            success: false,
            error: t(locale, 'Unauthorized access', 'Obehörig åtkomst'),
          },
          { status: 403 }
        )
      }

      if (testQualityReviewBlocksProgram(test)) {
        return NextResponse.json(
          {
            success: false,
            error: testQualityReviewError(locale),
            code: 'TEST_REVIEW_REQUIRED',
          },
          { status: 400 }
        )
      }

      // Verify test has training zones (only for non-custom programs)
      if (!isCustomProgram && (!test.trainingZones || !Array.isArray(test.trainingZones) || test.trainingZones.length === 0)) {
        return NextResponse.json(
          {
            success: false,
            error: t(
              locale,
              'The test is missing training zones. Please calculate zones first.',
              'Testet saknar träningszoner. Vänligen beräkna zoner först.'
            ),
          },
          { status: 400 }
        )
      }
    } else if (!isCustomProgram) {
      // Test is required for non-custom programs
      return NextResponse.json(
        {
          success: false,
          error: t(locale, 'A test is required for this program type', 'Test krävs för detta programtyp'),
        },
        { status: 400 }
      )
    }

    // Generate program
    let programData;

    // Custom programs always create empty structure (regardless of goalType)
    if (isCustomProgram) {
        // 1. Calculate Start and End Dates using UTC to avoid timezone issues
        const startDate = getProgramStartDate();
        const durationWeeks = params.durationWeeks;
        const endDate = getProgramEndDate(startDate, durationWeeks);

        // Map goal type to display name
        const goalTypeLabels: Record<string, string> = {
          'marathon': 'Marathon',
          'half-marathon': t(locale, 'Half marathon', 'Halvmaraton'),
          '10k': '10K',
          '5k': '5K',
          'fitness': 'Fitness',
          'cycling': t(locale, 'Cycling', 'Cykling'),
          'skiing': t(locale, 'Skiing', 'Skidåkning'),
          'swimming': t(locale, 'Swimming', 'Simning'),
          'triathlon': 'Triathlon',
          'hyrox': 'HYROX',
          'custom': t(locale, 'Custom', 'Anpassad'),
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
            notes: params.notes || t(locale, `Custom ${goalLabel.toLowerCase()} program`, `Anpassat ${goalLabel.toLowerCase()}-program`),
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

      const startDate = getProgramStartDate()
      const endDate = getProgramEndDate(startDate, durationWeeks)

      programData = {
        name: `${locale === 'sv' ? programDesc.titleSv : programDesc.title} - ${client.name}`,
        clientId: params.clientId,
        coachId: user.id,
        testId: params.testId || null,
        goalType: params.goalType,
        startDate,
        endDate,
        notes: params.notes || (locale === 'sv' ? programDesc.descriptionSv : programDesc.description),
        weeks: fitnessWeeks.map((week) => ({
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
        programData = await generateBaseProgram(test as unknown as AppTest, client as unknown as AppClient, params)
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
        planningMetadata: programData.planningMetadata as Prisma.InputJsonValue | undefined,
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
        message: t(locale, 'Training program created', 'Träningsprogram skapat'),
      },
      { status: 201 }
    )
  } catch (error: unknown) {
    logger.error('Error generating program', {}, error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : ''
    logError('=== PROGRAM GENERATION ERROR ===')
    logError('Error message:', errorMessage)
    logError('Error stack:', errorStack)
    logError('================================')
    return NextResponse.json(
      {
        success: false,
        error: t(locale, 'Failed to create training program', 'Misslyckades med att skapa träningsprogram'),
        debug: { message: errorMessage, stack: errorStack?.split('\n').slice(0, 5) },
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

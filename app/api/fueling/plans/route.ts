import { NextRequest, NextResponse } from 'next/server'
import { Prisma, SportType } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { canAccessClient } from '@/lib/auth-utils'
import { getCurrentUser, resolveAthleteClientId } from '@/lib/auth-utils'
import { estimateRaceFueling } from '@/lib/fueling/race-fueling'
import { buildFuelingBuildUpPlan } from '@/lib/fueling/build-up-plan'
import { buildRaceDayFuelingPlan } from '@/lib/fueling/race-day-plan'
import { logger } from '@/lib/logger'

const planSchema = z.object({
  clientId: z.string().uuid().optional(),
  testId: z.string().uuid().optional().nullable(),
  raceId: z.string().uuid().optional().nullable(),
  programId: z.string().uuid().optional().nullable(),
  name: z.string().trim().max(120).optional().nullable(),
  sport: z.nativeEnum(SportType),
  distanceKm: z.number().positive().max(1000).optional().nullable(),
  durationMinutes: z.number().positive().max(10000).optional().nullable(),
  targetSpeedKmh: z.number().positive().max(80).optional().nullable(),
  targetPowerWatts: z.number().positive().max(3000).optional().nullable(),
  targetPaceMinKm: z.number().positive().max(60).optional().nullable(),
  raceDate: z.string().datetime().optional().nullable(),
  currentGutToleranceCarbsPerHour: z.number().min(0).max(150).optional().nullable(),
  coachNotes: z.string().max(4000).optional().nullable(),
  athleteNotes: z.string().max(4000).optional().nullable(),
  status: z.enum(['DRAFT', 'APPROVED', 'ARCHIVED']).optional(),
})

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const resolvedClientId = await resolveClientId(request, user.id)
    if (!resolvedClientId) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

    const limit = Math.min(Number(request.nextUrl.searchParams.get('limit') ?? 3), 50)
    const includeArchived = request.nextUrl.searchParams.get('includeArchived') === 'true'
    const plans = await prisma.raceFuelingPlan.findMany({
      where: {
        clientId: resolvedClientId,
        ...(includeArchived ? {} : { status: { not: 'ARCHIVED' } }),
      },
      orderBy: [
        { raceDate: 'asc' },
        { createdAt: 'desc' },
      ],
      take: limit,
      select: {
        id: true,
        name: true,
        sport: true,
        distanceKm: true,
        durationMinutes: true,
        targetSpeedKmh: true,
        targetPowerWatts: true,
        targetPaceMinKm: true,
        raceDate: true,
        estimatedCarbDemandGPerHour: true,
        estimatedCarbDemandTotalG: true,
        recommendedCarbsGPerHour: true,
        recommendedCarbsTotalG: true,
        confidence: true,
        scenarios: true,
        assumptions: true,
        warnings: true,
        productPlan: true,
        status: true,
        coachNotes: true,
        athleteNotes: true,
        createdAt: true,
        updatedAt: true,
        test: { select: { id: true, testDate: true, testType: true } },
        race: { select: { id: true, name: true, date: true, distance: true, targetTime: true } },
        workoutPrescriptions: {
          orderBy: {
            workout: {
              day: {
                date: 'asc',
              },
            },
          },
          take: 24,
          select: {
            workout: {
              select: {
                logs: {
                  orderBy: { completedAt: 'desc' },
                  take: 1,
                  select: {
                    fuelingLog: {
                      select: {
                        actualCarbsGPerHour: true,
                        stomachRating: true,
                        energyRating: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      plans: plans.map((plan) => {
        const { workoutPrescriptions, ...planSummary } = plan
        return {
          ...planSummary,
          raceDayPlan: buildRaceDayFuelingPlan(plan.recommendedCarbsGPerHour, plan.durationMinutes),
          fuelingProgress: buildFuelingProgressSummary({
            raceDate: plan.raceDate,
            recommendedCarbsGPerHour: plan.recommendedCarbsGPerHour,
            workoutPrescriptions,
          }),
        }
      }),
    })
  } catch (error) {
    logger.error('Error fetching fueling plans', {}, error as Error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = planSchema.parse(await request.json())
    const clientId = body.clientId ?? (await resolveAthleteClientId())?.clientId
    if (!clientId) return NextResponse.json({ error: 'clientId required' }, { status: 400 })

    const hasAccess = await canAccessClient(user.id, clientId)
    if (!hasAccess) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { weight: true },
    })
    if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

    const linkedTest = body.testId
      ? await prisma.test.findFirst({
          where: { id: body.testId, clientId },
          include: { testStages: true },
        })
      : null

    if (body.testId && !linkedTest) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 })
    }

    const estimate = estimateRaceFueling(
      {
        sport: body.sport,
        distanceKm: body.distanceKm,
        durationMinutes: body.durationMinutes,
        targetSpeedKmh: body.targetSpeedKmh,
        targetPowerWatts: body.targetPowerWatts,
        targetPaceMinPerKm: body.targetPaceMinKm,
      },
      linkedTest?.testStages.map((stage) => ({
        sequence: stage.sequence,
        duration: stage.duration,
        heartRate: stage.heartRate,
        lactate: stage.lactate,
        vo2: stage.vo2 ?? undefined,
        speed: stage.speed ?? undefined,
        power: stage.power ?? undefined,
        pace: stage.pace ?? undefined,
        rer: stage.rer ?? undefined,
        vco2: stage.vco2 ?? undefined,
        fatPercent: stage.fatPercent ?? undefined,
        choPercent: stage.choPercent ?? undefined,
      })) ?? [],
      {
        weightKg: client.weight,
        currentGutToleranceCarbsPerHour: body.currentGutToleranceCarbsPerHour,
      }
    )
    const recommendedScenario = estimate.scenarios.find((scenario) => scenario.key === 'RECOMMENDED')

    const plan = await prisma.raceFuelingPlan.create({
      data: {
        clientId,
        createdById: user.id,
        testId: linkedTest?.id ?? null,
        raceId: body.raceId ?? null,
        programId: body.programId ?? null,
        sport: body.sport,
        name: body.name ?? defaultPlanName(body.sport, body.distanceKm),
        distanceKm: body.distanceKm ?? null,
        durationMinutes: estimate.estimatedDurationMinutes ?? body.durationMinutes ?? null,
        targetSpeedKmh: body.targetSpeedKmh ?? null,
        targetPowerWatts: body.targetPowerWatts ?? null,
        targetPaceMinKm: body.targetPaceMinKm ?? null,
        raceDate: body.raceDate ? new Date(body.raceDate) : null,
        estimatedCarbDemandGPerHour: estimate.carbohydrateDemandPerHour,
        estimatedCarbDemandTotalG: estimate.carbohydrateDemandTotal,
        recommendedCarbsGPerHour: estimate.recommendedCarbsPerHour,
        recommendedCarbsTotalG: recommendedScenario?.totalCarbs ?? null,
        confidence: estimate.confidence,
        scenarios: estimate.scenarios as unknown as Prisma.InputJsonValue,
        assumptions: estimate.assumptionsSv as unknown as Prisma.InputJsonValue,
        warnings: estimate.warningsSv as unknown as Prisma.InputJsonValue,
        status: body.status ?? 'DRAFT',
        coachNotes: body.coachNotes ?? null,
        athleteNotes: body.athleteNotes ?? null,
        approvedAt: body.status === 'APPROVED' ? new Date() : null,
      },
    })

    return NextResponse.json({ success: true, plan }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 400 })
    }
    logger.error('Error creating fueling plan', {}, error as Error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function resolveClientId(request: NextRequest, userId: string): Promise<string | null> {
  const clientId = request.nextUrl.searchParams.get('clientId')
  if (clientId) return (await canAccessClient(userId, clientId)) ? clientId : null
  return (await resolveAthleteClientId())?.clientId ?? null
}

function defaultPlanName(sport: SportType, distanceKm?: number | null): string {
  const sportLabel = {
    RUNNING: 'Löpning',
    CYCLING: 'Cykling',
    SKIING: 'Skidor',
    SWIMMING: 'Simning',
    TRIATHLON: 'Triathlon',
    HYROX: 'HYROX',
    GENERAL_FITNESS: 'Fitness',
    FUNCTIONAL_FITNESS: 'Funktionell träning',
    STRENGTH: 'Styrka',
    TEAM_FOOTBALL: 'Fotboll',
    TEAM_ICE_HOCKEY: 'Ishockey',
    TEAM_HANDBALL: 'Handboll',
    TEAM_FLOORBALL: 'Innebandy',
    TEAM_BASKETBALL: 'Basket',
    TEAM_VOLLEYBALL: 'Volleyboll',
    TENNIS: 'Tennis',
    PADEL: 'Padel',
    NUTRITION: 'Nutrition',
  } satisfies Record<SportType, string>

  return distanceKm ? `Tävlingsenergi ${sportLabel[sport]} ${distanceKm} km` : `Tävlingsenergi ${sportLabel[sport]}`
}

function buildFuelingProgressSummary({
  raceDate,
  recommendedCarbsGPerHour,
  workoutPrescriptions,
}: {
  raceDate: Date | null
  recommendedCarbsGPerHour: number | null
  workoutPrescriptions: Array<{
    workout: {
      logs: Array<{
        fuelingLog: {
          actualCarbsGPerHour: number | null
          stomachRating: number | null
          energyRating: number | null
        } | null
      }>
    }
  }>
}) {
  const loggedFueling = workoutPrescriptions
    .map((prescription) => prescription.workout.logs[0]?.fuelingLog ?? null)
    .filter((log): log is NonNullable<typeof log> => Boolean(log))
  const bestToleratedGPerHour = loggedFueling
    .filter((log) => (log.stomachRating ?? 0) >= 4 && (log.energyRating ?? 0) >= 3)
    .map((log) => log.actualCarbsGPerHour)
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
    .reduce<number | null>((best, value) => best == null ? value : Math.max(best, value), null)
  const buildUpPlan = buildFuelingBuildUpPlan({
    raceTargetGPerHour: recommendedCarbsGPerHour,
    currentGutToleranceGPerHour: bestToleratedGPerHour,
    weeksAvailable: raceDate ? weeksUntilDate(raceDate) : null,
  })

  return {
    linkedWorkoutCount: workoutPrescriptions.length,
    loggedWorkoutCount: loggedFueling.length,
    bestToleratedGPerHour,
    buildUpWeeks: buildUpPlan?.sessions.length ?? null,
    nextBuildUpTargetGPerHour: buildUpPlan?.sessions[0]?.targetCarbsGPerHour ?? null,
  }
}

function weeksUntilDate(value: Date): number | null {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(value)
  target.setHours(0, 0, 0, 0)
  const days = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  return days > 0 ? Math.ceil(days / 7) : null
}

import { NextRequest, NextResponse } from 'next/server'
import { Prisma, SportType } from '@prisma/client'
import { ZodError } from 'zod'
import { prisma } from '@/lib/prisma'
import { canAccessClient } from '@/lib/auth-utils'
import { getCurrentUser, resolveAthleteClientId } from '@/lib/auth-utils'
import { estimateRaceFueling } from '@/lib/fueling/race-fueling'
import { buildFuelingProgressSummary } from '@/lib/fueling/progress-summary'
import { buildRaceDayFuelingPlan } from '@/lib/fueling/race-day-plan'
import { fuelingSportLabel } from '@/lib/fueling/sport-labels'
import { sortFuelingPlansForDisplay } from '@/lib/fueling/plan-ordering'
import { fuelingPlanInputSchema } from '@/lib/fueling/plan-input'
import { logger } from '@/lib/logger'

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
      orderBy: { updatedAt: 'desc' },
      take: Math.max(limit, 100),
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
    const sortedPlans = sortFuelingPlansForDisplay(plans).slice(0, limit)

    return NextResponse.json({
      success: true,
      plans: sortedPlans.map((plan) => {
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

    const body = fuelingPlanInputSchema.parse(await request.json())
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
    if (error instanceof ZodError) {
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
  const label = fuelingSportLabel(sport)
  return distanceKm ? `Tävlingsenergi ${label} ${distanceKm} km` : `Tävlingsenergi ${label}`
}

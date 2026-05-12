import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { canAccessClient, getCurrentUser } from '@/lib/auth-utils'
import { buildRaceDayFuelingPlan } from '@/lib/fueling/race-day-plan'
import { normalizeRaceFuelingProductPlan, retargetRaceFuelingProductPlan } from '@/lib/fueling/product-plan'
import { logger } from '@/lib/logger'

const productPlanSchema = z.object({
  version: z.literal(1),
  targetCarbsG: z.number().nonnegative().max(10000).nullable(),
  totalCarbsG: z.number().nonnegative().max(10000),
  differenceG: z.number().min(-10000).max(10000).nullable(),
  marginLabel: z.string().trim().max(40),
  updatedAt: z.string().datetime().optional(),
  items: z.array(z.object({
    label: z.string().trim().min(1).max(80),
    count: z.number().nonnegative().max(500),
    carbsPerItemG: z.number().nonnegative().max(1000),
    totalCarbsG: z.number().nonnegative().max(10000),
  })).max(12),
})

const updatePlanSchema = z.object({
  name: z.string().trim().max(120).optional().nullable(),
  recommendedCarbsGPerHour: z.number().min(20).max(150).optional().nullable(),
  distanceKm: z.number().positive().max(1000).optional().nullable(),
  durationMinutes: z.number().positive().max(10000).optional().nullable(),
  raceDate: z.string().datetime().optional().nullable(),
  coachNotes: z.string().max(4000).optional().nullable(),
  athleteNotes: z.string().max(4000).optional().nullable(),
  productPlan: productPlanSchema.optional().nullable(),
  status: z.enum(['DRAFT', 'APPROVED', 'ARCHIVED']).optional(),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const plan = await prisma.raceFuelingPlan.findUnique({
      where: { id },
      select: {
        id: true,
        clientId: true,
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
        approvedAt: true,
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
            id: true,
            targetCarbsGPerHour: true,
            targetCarbsTotalG: true,
            hydrationMl: true,
            sodiumMg: true,
            instructionsSv: true,
            updatedAt: true,
            workout: {
              select: {
                id: true,
                name: true,
                duration: true,
                distance: true,
                status: true,
                day: { select: { date: true } },
                logs: {
                  orderBy: { completedAt: 'desc' },
                  take: 1,
                  select: {
                    completedAt: true,
                    fuelingLog: {
                      select: {
                        actualCarbsGPerHour: true,
                        productsUsed: true,
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

    if (!plan) return NextResponse.json({ error: 'Plan not found' }, { status: 404 })

    const hasAccess = await canAccessClient(user.id, plan.clientId)
    if (!hasAccess) return NextResponse.json({ error: 'Plan not found' }, { status: 404 })

    return NextResponse.json({
      success: true,
      plan: {
        ...plan,
        workoutPrescriptions: [...plan.workoutPrescriptions].sort((a, b) => {
          const dateA = a.workout.day.date?.getTime() ?? Number.MAX_SAFE_INTEGER
          const dateB = b.workout.day.date?.getTime() ?? Number.MAX_SAFE_INTEGER
          return dateA - dateB
        }),
        raceDayPlan: buildRaceDayFuelingPlan(plan.recommendedCarbsGPerHour, plan.durationMinutes),
      },
    })
  } catch (error) {
    logger.error('Error fetching fueling plan', {}, error as Error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const existing = await prisma.raceFuelingPlan.findUnique({
      where: { id },
      select: {
        id: true,
        clientId: true,
        durationMinutes: true,
        estimatedCarbDemandGPerHour: true,
        recommendedCarbsGPerHour: true,
        productPlan: true,
      },
    })
    if (!existing) return NextResponse.json({ error: 'Plan not found' }, { status: 404 })

    const hasAccess = await canAccessClient(user.id, existing.clientId)
    if (!hasAccess) return NextResponse.json({ error: 'Plan not found' }, { status: 404 })

    const body = updatePlanSchema.parse(await request.json())
    const nextCarbsPerHour = body.recommendedCarbsGPerHour === undefined
      ? existing.recommendedCarbsGPerHour
      : body.recommendedCarbsGPerHour
    const nextDurationMinutes = body.durationMinutes === undefined
      ? existing.durationMinutes
      : body.durationMinutes
    const nextDemandTotal = existing.estimatedCarbDemandGPerHour != null && nextDurationMinutes != null
      ? Math.round(existing.estimatedCarbDemandGPerHour * (nextDurationMinutes / 60))
      : null
    const nextTotal = nextCarbsPerHour != null && nextDurationMinutes != null
      ? Math.round(nextCarbsPerHour * (nextDurationMinutes / 60))
      : null
    const existingProductPlan = normalizeRaceFuelingProductPlan(existing.productPlan)
    const shouldRetargetProductPlan =
      body.productPlan === undefined &&
      existingProductPlan &&
      (body.recommendedCarbsGPerHour !== undefined || body.durationMinutes !== undefined)
    const retargetedProductPlan = shouldRetargetProductPlan
      ? retargetRaceFuelingProductPlan(existingProductPlan, nextTotal)
      : null

    const plan = await prisma.raceFuelingPlan.update({
      where: { id },
      data: {
        name: body.name === undefined ? undefined : body.name,
        recommendedCarbsGPerHour: body.recommendedCarbsGPerHour === undefined ? undefined : body.recommendedCarbsGPerHour,
        estimatedCarbDemandTotalG: body.durationMinutes !== undefined ? nextDemandTotal : undefined,
        recommendedCarbsTotalG: body.recommendedCarbsGPerHour !== undefined || body.durationMinutes !== undefined ? nextTotal : undefined,
        distanceKm: body.distanceKm === undefined ? undefined : body.distanceKm,
        durationMinutes: body.durationMinutes === undefined ? undefined : body.durationMinutes,
        raceDate: body.raceDate === undefined ? undefined : body.raceDate === null ? null : new Date(body.raceDate),
        coachNotes: body.coachNotes === undefined ? undefined : body.coachNotes,
        athleteNotes: body.athleteNotes === undefined ? undefined : body.athleteNotes,
        productPlan: body.productPlan === undefined
          ? retargetedProductPlan
            ? retargetedProductPlan as unknown as Prisma.InputJsonValue
            : undefined
          : body.productPlan === null
            ? Prisma.JsonNull
            : body.productPlan as Prisma.InputJsonValue,
        status: body.status,
        approvedAt: body.status === 'APPROVED' ? new Date() : body.status === 'DRAFT' ? null : undefined,
      },
    })

    return NextResponse.json({
      success: true,
      plan: {
        ...plan,
        raceDayPlan: buildRaceDayFuelingPlan(plan.recommendedCarbsGPerHour, plan.durationMinutes),
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 400 })
    }
    logger.error('Error updating fueling plan', {}, error as Error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

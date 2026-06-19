import { NextRequest, NextResponse } from 'next/server'
import { subDays } from 'date-fns'

import { verifyCronAuth } from '@/lib/api/cron-auth'
import { logger } from '@/lib/logger'
import { prisma } from '@/lib/prisma'
import { recalculateWorkoutEvaluationsForClient } from '@/lib/workout-evaluation'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

function addClientIds(target: Set<string>, rows: Array<{ clientId?: string | null; athleteId?: string | null }>) {
  for (const row of rows) {
    const id = row.clientId ?? row.athleteId
    if (id) target.add(id)
  }
}

export async function GET(request: NextRequest) {
  try {
    const authError = verifyCronAuth(request)
    if (authError) return authError

    const days = Math.min(Math.max(Number(request.nextUrl.searchParams.get('days') ?? 7), 1), 30)
    const since = subDays(new Date(), days)
    const clientIds = new Set<string>()

    const [
      garmin,
      cardio,
      hybrid,
      quickErg,
      phoneRuns,
      concept2,
      captures,
    ] = await Promise.all([
      prisma.garminActivity.findMany({
        where: { startDate: { gte: since } },
        distinct: ['clientId'],
        select: { clientId: true },
        take: 250,
      }),
      prisma.cardioSessionLog.findMany({
        where: { startedAt: { gte: since } },
        distinct: ['athleteId'],
        select: { athleteId: true },
        take: 250,
      }),
      prisma.hybridWorkoutLog.findMany({
        where: { startedAt: { gte: since } },
        distinct: ['athleteId'],
        select: { athleteId: true },
        take: 250,
      }),
      prisma.quickErgSession.findMany({
        where: { startedAt: { gte: since } },
        distinct: ['clientId'],
        select: { clientId: true },
        take: 250,
      }),
      prisma.phoneRunSession.findMany({
        where: { startedAt: { gte: since } },
        distinct: ['clientId'],
        select: { clientId: true },
        take: 250,
      }),
      prisma.concept2Result.findMany({
        where: { date: { gte: since } },
        distinct: ['clientId'],
        select: { clientId: true },
        take: 250,
      }),
      prisma.workoutSensorCapture.findMany({
        where: { startedAt: { gte: since } },
        distinct: ['clientId'],
        select: { clientId: true },
        take: 250,
      }),
    ])

    addClientIds(clientIds, garmin)
    addClientIds(clientIds, cardio)
    addClientIds(clientIds, hybrid)
    addClientIds(clientIds, quickErg)
    addClientIds(clientIds, phoneRuns)
    addClientIds(clientIds, concept2)
    addClientIds(clientIds, captures)

    let rebuilt = 0
    let deleted = 0
    const errors: Array<{ clientId: string; error: string }> = []

    for (const clientId of Array.from(clientIds).slice(0, 150)) {
      try {
        const result = await recalculateWorkoutEvaluationsForClient({
          clientId,
          startDate: since,
          endDate: new Date(),
          deleteMissing: false,
        })
        rebuilt += result.rebuilt
        deleted += result.deleted
      } catch (error) {
        errors.push({ clientId, error: error instanceof Error ? error.message : 'Unknown error' })
      }
    }

    logger.info('Workout evaluation catch-up completed', {
      clients: clientIds.size,
      rebuilt,
      deleted,
      errors: errors.length,
    })

    return NextResponse.json({
      success: true,
      data: {
        clients: clientIds.size,
        rebuilt,
        deleted,
        errors,
      },
    })
  } catch (error) {
    logger.error('Workout evaluation catch-up failed', {}, error)
    return NextResponse.json(
      { success: false, error: 'Failed to recalculate workout evaluations' },
      { status: 500 },
    )
  }
}

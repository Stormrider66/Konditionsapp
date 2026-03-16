/**
 * Coach Alerts Cron Job
 *
 * POST /api/cron/coach-alerts
 *
 * Scans athlete clients for issues that require coach attention:
 * - READINESS_DROP: 3+ consecutive days with readiness < 5.5
 * - MISSED_CHECKINS: No DailyCheckIn for 3+ days
 * - MISSED_WORKOUTS: Past due assignments not completed
 * - PAIN_MENTION: Recent injury mentions in AI conversations
 * - HIGH_ACWR: Training load ratio > 1.5
 *
 * Processed in bounded, paged batches to avoid sweeping the full
 * athlete population serially in a single request.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { logger } from '@/lib/logger'

export const maxDuration = 300

const DEFAULT_BATCH_LIMIT = 120
const DEFAULT_PAGE_SIZE = 200
const DEFAULT_CONCURRENCY = 6
const DEFAULT_EXECUTION_BUDGET_MS = 4 * 60 * 1000

type AlertType = 'READINESS_DROP' | 'MISSED_CHECKINS' | 'MISSED_WORKOUTS' | 'PAIN_MENTION' | 'HIGH_ACWR'
type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

interface AlertData {
  coachId: string
  clientId: string
  alertType: AlertType
  severity: Severity
  title: string
  message: string
  contextData?: Record<string, unknown>
  sourceId?: string
  expiresAt?: Date
}

type AlertCandidate = {
  id: string
  name: string
  userId: string
}

type ProcessAlertCandidateResult =
  | { status: 'processed'; alertsCreated: number; byType: Record<AlertType, number> }
  | { status: 'error' }

function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  const cronHeader = request.headers.get('x-cron-secret')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    console.warn('CRON_SECRET not configured')
    return process.env.NODE_ENV === 'development'
  }

  return authHeader === `Bearer ${cronSecret}` || cronHeader === cronSecret
}

export async function POST(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const batchLimit = parseBoundedInt(
    request.nextUrl.searchParams.get('limit'),
    DEFAULT_BATCH_LIMIT,
    1,
    500
  )
  const pageSize = parseBoundedInt(
    request.nextUrl.searchParams.get('pageSize'),
    DEFAULT_PAGE_SIZE,
    25,
    500
  )
  const concurrency = parseBoundedInt(
    request.nextUrl.searchParams.get('concurrency'),
    DEFAULT_CONCURRENCY,
    1,
    20
  )
  const executionBudgetMs = parseBoundedInt(
    request.nextUrl.searchParams.get('budgetMs'),
    DEFAULT_EXECUTION_BUDGET_MS,
    30_000,
    DEFAULT_EXECUTION_BUDGET_MS
  )

  const startTime = Date.now()
  const results = {
    scanned: 0,
    processed: 0,
    alertsCreated: 0,
    errors: 0,
    byType: {
      READINESS_DROP: 0,
      MISSED_CHECKINS: 0,
      MISSED_WORKOUTS: 0,
      PAIN_MENTION: 0,
      HIGH_ACWR: 0,
    } satisfies Record<AlertType, number>,
    exhausted: false,
    timedOut: false,
  }
  let hasMore = false

  try {
    let cursor: string | null = null

    logger.info('Coach alerts cron started', {
      batchLimit,
      pageSize,
      concurrency,
      executionBudgetMs,
    })

    while (results.processed < batchLimit) {
      if (Date.now() - startTime >= executionBudgetMs) {
        results.timedOut = true
        break
      }

      const athletes: AlertCandidate[] = await prisma.client.findMany({
        where: {
          athleteAccount: { isNot: null },
        },
        ...(cursor
          ? {
              cursor: { id: cursor },
              skip: 1,
            }
          : {}),
        take: pageSize,
        orderBy: { id: 'asc' },
        select: {
          id: true,
          name: true,
          userId: true,
        },
      })

      if (athletes.length === 0) {
        results.exhausted = true
        break
      }

      results.scanned += athletes.length
      cursor = athletes[athletes.length - 1].id

      const remainingCapacity = batchLimit - results.processed
      if (athletes.length > remainingCapacity) {
        hasMore = true
      }
      const athletesToProcess = athletes.slice(0, remainingCapacity)

      for (let i = 0; i < athletesToProcess.length; i += concurrency) {
        if (Date.now() - startTime >= executionBudgetMs) {
          results.timedOut = true
          break
        }

        const chunk = athletesToProcess.slice(i, i + concurrency)
        const outcomes = await Promise.all(chunk.map((athlete) => processAlertCandidate(athlete)))

        for (const outcome of outcomes) {
          results.processed++

          if (outcome.status === 'error') {
            results.errors++
            continue
          }

          results.alertsCreated += outcome.alertsCreated
          for (const alertType of Object.keys(results.byType) as AlertType[]) {
            results.byType[alertType] += outcome.byType[alertType]
          }
        }

        if (results.processed >= batchLimit) {
          break
        }
      }

      if (results.timedOut) {
        break
      }

      if (athletes.length < pageSize) {
        results.exhausted = true
        break
      }

      hasMore = true
    }

    const duration = Date.now() - startTime
    logger.info('Coach alerts cron completed', { ...results, durationMs: duration })

    return NextResponse.json({
      success: true,
      ...results,
      durationMs: duration,
      hasMore: hasMore || !results.exhausted,
    })
  } catch (error) {
    logger.error('Coach alerts cron failed', {}, error)
    return NextResponse.json(
      { error: 'Cron job failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  return POST(request)
}

async function processAlertCandidate(
  athlete: AlertCandidate
): Promise<ProcessAlertCandidateResult> {
  try {
    const alerts: AlertData[] = []

    const readinessAlert = await checkReadinessDrop(athlete.userId, athlete.id, athlete.name)
    if (readinessAlert) alerts.push(readinessAlert)

    const missedCheckinAlert = await checkMissedCheckins(athlete.userId, athlete.id, athlete.name)
    if (missedCheckinAlert) alerts.push(missedCheckinAlert)

    const missedWorkoutAlerts = await checkMissedWorkouts(athlete.userId, athlete.id, athlete.name)
    alerts.push(...missedWorkoutAlerts)

    const painAlerts = await checkPainMentions(athlete.userId, athlete.id, athlete.name)
    alerts.push(...painAlerts)

    const acwrAlert = await checkHighACWR(athlete.userId, athlete.id, athlete.name)
    if (acwrAlert) alerts.push(acwrAlert)

    let alertsCreated = 0
    const byType: Record<AlertType, number> = {
      READINESS_DROP: 0,
      MISSED_CHECKINS: 0,
      MISSED_WORKOUTS: 0,
      PAIN_MENTION: 0,
      HIGH_ACWR: 0,
    }

    for (const alert of alerts) {
      const created = await createAlertIfNotExists(alert)
      if (!created) {
        continue
      }

      alertsCreated++
      byType[alert.alertType]++
    }

    return {
      status: 'processed',
      alertsCreated,
      byType,
    }
  } catch (error) {
    logger.error('Error processing athlete for alerts', { clientId: athlete.id }, error)
    return { status: 'error' }
  }
}

/**
 * Check for 3+ consecutive days with low readiness score
 */
async function checkReadinessDrop(
  coachId: string,
  clientId: string,
  clientName: string
): Promise<AlertData | null> {
  const threeDaysAgo = new Date()
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)

  const recentCheckIns = await prisma.dailyCheckIn.findMany({
    where: {
      clientId,
      date: { gte: threeDaysAgo },
    },
    orderBy: { date: 'desc' },
    select: {
      date: true,
      readinessScore: true,
    },
  })

  if (recentCheckIns.length < 3) return null

  const lowReadinessThreshold = 5.5
  const consecutiveLow = recentCheckIns
    .slice(0, 3)
    .every((c) => c.readinessScore !== null && c.readinessScore < lowReadinessThreshold)

  if (!consecutiveLow) return null

  const avgScore = recentCheckIns
    .slice(0, 3)
    .reduce((sum, c) => sum + (c.readinessScore || 0), 0) / 3

  const severity: Severity = avgScore < 4 ? 'CRITICAL' : avgScore < 5 ? 'HIGH' : 'MEDIUM'

  return {
    coachId,
    clientId,
    alertType: 'READINESS_DROP',
    severity,
    title: `${clientName}: Låg readiness`,
    message: `${clientName} har haft låg readiness (snitt ${avgScore.toFixed(1)}/10) de senaste 3 dagarna. Överväg att ta kontakt.`,
    contextData: {
      avgReadiness: avgScore,
      days: 3,
      scores: recentCheckIns.slice(0, 3).map((c) => c.readinessScore),
    },
    expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
  }
}

/**
 * Check for missing daily check-ins (3+ days)
 */
async function checkMissedCheckins(
  coachId: string,
  clientId: string,
  clientName: string
): Promise<AlertData | null> {
  const totalCheckIns = await prisma.dailyCheckIn.count({
    where: { clientId },
  })

  if (totalCheckIns < 7) return null

  const threeDaysAgo = new Date()
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)

  const recentCheckIn = await prisma.dailyCheckIn.findFirst({
    where: {
      clientId,
      date: { gte: threeDaysAgo },
    },
  })

  if (recentCheckIn) return null

  const lastCheckIn = await prisma.dailyCheckIn.findFirst({
    where: { clientId },
    orderBy: { date: 'desc' },
    select: { date: true },
  })

  const daysSince = lastCheckIn
    ? Math.floor((Date.now() - lastCheckIn.date.getTime()) / (1000 * 60 * 60 * 24))
    : 999

  const severity: Severity = daysSince >= 7 ? 'HIGH' : daysSince >= 5 ? 'MEDIUM' : 'LOW'

  return {
    coachId,
    clientId,
    alertType: 'MISSED_CHECKINS',
    severity,
    title: `${clientName}: Inga check-ins`,
    message: `${clientName} har inte gjort en daily check-in på ${daysSince} dagar. Detta är ovanligt för denna atlet.`,
    contextData: {
      daysSinceLastCheckIn: daysSince,
      lastCheckInDate: lastCheckIn?.date.toISOString(),
      totalHistoricalCheckIns: totalCheckIns,
    },
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  }
}

/**
 * Check for past-due workout assignments not completed
 */
async function checkMissedWorkouts(
  coachId: string,
  clientId: string,
  clientName: string
): Promise<AlertData[]> {
  const alerts: AlertData[] = []
  const now = new Date()
  const threeDaysAgo = new Date()
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)

  const missedStrength = await prisma.strengthSessionAssignment.findMany({
    where: {
      athleteId: clientId,
      status: 'PENDING',
      assignedDate: {
        gte: threeDaysAgo,
        lt: now,
      },
    },
    include: {
      session: {
        select: { name: true },
      },
    },
    take: 5,
  })

  const missedCardio = await prisma.cardioSessionAssignment.findMany({
    where: {
      athleteId: clientId,
      status: 'PENDING',
      assignedDate: {
        gte: threeDaysAgo,
        lt: now,
      },
    },
    include: {
      session: {
        select: { name: true },
      },
    },
    take: 5,
  })

  const totalMissed = missedStrength.length + missedCardio.length

  if (totalMissed === 0) return alerts

  const workoutNames = [
    ...missedStrength.map((w) => w.session.name),
    ...missedCardio.map((w) => w.session.name),
  ].slice(0, 3)

  const severity: Severity = totalMissed >= 4 ? 'HIGH' : totalMissed >= 2 ? 'MEDIUM' : 'LOW'

  alerts.push({
    coachId,
    clientId,
    alertType: 'MISSED_WORKOUTS',
    severity,
    title: `${clientName}: Missade pass`,
    message: `${clientName} har ${totalMissed} planerade pass som inte genomförts: ${workoutNames.join(', ')}${totalMissed > 3 ? '...' : ''}.`,
    contextData: {
      missedCount: totalMissed,
      workoutNames,
      strengthCount: missedStrength.length,
      cardioCount: missedCardio.length,
    },
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  })

  return alerts
}

/**
 * Check for pain/injury mentions in AI conversations
 */
async function checkPainMentions(
  coachId: string,
  clientId: string,
  clientName: string
): Promise<AlertData[]> {
  const alerts: AlertData[] = []
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const painMentions = await prisma.conversationMemory.findMany({
    where: {
      clientId,
      memoryType: 'INJURY_MENTION',
      extractedAt: { gte: sevenDaysAgo },
    },
    orderBy: { extractedAt: 'desc' },
    take: 5,
  })

  for (const mention of painMentions) {
    const existingAlert = await prisma.coachAlert.findFirst({
      where: {
        coachId,
        clientId,
        alertType: 'PAIN_MENTION',
        sourceId: mention.id,
        status: { in: ['ACTIVE', 'ACTIONED'] },
      },
    })

    if (existingAlert) continue

    const severity: Severity = mention.importance >= 4 ? 'HIGH' : 'MEDIUM'

    alerts.push({
      coachId,
      clientId,
      alertType: 'PAIN_MENTION',
      severity,
      title: `${clientName}: Smärta/obehag`,
      message: `${clientName} nämnde i AI-chatten: "${mention.content}"`,
      contextData: {
        memoryContent: mention.content,
        context: mention.context,
        importance: mention.importance,
        extractedAt: mention.extractedAt.toISOString(),
      },
      sourceId: mention.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    })
  }

  return alerts
}

/**
 * Check for high ACWR (training load ratio)
 */
async function checkHighACWR(
  coachId: string,
  clientId: string,
  clientName: string
): Promise<AlertData | null> {
  const recentLoad = await prisma.trainingLoad.findFirst({
    where: {
      clientId,
      acwr: { not: null },
    },
    orderBy: { date: 'desc' },
    select: {
      date: true,
      acwr: true,
      injuryRisk: true,
    },
  })

  if (!recentLoad || recentLoad.acwr === null) return null

  const acwr = recentLoad.acwr
  if (acwr <= 1.5) return null

  const severity: Severity =
    acwr >= 2.0 ? 'CRITICAL' : acwr >= 1.8 ? 'HIGH' : 'MEDIUM'

  const riskLevel = recentLoad.injuryRisk || 'UNKNOWN'

  return {
    coachId,
    clientId,
    alertType: 'HIGH_ACWR',
    severity,
    title: `${clientName}: Hög ACWR`,
    message: `${clientName} har en ACWR på ${acwr.toFixed(2)} (${riskLevel}). Överväg att reducera träningsbelastningen.`,
    contextData: {
      acwr,
      injuryRisk: riskLevel,
      date: recentLoad.date.toISOString(),
    },
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  }
}

/**
 * Create alert if one doesn't already exist for the same type/client today
 */
async function createAlertIfNotExists(alert: AlertData): Promise<boolean> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const existing = await prisma.coachAlert.findFirst({
    where: {
      coachId: alert.coachId,
      clientId: alert.clientId,
      alertType: alert.alertType,
      status: 'ACTIVE',
      createdAt: { gte: today },
      ...(alert.sourceId ? { sourceId: alert.sourceId } : {}),
    },
  })

  if (existing) return false

  await prisma.coachAlert.create({
    data: {
      coachId: alert.coachId,
      clientId: alert.clientId,
      alertType: alert.alertType,
      severity: alert.severity,
      title: alert.title,
      message: alert.message,
      contextData: alert.contextData as Prisma.InputJsonValue,
      sourceId: alert.sourceId,
      expiresAt: alert.expiresAt,
    },
  })

  return true
}

function parseBoundedInt(
  value: string | null,
  fallback: number,
  min: number,
  max: number
) {
  const parsed = value ? parseInt(value, 10) : fallback
  if (!Number.isFinite(parsed)) {
    return fallback
  }
  return Math.max(min, Math.min(parsed, max))
}

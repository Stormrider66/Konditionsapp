/**
 * Coach Alerts Cron Job
 *
 * POST /api/cron/coach-alerts
 *
 * Scans all athletes for issues that require coach attention:
 * - READINESS_DROP: 3+ consecutive days with readiness < 5.5
 * - MISSED_CHECKINS: No DailyCheckIn for 3+ days
 * - MISSED_WORKOUTS: Past due assignments not completed
 * - PAIN_MENTION: Recent injury mentions in AI conversations
 * - HIGH_ACWR: Training load ratio > 1.5
 *
 * Should be called every 30-60 minutes via external cron service.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

// Allow longer execution time for batch processing
export const maxDuration = 300 // 5 minutes

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

// Verify cron secret
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

  const startTime = Date.now()
  const results = {
    processed: 0,
    alertsCreated: 0,
    errors: 0,
    byType: {
      READINESS_DROP: 0,
      MISSED_CHECKINS: 0,
      MISSED_WORKOUTS: 0,
      PAIN_MENTION: 0,
      HIGH_ACWR: 0,
    },
  }

  try {
    // Get all coaches with their athletes
    const coaches = await prisma.user.findMany({
      where: {
        role: 'COACH',
      },
      select: {
        id: true,
        clients: {
          where: {
            athleteAccount: { isNot: null }, // Only athletes with accounts
          },
          select: {
            id: true,
            name: true,
            userId: true,
          },
        },
      },
    })

    for (const coach of coaches) {
      for (const client of coach.clients) {
        results.processed++

        try {
          const alerts: AlertData[] = []

          // Check for readiness drops
          const readinessAlert = await checkReadinessDrop(coach.id, client.id, client.name)
          if (readinessAlert) alerts.push(readinessAlert)

          // Check for missed check-ins
          const missedCheckinAlert = await checkMissedCheckins(coach.id, client.id, client.name)
          if (missedCheckinAlert) alerts.push(missedCheckinAlert)

          // Check for missed workouts
          const missedWorkoutAlerts = await checkMissedWorkouts(coach.id, client.id, client.name)
          alerts.push(...missedWorkoutAlerts)

          // Check for pain mentions in conversations
          const painAlerts = await checkPainMentions(coach.id, client.id, client.name)
          alerts.push(...painAlerts)

          // Check for high ACWR
          const acwrAlert = await checkHighACWR(coach.id, client.id, client.name)
          if (acwrAlert) alerts.push(acwrAlert)

          // Create alerts (deduplicated)
          for (const alert of alerts) {
            const created = await createAlertIfNotExists(alert)
            if (created) {
              results.alertsCreated++
              results.byType[alert.alertType]++
            }
          }
        } catch (error) {
          results.errors++
          logger.error('Error processing athlete for alerts', { clientId: client.id }, error)
        }
      }
    }

    const duration = Date.now() - startTime
    logger.info('Coach alerts cron completed', { ...results, durationMs: duration })

    return NextResponse.json({
      success: true,
      ...results,
      durationMs: duration,
    })
  } catch (error) {
    logger.error('Coach alerts cron failed', {}, error)
    return NextResponse.json(
      { error: 'Cron job failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
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

  // Check if all 3 most recent have low readiness
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
    expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours
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
  // First check if athlete has a history of check-ins
  const totalCheckIns = await prisma.dailyCheckIn.count({
    where: { clientId },
  })

  // Only alert if athlete has established a check-in habit (>7 check-ins)
  if (totalCheckIns < 7) return null

  const threeDaysAgo = new Date()
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)

  const recentCheckIn = await prisma.dailyCheckIn.findFirst({
    where: {
      clientId,
      date: { gte: threeDaysAgo },
    },
  })

  if (recentCheckIn) return null // Has recent check-in

  // Find last check-in date
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
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
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

  // Check strength session assignments
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

  // Check cardio session assignments
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
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
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

  // Find injury mentions from conversation memory
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
    // Check if we already created an alert for this memory
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
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
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
  // Get most recent training load with ACWR
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

  // Only alert if ACWR is in danger zone (>1.5)
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
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
  }
}

/**
 * Create alert if one doesn't already exist for the same type/client today
 */
async function createAlertIfNotExists(alert: AlertData): Promise<boolean> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Check for existing active alert of same type for same client today
  const existing = await prisma.coachAlert.findFirst({
    where: {
      coachId: alert.coachId,
      clientId: alert.clientId,
      alertType: alert.alertType,
      status: 'ACTIVE',
      createdAt: { gte: today },
      // For PAIN_MENTION, also check sourceId
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
      contextData: alert.contextData,
      sourceId: alert.sourceId,
      expiresAt: alert.expiresAt,
    },
  })

  return true
}

// Also support GET for Vercel Cron
export async function GET(request: NextRequest) {
  return POST(request)
}

/**
 * Injury Detection from Daily Check-In API
 *
 * POST /api/injury/process-checkin
 *
 * Automatically processes daily check-in data and triggers injury management
 * cascade if pain/readiness thresholds are exceeded.
 *
 * Trigger Criteria:
 * - Pain/Injury ≥5/10 (athlete-facing scale)
 * - Readiness score <5.5/10
 * - Sleep <5 hours (critical fatigue)
 * - Stress ≥8/10 (extreme stress)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import {
  processInjuryDetection,
  type InjuryDetection,
  type InjuryResponse,
} from '@/lib/training-engine/integration/injury-management'
import { logger } from '@/lib/logger'

interface CheckInData {
  clientId: string
  date: string
  injuryPain: number // 1-10 scale (inverted from form: 10 = extreme pain)
  stress: number // 1-10 scale (inverted)
  sleepHours: number
  energyLevel: number // 1-10 scale
  readinessScore?: number // Calculated by daily-metrics API
  readinessLevel?: string
  muscleSoreness: number
}

interface TriggerDetection {
  triggered: boolean
  reasons: string[]
  severity: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW'
  recommendedAction: 'REST' | 'CROSS_TRAINING_ONLY' | 'REDUCE_50' | 'MONITOR'
  injuryType?: InjuryDetection['injuryType']
}

/**
 * POST /api/injury/process-checkin
 *
 * Process daily check-in and trigger injury cascade if needed
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user from database
    const dbUser = await prisma.user.findUnique({
      where: { email: user.email },
    })

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Parse request body
    const body: CheckInData = await request.json()
    const {
      clientId,
      date,
      injuryPain,
      stress,
      sleepHours,
      energyLevel,
      readinessScore,
      readinessLevel,
      muscleSoreness,
    } = body

    // Validate required fields
    if (!clientId || !date) {
      return NextResponse.json(
        { error: 'Missing required fields: clientId, date' },
        { status: 400 }
      )
    }

    // Verify client access
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        athleteAccount: true,
      },
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Authorization check
    const isOwner = client.userId === dbUser.id
    const isAthlete = client.athleteAccount?.userId === dbUser.id

    if (!isOwner && !isAthlete) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // ==========================================
    // Step 1: Detect if injury cascade should trigger
    // ==========================================
    const triggerDetection = detectTriggers(body)

    if (!triggerDetection.triggered) {
      return NextResponse.json({
        success: true,
        triggered: false,
        message: 'No injury triggers detected. Check-in processed normally.',
        detection: triggerDetection,
      })
    }

    // ==========================================
    // Step 2: Get ACWR risk if available
    // ==========================================
    const acwrData = await getACWRRisk(clientId)

    // ==========================================
    // Step 3: Determine injury type from pain location/pattern
    // ==========================================
    // For now, we use a generic injury type since athlete hasn't specified location
    // In future, could add a "Where does it hurt?" dropdown in daily check-in
    const injuryType = determineInjuryType(triggerDetection, muscleSoreness)

    // ==========================================
    // Step 4: Create InjuryDetection object
    // ==========================================
    const injuryDetection: InjuryDetection = {
      athleteId: clientId,
      injuryType,
      painLevel: injuryPain, // Already on 1-10 scale (inverted by form)
      painTiming: determinePainTiming(injuryPain, muscleSoreness),
      acwrRisk: acwrData.risk,
      detectionSource: 'DAILY_CHECKIN',
      date: new Date(date),
    }

    // ==========================================
    // Step 5: Process injury cascade
    // ==========================================
    logger.info('Injury trigger detected', {
      athlete: client.name,
      painLevel: injuryPain,
      reasons: triggerDetection.reasons.join(', '),
      recommendedAction: triggerDetection.recommendedAction
    })

    const injuryResponse: InjuryResponse = await processInjuryDetection(
      injuryDetection,
      prisma,
      { persistRecord: true }
    )

    logger.info('Injury cascade completed', {
      workoutsModified: injuryResponse.workoutModifications.length,
      crossTrainingSubstitutions: injuryResponse.crossTrainingSubstitutions.length,
      estimatedReturnWeeks: injuryResponse.estimatedReturnWeeks,
      coachNotificationUrgency: injuryResponse.coachNotification.urgency
    })

    // ==========================================
    // Step 6: Send coach notification
    // ==========================================
    await sendCoachNotification(client.userId, injuryResponse.coachNotification)

    // ==========================================
    // Step 7: Return comprehensive response
    // ==========================================
    return NextResponse.json({
      success: true,
      triggered: true,
      detection: triggerDetection,
      injuryResponse: {
        immediateAction: injuryResponse.immediateAction,
        workoutsModified: injuryResponse.workoutModifications.length,
        crossTrainingRecommended: injuryResponse.crossTrainingSubstitutions.length > 0,
        estimatedReturnWeeks: injuryResponse.estimatedReturnWeeks,
        coachNotified: true,
        notificationUrgency: injuryResponse.coachNotification.urgency,
      },
      summary: {
        title: injuryResponse.coachNotification.title,
        message: injuryResponse.coachNotification.message,
        nextSteps: injuryResponse.coachNotification.suggestedActions,
        programAdjustment: injuryResponse.programAdjustment.reasoning,
      },
    })
  } catch (error) {
    logger.error('Error processing injury check-in', {}, error)
    return NextResponse.json(
      {
        error: 'Failed to process injury check-in',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * Detect if check-in data triggers injury cascade
 */
function detectTriggers(data: CheckInData): TriggerDetection {
  const reasons: string[] = []
  let severity: TriggerDetection['severity'] = 'LOW'
  let recommendedAction: TriggerDetection['recommendedAction'] = 'MONITOR'

  // Note: injuryPain comes inverted from form (10 = extreme pain, 1 = no pain)
  const painLevel = data.injuryPain

  // CRITICAL TRIGGERS (immediate rest)
  if (painLevel >= 8) {
    reasons.push(`Extreme pain reported (${painLevel}/10)`)
    severity = 'CRITICAL'
    recommendedAction = 'REST'
  }

  if (data.sleepHours < 5) {
    reasons.push(`Critical sleep deprivation (${data.sleepHours} hours)`)
    severity = 'CRITICAL'
    recommendedAction = 'REST'
  }

  if (data.energyLevel === 1) {
    reasons.push('Extreme fatigue (1/10 energy)')
    severity = severity === 'CRITICAL' ? 'CRITICAL' : 'HIGH'
    recommendedAction = recommendedAction === 'REST' ? 'REST' : 'CROSS_TRAINING_ONLY'
  }

  // HIGH TRIGGERS (cross-training substitution)
  if (painLevel >= 5 && painLevel < 8) {
    reasons.push(`Significant pain reported (${painLevel}/10)`)
    severity = severity === 'CRITICAL' ? 'CRITICAL' : 'HIGH'
    recommendedAction = recommendedAction === 'REST' ? 'REST' : 'CROSS_TRAINING_ONLY'
  }

  if (data.stress >= 8) {
    reasons.push(`Extreme stress (${data.stress}/10)`)
    severity = severity === 'CRITICAL' ? 'CRITICAL' : 'HIGH'
    if (recommendedAction === 'MONITOR') {
      recommendedAction = 'REDUCE_50'
    }
  }

  // MODERATE TRIGGERS (reduce volume/intensity)
  if (data.readinessScore && data.readinessScore < 5.5) {
    reasons.push(`Low readiness score (${data.readinessScore.toFixed(1)}/10)`)
    if (severity === 'LOW') severity = 'MODERATE'
    if (recommendedAction === 'MONITOR') recommendedAction = 'REDUCE_50'
  }

  if (painLevel >= 3 && painLevel < 5) {
    reasons.push(`Mild-moderate pain (${painLevel}/10)`)
    if (severity === 'LOW') severity = 'MODERATE'
    if (recommendedAction === 'MONITOR') recommendedAction = 'REDUCE_50'
  }

  if (data.sleepHours < 6 && data.sleepHours >= 5) {
    reasons.push(`Insufficient sleep (${data.sleepHours} hours)`)
    if (severity === 'LOW') severity = 'MODERATE'
    if (recommendedAction === 'MONITOR') recommendedAction = 'REDUCE_50'
  }

  const triggered = reasons.length > 0

  return {
    triggered,
    reasons,
    severity,
    recommendedAction,
  }
}

/**
 * Determine injury type from available data
 *
 * Since daily check-in doesn't specify injury location,
 * we use a conservative approach with common injury types
 */
function determineInjuryType(
  trigger: TriggerDetection,
  muscleSoreness: number
): InjuryDetection['injuryType'] {
  // If high muscle soreness + pain, likely overuse injury
  if (muscleSoreness >= 7) {
    // Most common running injuries (in order of prevalence)
    // Default to shin splints as it's most common for general leg pain
    return 'SHIN_SPLINTS'
  }

  // For other cases, use IT band syndrome (second most common)
  return 'IT_BAND_SYNDROME'

  // NOTE: In future enhancement, add injury location dropdown to daily check-in:
  // "Where does it hurt?" → Foot, Ankle, Shin, Knee, IT Band, Hip, Hamstring, Calf
  // Then map directly to specific injury types
}

/**
 * Determine pain timing from context
 */
function determinePainTiming(
  painLevel: number,
  muscleSoreness: number
): InjuryDetection['painTiming'] {
  // High constant soreness + high pain = likely constant pain
  if (painLevel >= 7 && muscleSoreness >= 7) {
    return 'CONSTANT'
  }

  // High soreness suggests post-workout pain
  if (muscleSoreness >= 5) {
    return 'AFTER'
  }

  // Default to during activity (most conservative)
  return 'DURING'
}

/**
 * Get ACWR risk from recent training load
 */
async function getACWRRisk(clientId: string): Promise<{
  risk: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' | undefined
  acwr: number | null
}> {
  try {
    // Get most recent training load record
    const recentLoad = await prisma.trainingLoad.findFirst({
      where: { clientId },
      orderBy: { date: 'desc' },
    })

    if (!recentLoad || !recentLoad.acwr) {
      return { risk: undefined, acwr: null }
    }

    const acwr = recentLoad.acwr

    // Map ACWR to risk levels
    let risk: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL'
    if (acwr >= 2.0) {
      risk = 'CRITICAL'
    } else if (acwr >= 1.5) {
      risk = 'HIGH'
    } else if (acwr >= 1.3) {
      risk = 'MODERATE'
    } else {
      risk = 'LOW'
    }

    return { risk, acwr }
  } catch (error) {
    logger.error('Error fetching ACWR', { clientId }, error)
    return { risk: undefined, acwr: null }
  }
}

/**
 * Send coach notification via Message model
 */
async function sendCoachNotification(
  coachUserId: string,
  notification: InjuryResponse['coachNotification']
) {
  try {
    await prisma.message.create({
      data: {
        senderId: coachUserId, // Using coach as sender (system messages not supported)
        receiverId: coachUserId,
        subject: notification.title,
        content: `[${notification.urgency}] ${notification.message}`,
        isRead: false,
      },
    })

    logger.info('Coach notification sent', { title: notification.title, coachUserId })

    // TODO: Add email notification via Resend
    // if (notification.urgency === 'CRITICAL' || notification.urgency === 'HIGH') {
    //   await sendEmailNotification(coachUserId, notification)
    // }
  } catch (error) {
    logger.error('Error sending coach notification', { coachUserId }, error)
    // Don't throw - notification failure shouldn't block injury processing
  }
}

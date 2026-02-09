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
import { canAccessClient } from '@/lib/auth-utils'
import {
  processInjuryDetection,
  type InjuryDetection,
  type InjuryResponse,
} from '@/lib/training-engine/integration/injury-management'
import { logger } from '@/lib/logger'
import { Resend } from 'resend'
import {
  detectPainPatterns,
  formatPatternNotification,
  type PatternDetectionResult,
} from '@/lib/injury-detection/pattern-detector'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

interface InjuryDetails {
  bodyPart?: string
  injuryType?: string
  side?: string
  isIllness?: boolean
  illnessType?: string
}

interface KeywordAnalysis {
  matches?: string[]
  suggestedBodyPart?: string
  severityLevel?: string
  summary?: string
}

interface CheckInData {
  clientId: string
  date: string
  injuryPain: number // 1-10 scale (1 = no pain, 10 = extreme pain)
  stress: number // 1-10 scale (1 = no stress, 10 = extreme stress)
  sleepHours: number
  energyLevel: number // 1-10 scale (1 = exhausted, 10 = full of energy)
  readinessScore?: number // Calculated by daily-metrics API
  readinessLevel?: string
  muscleSoreness: number // 1-10 scale (1 = no soreness, 10 = extreme soreness)
  injuryDetails?: InjuryDetails // Specific injury information from athlete
  keywordAnalysis?: KeywordAnalysis // NLP analysis from notes
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
      injuryDetails,
      keywordAnalysis,
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
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    const hasAccess = await canAccessClient(dbUser.id, clientId)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // ==========================================
    // Step 1: Detect if injury cascade should trigger
    // ==========================================
    const triggerDetection = detectTriggers(body)

    // ==========================================
    // Step 1.5: Detect recurring pain patterns
    // ==========================================
    const patternResult = await detectPainPatterns(clientId, {
      painLevel: injuryPain,
      bodyPart: injuryDetails?.bodyPart || null,
      injuryType: injuryDetails?.injuryType || null,
      isIllness: injuryDetails?.isIllness || false,
      illnessType: injuryDetails?.illnessType || null,
      keywordBodyPart: keywordAnalysis?.suggestedBodyPart || null,
    })

    // If pattern detected but no immediate trigger, escalate to coach
    if (!triggerDetection.triggered && patternResult.shouldEscalate) {
      const patternNotification = formatPatternNotification(patternResult)

      // Send pattern-based coach notification
      await sendCoachNotification(client.userId, {
        title: patternNotification.title,
        message: patternNotification.message,
        urgency: patternNotification.urgency,
        actionRequired: true,
        suggestedActions: [
          'Granska idrottarens senaste rapporter',
          'Kontakta idrottaren för uppföljning',
          'Överväg förebyggande träningsanpassningar',
        ],
        athleteName: client.name,
        injuryType: 'PATTERN_DETECTED',
        painLevel: injuryPain,
      })

      logger.info('Pattern-based escalation triggered', {
        athlete: client.name,
        patterns: patternResult.patterns.map((p) => p.type),
        reasons: patternResult.escalationReasons,
      })

      return NextResponse.json({
        success: true,
        triggered: false,
        patternEscalation: true,
        message: 'Recurring pain pattern detected. Coach notified for review.',
        detection: triggerDetection,
        patternAnalysis: {
          patternDetected: patternResult.patternDetected,
          patterns: patternResult.patterns,
          recommendation: patternResult.recommendation,
          escalationReasons: patternResult.escalationReasons,
        },
      })
    }

    if (!triggerDetection.triggered) {
      return NextResponse.json({
        success: true,
        triggered: false,
        message: 'No injury triggers detected. Check-in processed normally.',
        detection: triggerDetection,
        patternAnalysis: patternResult.patternDetected
          ? {
              patternDetected: true,
              patterns: patternResult.patterns,
              recommendation: patternResult.recommendation,
            }
          : undefined,
      })
    }

    // ==========================================
    // Step 2: Get ACWR risk if available
    // ==========================================
    const acwrData = await getACWRRisk(clientId)

    // ==========================================
    // Step 3: Handle illness vs injury
    // ==========================================
    if (injuryDetails?.isIllness) {
      // Illness requires complete rest - no training, no cross-training
      logger.info('Illness detected, recommending complete rest', {
        athlete: client.name,
        illnessType: injuryDetails.illnessType,
      })

      return NextResponse.json({
        success: true,
        triggered: true,
        detection: {
          ...triggerDetection,
          severity: 'CRITICAL',
          recommendedAction: 'REST',
          reasons: [...triggerDetection.reasons, `Illness reported: ${injuryDetails.illnessType || 'unspecified'}`],
        },
        injuryResponse: {
          immediateAction: 'COMPLETE_REST',
          workoutsModified: 0,
          crossTrainingRecommended: false, // No cross-training during illness
          estimatedReturnWeeks: 1, // Re-evaluate after rest
          coachNotified: true,
          notificationUrgency: 'HIGH',
        },
        summary: {
          title: `Sjukdom rapporterad: ${injuryDetails.illnessType || 'ospecificerad'}`,
          message: `Idrottaren har rapporterat sjukdom. Komplett vila rekommenderas tills symtomen försvinner. Ingen träning eller korskräning tillåten under sjukdomsperioden.`,
          nextSteps: [
            'Ingen träning tills symtomfri i minst 24 timmar',
            'Återgå gradvis med lätt aktivitet först',
            'Vid feber: minst 1 vecka vila efter feberfri',
            'Konsultera läkare vid allvarliga symtom',
          ],
          programAdjustment: 'All training suspended due to illness. Cross-training not recommended during illness recovery.',
        },
        isIllness: true,
      })
    }

    // ==========================================
    // Step 4: Determine injury type from pain location/pattern
    // ==========================================
    // Use provided injury type if available, otherwise infer from context
    const injuryType = determineInjuryType(triggerDetection, muscleSoreness, injuryDetails, keywordAnalysis)

    // ==========================================
    // Step 5: Create InjuryDetection object
    // ==========================================
    const injuryDetection: InjuryDetection = {
      athleteId: clientId,
      injuryType,
      painLevel: injuryPain, // 1-10 scale (1 = no pain, 10 = extreme pain)
      painTiming: determinePainTiming(injuryPain, muscleSoreness),
      acwrRisk: acwrData.risk,
      detectionSource: 'DAILY_CHECKIN',
      date: new Date(date),
    }

    // ==========================================
    // Step 6: Process injury cascade
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
      {
        persistRecord: true,
        createRestriction: true,
        createdByUserId: dbUser.id
      }
    )

    logger.info('Injury cascade completed', {
      workoutsModified: injuryResponse.workoutModifications.length,
      crossTrainingSubstitutions: injuryResponse.crossTrainingSubstitutions.length,
      estimatedReturnWeeks: injuryResponse.estimatedReturnWeeks,
      coachNotificationUrgency: injuryResponse.coachNotification.urgency
    })

    // ==========================================
    // Step 7: Send coach notification
    // ==========================================
    await sendCoachNotification(client.userId, injuryResponse.coachNotification)

    // ==========================================
    // Step 8: Return comprehensive response
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
      patternAnalysis: patternResult.patternDetected
        ? {
            patternDetected: true,
            patterns: patternResult.patterns,
            recommendation: patternResult.recommendation,
            escalationReasons: patternResult.escalationReasons,
          }
        : undefined,
    })
  } catch (error) {
    logger.error('Error processing injury check-in', {}, error)
    return NextResponse.json(
      {
        error: 'Failed to process injury check-in',
        details:
          process.env.NODE_ENV === 'production'
            ? undefined
            : (error instanceof Error ? error.message : 'Unknown error'),
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

  // Pain scale: 1 = no pain, 10 = extreme pain
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
 * Mapping from body part names to injury types
 * Valid types: PLANTAR_FASCIITIS | ACHILLES_TENDINOPATHY | IT_BAND_SYNDROME |
 *              STRESS_FRACTURE | HAMSTRING_STRAIN | SHIN_SPLINTS |
 *              PATELLOFEMORAL_SYNDROME | CALF_STRAIN | HIP_FLEXOR
 */
const BODY_PART_TO_INJURY_TYPE: Record<string, InjuryDetection['injuryType']> = {
  // Lower leg
  'shin': 'SHIN_SPLINTS',
  'calf': 'CALF_STRAIN',
  'achilles': 'ACHILLES_TENDINOPATHY',
  'ankle': 'SHIN_SPLINTS', // Closest match for ankle issues
  'foot': 'PLANTAR_FASCIITIS',

  // Knee area
  'knee': 'PATELLOFEMORAL_SYNDROME',
  'it_band': 'IT_BAND_SYNDROME',
  'itb': 'IT_BAND_SYNDROME',

  // Upper leg
  'hamstring': 'HAMSTRING_STRAIN',
  'quad': 'HAMSTRING_STRAIN', // Use hamstring as proxy for upper leg muscle strain
  'hip': 'HIP_FLEXOR',
  'groin': 'HIP_FLEXOR',

  // Default fallback
  'general': 'SHIN_SPLINTS',
  'other': 'SHIN_SPLINTS',
}

/**
 * Mapping from specific injury type strings to enum values
 */
const INJURY_TYPE_MAP: Record<string, InjuryDetection['injuryType']> = {
  'PLANTAR_FASCIITIS': 'PLANTAR_FASCIITIS',
  'ACHILLES_TENDINITIS': 'ACHILLES_TENDINOPATHY',
  'ACHILLES_TENDINOPATHY': 'ACHILLES_TENDINOPATHY',
  'SHIN_SPLINTS': 'SHIN_SPLINTS',
  'PATELLOFEMORAL': 'PATELLOFEMORAL_SYNDROME',
  'PATELLOFEMORAL_SYNDROME': 'PATELLOFEMORAL_SYNDROME',
  'IT_BAND_SYNDROME': 'IT_BAND_SYNDROME',
  'HAMSTRING_STRAIN': 'HAMSTRING_STRAIN',
  'CALF_STRAIN': 'CALF_STRAIN',
  'ANKLE_SPRAIN': 'SHIN_SPLINTS', // Map to closest available type
  'HIP_FLEXOR_STRAIN': 'HIP_FLEXOR',
  'HIP_FLEXOR': 'HIP_FLEXOR',
  'STRESS_FRACTURE': 'STRESS_FRACTURE',
}

/**
 * Determine injury type from available data
 *
 * Priority order:
 * 1. Explicit injury type from injuryDetails (highest priority)
 * 2. Body part from injuryDetails (mapped to injury type)
 * 3. Body part from keyword analysis (NLP detection)
 * 4. Inference from muscle soreness level (fallback)
 */
function determineInjuryType(
  trigger: TriggerDetection,
  muscleSoreness: number,
  injuryDetails?: InjuryDetails,
  keywordAnalysis?: KeywordAnalysis
): InjuryDetection['injuryType'] {
  // Priority 1: Use explicit injury type if provided
  if (injuryDetails?.injuryType) {
    const mappedType = INJURY_TYPE_MAP[injuryDetails.injuryType]
    if (mappedType) {
      return mappedType
    }
  }

  // Priority 2: Map body part from injury details
  if (injuryDetails?.bodyPart) {
    const normalizedBodyPart = injuryDetails.bodyPart.toLowerCase().replace(/[^a-z_]/g, '_')
    const mappedType = BODY_PART_TO_INJURY_TYPE[normalizedBodyPart]
    if (mappedType) {
      return mappedType
    }
  }

  // Priority 3: Use keyword analysis suggested body part
  if (keywordAnalysis?.suggestedBodyPart) {
    const normalizedBodyPart = keywordAnalysis.suggestedBodyPart.toLowerCase().replace(/[^a-z_]/g, '_')
    const mappedType = BODY_PART_TO_INJURY_TYPE[normalizedBodyPart]
    if (mappedType) {
      return mappedType
    }
  }

  // Priority 4: Inference from muscle soreness (original fallback logic)
  // If high muscle soreness + pain, likely overuse injury
  if (muscleSoreness >= 7) {
    // Most common running injuries (in order of prevalence)
    // Default to shin splints as it's most common for general leg pain
    return 'SHIN_SPLINTS'
  }

  // For other cases, use IT band syndrome (second most common)
  return 'IT_BAND_SYNDROME'
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

    // Send email notification for critical/high urgency
    if (resend && (notification.urgency === 'CRITICAL' || notification.urgency === 'HIGH')) {
      try {
        const coachUser = await prisma.user.findUnique({
          where: { id: coachUserId },
          select: { email: true, name: true },
        })

        if (coachUser?.email) {
          const urgencyColor = notification.urgency === 'CRITICAL' ? '#dc2626' : '#f59e0b'
          const urgencyText = notification.urgency === 'CRITICAL' ? 'KRITISKT' : 'HÖG PRIORITET'

          await resend.emails.send({
            from: 'Konditionstest <noreply@konditionstest.se>',
            to: coachUser.email,
            subject: `[${urgencyText}] ${notification.title}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background-color: ${urgencyColor}; color: white; padding: 15px; border-radius: 8px 8px 0 0;">
                  <strong>${urgencyText}</strong>
                </div>
                <div style="border: 1px solid #e5e5e5; border-top: none; padding: 20px; border-radius: 0 0 8px 8px;">
                  <h2 style="margin-top: 0; color: #1a1a1a;">${notification.title}</h2>
                  <p style="color: #444;">${notification.message}</p>
                  <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://konditionstest.se'}/coach/injuries"
                     style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px;">
                    Se skadehantering
                  </a>
                </div>
              </div>
            `,
          })
          logger.info('Injury email notification sent', { coachEmail: coachUser.email, urgency: notification.urgency })
        }
      } catch (emailError) {
        logger.error('Failed to send injury email notification', { coachUserId }, emailError)
      }
    }
  } catch (error) {
    logger.error('Error sending coach notification', { coachUserId }, error)
    // Don't throw - notification failure shouldn't block injury processing
  }
}
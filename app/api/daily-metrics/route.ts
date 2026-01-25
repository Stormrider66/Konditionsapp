/**
 * Daily Metrics API
 *
 * POST /api/daily-metrics - Save daily metrics (HRV, RHR, wellness)
 * GET /api/daily-metrics - Retrieve historical metrics
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import {
  assessHRV,
  assessRHR,
  calculateWellnessScore,
  calculateReadinessScore,
  establishHRVBaseline,
  establishRHRBaseline,
  type HRVBaseline,
  type HRVMeasurement,
  type RHRBaseline,
  type RHRMeasurement,
  type WellnessResponses,
} from '@/lib/training-engine/monitoring'
import {
  calculateSyncedStrengthFatigue,
  blendStrengthFatigue,
  type SyncedStrengthFatigue,
} from '@/lib/training-engine/monitoring/synced-strength-fatigue'
import { logger } from '@/lib/logger'

/**
 * POST /api/daily-metrics
 *
 * Save daily metrics and calculate readiness score
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
    const body = await request.json()
    const {
      clientId,
      date,
      hrvRMSSD,
      hrvQuality,
      hrvArtifactPercent,
      hrvDuration,
      hrvPosition,
      restingHR,
      sleepQuality,
      sleepHours,
      muscleSoreness,
      energyLevel,
      mood,
      stress,
      injuryPain,
      notes,
      injuryDetails,
      keywordAnalysis,
      // Rehab compliance (Phase 7 - Physio System)
      rehabExercisesDone,
      rehabPainDuring,
      rehabPainAfter,
      rehabNotes,
      requestPhysioContact,
      physioContactReason,
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

    // Authorization check: User must own the client or be the athlete
    const isOwner = client.userId === dbUser.id
    const isAthlete = client.athleteAccount?.userId === dbUser.id

    if (!isOwner && !isAthlete) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Convert date string to Date object
    const metricsDate = new Date(date)

    // Get historical data for baseline calculations
    const historicalMetrics = await prisma.dailyMetrics.findMany({
      where: {
        clientId,
        date: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        },
      },
      orderBy: { date: 'asc' },
    })

    // ==================
    // HRV Assessment
    // ==================
    let hrvAssessment = null
    let hrvStatus = 'NOT_MEASURED'
    let hrvPercent = null
    let hrvTrend = null

    if (hrvRMSSD && hrvQuality) {
      const hrvMeasurement: HRVMeasurement = {
        rmssd: hrvRMSSD,
        quality: normalizeMeasurementQuality(hrvQuality),
        artifactPercent: hrvArtifactPercent ?? 0,
        duration: hrvDuration ?? 180,
        position: normalizePosition(hrvPosition),
        timestamp: metricsDate,
      }

      // Calculate baseline from historical data
      const historicalHRVMeasurements = historicalMetrics
        .filter(m => m.hrvRMSSD !== null)
        .map(m => ({
          rmssd: m.hrvRMSSD as number,
          quality: normalizeMeasurementQuality(m.hrvQuality),
          artifactPercent: m.hrvArtifactPercent ?? 0,
          duration: m.hrvDuration ?? 180,
          position: normalizePosition(m.hrvPosition),
          timestamp: m.date,
        }))

      let hrvBaseline: HRVBaseline | null = null
      if (historicalHRVMeasurements.length >= 14) {
        try {
          hrvBaseline = establishHRVBaseline(historicalHRVMeasurements)
        } catch (error) {
          logger.warn('Failed to build HRV baseline from history', { clientId, measurementCount: historicalHRVMeasurements.length }, error)
        }
      }

      if (!hrvBaseline) {
        hrvBaseline = createFallbackHRVBaseline(hrvMeasurement)
      }

      hrvAssessment = assessHRV(hrvMeasurement, hrvBaseline)
      hrvStatus = hrvAssessment.status
      hrvPercent = hrvAssessment.percentOfBaseline
      hrvTrend = hrvAssessment.trend
    }

    // ==================
    // RHR Assessment
    // ==================
    let rhrAssessment = null
    let restingHRStatus = 'NORMAL'
    let restingHRDev = null

    if (restingHR) {
      const rhrMeasurement: RHRMeasurement = {
        heartRate: restingHR,
        quality: 'GOOD',
        duration: 60,
        position: 'SUPINE',
        timestamp: metricsDate,
      }

      // Calculate baseline from historical data
      const historicalRHRMeasurements = historicalMetrics
        .filter(m => m.restingHR !== null)
        .map(m => ({
          heartRate: m.restingHR as number,
          quality: 'GOOD' as const,
          duration: 60,
          position: 'SUPINE' as const,
          timestamp: m.date,
        }))

      let rhrBaseline: RHRBaseline | null = null
      if (historicalRHRMeasurements.length >= 7) {
        try {
          rhrBaseline = establishRHRBaseline(historicalRHRMeasurements)
        } catch (error) {
          logger.warn('Failed to build RHR baseline from history', { clientId, measurementCount: historicalRHRMeasurements.length }, error)
        }
      }

      if (!rhrBaseline) {
        rhrBaseline = createFallbackRHRBaseline(rhrMeasurement)
      }

      rhrAssessment = assessRHR(rhrMeasurement, rhrBaseline)
      restingHRStatus = rhrAssessment.status
      restingHRDev = rhrAssessment.deviationFromBaseline
    }

    // ==================
    // Wellness Scoring
    // ==================
    let wellnessScoreData = null
    let calculatedWellnessScore = null

    if (
      sleepQuality !== undefined &&
      sleepHours !== undefined &&
      muscleSoreness !== undefined &&
      energyLevel !== undefined &&
      mood !== undefined &&
      stress !== undefined &&
      injuryPain !== undefined
    ) {
      // Convert 1-10 scale to 1-5 scale for wellness function
      const scaleTo5 = (value: number) => Math.round(((value - 1) / 9) * 4 + 1)

      // Invert negative metrics before scaling
      // Form: 1 = no pain/stress (good), 10 = extreme pain/stress (bad)
      // Wellness expects: 1 = bad, 5 = good (higher = better for all metrics)
      const invertScale = (value: number) => 11 - value

      const wellnessResponses: WellnessResponses = {
        sleepQuality: scaleTo5(sleepQuality) as 1 | 2 | 3 | 4 | 5,
        sleepDuration: sleepHours,
        fatigueLevel: scaleTo5(energyLevel) as 1 | 2 | 3 | 4 | 5,
        muscleSoreness: scaleTo5(invertScale(muscleSoreness)) as 1 | 2 | 3 | 4 | 5, // Invert: 1 (no soreness) → 10 → 5 (good)
        stressLevel: scaleTo5(invertScale(stress)) as 1 | 2 | 3 | 4 | 5, // Invert: 1 (no stress) → 10 → 5 (good)
        mood: scaleTo5(mood) as 1 | 2 | 3 | 4 | 5,
        motivationToTrain: scaleTo5(invertScale(injuryPain)) as 1 | 2 | 3 | 4 | 5, // Invert: 1 (no pain) → 10 → 5 (high motivation)
      }

      // Avoid logging raw wellness inputs (health-related data) even in production debug.
      if (process.env.NODE_ENV !== 'production') {
        logger.debug('Wellness calculation completed', { clientId })
      }

      wellnessScoreData = calculateWellnessScore(wellnessResponses)
      calculatedWellnessScore = wellnessScoreData.totalScore

      logger.debug('Wellness score result', {
        clientId,
        totalScore: wellnessScoreData.totalScore,
        rawScore: wellnessScoreData.rawScore,
        status: wellnessScoreData.status
      })
    }

    // ==================
    // Synced Strength Fatigue (Gap 3 fix)
    // ==================
    let syncedStrengthFatigue: SyncedStrengthFatigue | null = null
    try {
      syncedStrengthFatigue = await calculateSyncedStrengthFatigue(clientId, prisma)
      if (process.env.NODE_ENV !== 'production') {
        logger.debug('Synced strength fatigue calculated', {
          clientId,
          score: syncedStrengthFatigue.score,
          volume: syncedStrengthFatigue.strengthVolume7d,
          sessions: syncedStrengthFatigue.strengthSessions7d,
        })
      }
    } catch (error) {
      logger.warn('Error calculating synced strength fatigue', { clientId }, error)
    }

    // ==================
    // Readiness Composite
    // ==================
    let readinessScoreData = null
    let calculatedReadinessScore = null
    let readinessLevel = null
    let recommendedAction = null

    // Calculate readiness if we have HRV, wellness, and RHR
    if (hrvAssessment && wellnessScoreData && rhrAssessment) {
      // Get recent training load for ACWR calculation
      const recentWorkouts = await prisma.workoutLog.findMany({
        where: {
          athleteId: dbUser.id,
          completed: true,
          completedAt: {
            gte: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000), // Last 28 days
          },
        },
        orderBy: { completedAt: 'asc' },
      })

      // Calculate daily TSS/TRIMP (simplified - assume RPE * duration / 10)
      const dailyLoads = recentWorkouts
        .filter(w => w.completedAt !== null)
        .map(w => ({
          date: w.completedAt!,
          tss: (w.perceivedEffort || 5) * (w.duration || 0) / 10,
        }))

      // Group by date and sum
      const loadByDate = new Map<string, number>()
      for (const load of dailyLoads) {
        const dateKey = load.date.toISOString().split('T')[0]
        loadByDate.set(dateKey, (loadByDate.get(dateKey) || 0) + load.tss)
      }

      const trainingLoads = Array.from(loadByDate.entries()).map(([date, tss]) => ({
        date: new Date(date),
        tss,
      }))

      readinessScoreData = calculateReadinessScore({
        hrv: hrvAssessment,
        rhr: rhrAssessment,
        wellness: wellnessScoreData,
        // ACWR calculation would require more complex load tracking
        // For now, readiness is based on HRV, RHR, and wellness only
      })

      calculatedReadinessScore = readinessScoreData.score
      readinessLevel = readinessScoreData.status
      recommendedAction = readinessScoreData.workoutModification.action
    }

    // ==================
    // Save to Database
    // ==================
    const dailyMetrics = await prisma.dailyMetrics.upsert({
      where: {
        clientId_date: {
          clientId,
          date: metricsDate,
        },
      },
      update: {
        // HRV data
        hrvRMSSD: hrvRMSSD || null,
        hrvQuality: hrvQuality || null,
        hrvArtifactPercent: hrvArtifactPercent ?? null,
        hrvDuration: hrvDuration ?? null,
        hrvPosition: hrvPosition ?? null,
        hrvStatus,
        hrvPercent,
        hrvTrend,

        // RHR data
        restingHR: restingHR || null,
        restingHRStatus,
        restingHRDev,

        // Wellness data
        sleepQuality: sleepQuality ?? null,
        sleepHours: sleepHours ?? null,
        muscleSoreness: muscleSoreness ?? null,
        energyLevel: energyLevel ?? null,
        mood: mood ?? null,
        stress: stress ?? null,
        injuryPain: injuryPain ?? null,
        wellnessScore: calculatedWellnessScore,

        // Readiness composite
        readinessScore: calculatedReadinessScore,
        readinessLevel,
        recommendedAction,

        // Notes
        athleteNotes: notes || null,

        // Injury details (when pain >= 3)
        injuryBodyPart: injuryDetails?.bodyPart || null,
        injurySpecificType: injuryDetails?.injuryType || null,
        injurySide: injuryDetails?.side || null,
        isIllness: injuryDetails?.isIllness || false,
        illnessType: injuryDetails?.illnessType || null,

        // Keyword analysis from notes
        detectedKeywords: keywordAnalysis?.matches || null,
        keywordBodyPart: keywordAnalysis?.suggestedBodyPart || null,
        keywordSeverity: keywordAnalysis?.severityLevel || null,
        keywordSummary: keywordAnalysis?.summary || null,

        // Rehab compliance (Phase 7 - Physio System)
        rehabExercisesDone: rehabExercisesDone ?? false,
        rehabPainDuring: rehabPainDuring ?? null,
        rehabPainAfter: rehabPainAfter ?? null,
        rehabNotes: rehabNotes || null,
        requestPhysioContact: requestPhysioContact ?? false,
        physioContactReason: physioContactReason || null,

        updatedAt: new Date(),
      },
      create: {
        clientId,
        date: metricsDate,

        // HRV data
        hrvRMSSD: hrvRMSSD || null,
        hrvQuality: hrvQuality || null,
        hrvArtifactPercent: hrvArtifactPercent ?? null,
        hrvDuration: hrvDuration ?? null,
        hrvPosition: hrvPosition ?? null,
        hrvStatus,
        hrvPercent,
        hrvTrend,

        // RHR data
        restingHR: restingHR || null,
        restingHRStatus,
        restingHRDev,

        // Wellness data
        sleepQuality: sleepQuality ?? null,
        sleepHours: sleepHours ?? null,
        muscleSoreness: muscleSoreness ?? null,
        energyLevel: energyLevel ?? null,
        mood: mood ?? null,
        stress: stress ?? null,
        injuryPain: injuryPain ?? null,
        wellnessScore: calculatedWellnessScore,

        // Readiness composite
        readinessScore: calculatedReadinessScore,
        readinessLevel,
        recommendedAction,

        // Notes
        athleteNotes: notes || null,

        // Injury details (when pain >= 3)
        injuryBodyPart: injuryDetails?.bodyPart || null,
        injurySpecificType: injuryDetails?.injuryType || null,
        injurySide: injuryDetails?.side || null,
        isIllness: injuryDetails?.isIllness || false,
        illnessType: injuryDetails?.illnessType || null,

        // Keyword analysis from notes
        detectedKeywords: keywordAnalysis?.matches || null,
        keywordBodyPart: keywordAnalysis?.suggestedBodyPart || null,
        keywordSeverity: keywordAnalysis?.severityLevel || null,
        keywordSummary: keywordAnalysis?.summary || null,

        // Rehab compliance (Phase 7 - Physio System)
        rehabExercisesDone: rehabExercisesDone ?? false,
        rehabPainDuring: rehabPainDuring ?? null,
        rehabPainAfter: rehabPainAfter ?? null,
        rehabNotes: rehabNotes || null,
        requestPhysioContact: requestPhysioContact ?? false,
        physioContactReason: physioContactReason || null,
      },
    })

    // ==========================================
    // Automatic Injury Detection & Response
    // ==========================================
    let injuryTriggered = false
    let injurySummary = null
    let injuriesResolved = 0

    // Auto-resolve injuries if athlete reports low pain (1-2)
    // This clears injuries when athlete is recovered
    if (injuryPain <= 2) {
      try {
        const activeInjuries = await prisma.injuryAssessment.findMany({
          where: {
            clientId,
            status: { not: 'FULLY_RECOVERED' },
          },
        })

        if (activeInjuries.length > 0) {
          // Mark all active injuries as recovered
          await prisma.injuryAssessment.updateMany({
            where: {
              clientId,
              status: { not: 'FULLY_RECOVERED' },
            },
            data: {
              status: 'FULLY_RECOVERED',
              updatedAt: new Date(),
            },
          })
          injuriesResolved = activeInjuries.length
          logger.info('Auto-resolved injuries due to low pain report', {
            clientId,
            injuryPain,
            resolvedCount: injuriesResolved
          })
        }
      } catch (error) {
        logger.error('Error auto-resolving injuries', { clientId }, error)
      }
    }

    // Trigger injury cascade if pain/readiness thresholds exceeded
    // Note: injuryPain uses natural scale (1 = no pain, 10 = high pain)
    const shouldTriggerInjury =
      injuryPain >= 5 || // Pain ≥5/10
      (calculatedReadinessScore && calculatedReadinessScore < 5.5) || // Low readiness
      sleepHours < 5 || // Critical sleep deprivation
      stress >= 8 // Extreme stress

    if (shouldTriggerInjury) {
      try {
        logger.info('Injury trigger detected, processing cascade', { clientId, injuryPain, readinessScore: calculatedReadinessScore })

        // Call injury processing endpoint internally
        const injuryResponse = await fetch(
          `${request.nextUrl.origin}/api/injury/process-checkin`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Cookie: request.headers.get('cookie') || '', // Forward auth cookie
            },
            body: JSON.stringify({
              clientId,
              date: date,
              injuryPain,
              stress,
              sleepHours,
              energyLevel,
              readinessScore: calculatedReadinessScore,
              readinessLevel,
              muscleSoreness,
              // Pass injury details for accurate injury type detection
              injuryDetails: injuryDetails ? {
                bodyPart: injuryDetails.bodyPart,
                injuryType: injuryDetails.injuryType,
                side: injuryDetails.side,
                isIllness: injuryDetails.isIllness,
                illnessType: injuryDetails.illnessType,
              } : undefined,
              // Pass keyword analysis summary for context
              keywordAnalysis: keywordAnalysis ? {
                matches: keywordAnalysis.matches,
                suggestedBodyPart: keywordAnalysis.suggestedBodyPart,
                severityLevel: keywordAnalysis.severityLevel,
                summary: keywordAnalysis.summary,
              } : undefined,
            }),
          }
        )

        if (injuryResponse.ok) {
          const injuryData = await injuryResponse.json()
          injuryTriggered = injuryData.triggered
          injurySummary = injuryData.summary
          logger.info('Injury cascade completed', { clientId, title: injuryData.summary?.title })
        } else {
          logger.error('Failed to process injury cascade', { clientId, status: injuryResponse.statusText })
        }
      } catch (error) {
        logger.error('Error triggering injury cascade', { clientId }, error)
        // Don't fail the entire check-in if injury processing fails
      }
    }

    // Blend objective and subjective muscle fatigue if both available
    let blendedMuscularFatigue: number | null = null
    if (syncedStrengthFatigue && muscleSoreness !== null) {
      // Note: muscleSoreness is already inverted (11 - value) in the form
      // So higher = less soreness = more fresh (same direction as objectiveFatigue)
      blendedMuscularFatigue = blendStrengthFatigue(
        syncedStrengthFatigue.score,
        muscleSoreness
      )
    }

    // ==========================================
    // Physio Contact Request Notification (Phase 7)
    // ==========================================
    if (requestPhysioContact) {
      try {
        // Find physio assigned to this athlete
        const physioAssignment = await prisma.physioAssignment.findFirst({
          where: {
            clientId,
            isActive: true,
          },
          include: {
            physio: true,
          },
        })

        if (physioAssignment) {
          // Create notification for the physio
          await prisma.aINotification.create({
            data: {
              clientId,
              notificationType: 'PHYSIO_CONTACT_REQUEST',
              title: '📞 Atlet begär kontakt',
              message: physioContactReason || 'Atleten vill prata med dig.',
              priority: 'HIGH',
              contextData: {
                requestType: 'ATHLETE_INITIATED',
                athleteName: client.name,
                reason: physioContactReason,
                checkInDate: metricsDate.toISOString(),
                rehabPainDuring,
                rehabPainAfter,
              },
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
            },
          })
          logger.info('Physio contact request notification created', {
            clientId,
            physioId: physioAssignment.physioUserId,
          })
        } else {
          logger.warn('No active physio assignment found for athlete', { clientId })
        }
      } catch (error) {
        logger.error('Error creating physio contact notification', { clientId }, error)
        // Don't fail check-in if notification fails
      }
    }

    // ==========================================
    // Streak Processing & Milestone Celebrations
    // ==========================================
    try {
      // Get all metrics for streak calculation
      const allMetrics = await prisma.dailyMetrics.findMany({
        where: { clientId },
        orderBy: { date: 'desc' },
        select: { date: true },
        take: 400, // Enough for a year+
      })

      // Calculate current streak
      const currentStreak = calculateStreakFromMetrics(allMetrics)

      // Get client's current best streak
      const clientData = await prisma.client.findUnique({
        where: { id: clientId },
        select: { bestCheckInStreak: true },
      })

      const previousBest = clientData?.bestCheckInStreak || 0

      // Update personal best if beaten
      if (currentStreak > previousBest) {
        await prisma.client.update({
          where: { id: clientId },
          data: {
            bestCheckInStreak: currentStreak,
            bestStreakAchievedAt: new Date(),
          },
        })
        logger.info('New personal best streak!', { clientId, currentStreak, previousBest })
      }

      // Check for milestone and create notification
      const STREAK_MILESTONES = [7, 14, 21, 30, 60, 90, 180, 365]
      if (STREAK_MILESTONES.includes(currentStreak)) {
        const milestoneLabels: Record<number, { label: string; level: string }> = {
          7: { label: 'En vecka stark!', level: 'BRONZE' },
          14: { label: 'Två veckor!', level: 'BRONZE' },
          21: { label: 'Tre veckor - vana bildas!', level: 'SILVER' },
          30: { label: 'En hel månad!', level: 'SILVER' },
          60: { label: 'Två månader!', level: 'GOLD' },
          90: { label: 'Kvartalet är ditt!', level: 'GOLD' },
          180: { label: 'Halvåret avklarat!', level: 'PLATINUM' },
          365: { label: 'Ett helt år - legendär!', level: 'PLATINUM' },
        }

        const milestone = milestoneLabels[currentStreak]

        // Create milestone notification
        await prisma.aINotification.create({
          data: {
            clientId,
            notificationType: 'MILESTONE',
            title: `🔥 ${currentStreak} dagars streak!`,
            message: milestone.label,
            priority: 'MEDIUM',
            contextData: {
              milestoneType: 'CONSISTENCY_STREAK',
              celebrationLevel: milestone.level,
              value: currentStreak,
              unit: 'dagar',
              previousBest: previousBest > 0 ? previousBest : null,
            },
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          },
        })

        logger.info('Streak milestone notification created', { clientId, currentStreak, level: milestone.level })
      }
    } catch (error) {
      logger.error('Error processing streak', { clientId }, error)
      // Don't fail check-in if streak processing fails
    }

    return NextResponse.json({
      success: true,
      dailyMetrics,
      assessments: {
        hrv: hrvAssessment,
        rhr: rhrAssessment,
        wellness: wellnessScoreData,
        readiness: readinessScoreData,
        // Synced strength fatigue data (Gap 3)
        strengthFatigue: syncedStrengthFatigue
          ? {
              objectiveScore: syncedStrengthFatigue.score,
              blendedScore: blendedMuscularFatigue,
              volume7d: syncedStrengthFatigue.strengthVolume7d,
              sessions7d: syncedStrengthFatigue.strengthSessions7d,
              daysSinceLastStrength: syncedStrengthFatigue.daysSinceLastStrength,
              warning: syncedStrengthFatigue.warning,
              sources: syncedStrengthFatigue.sources,
            }
          : null,
      },
      injuryResponse: injuryTriggered
        ? {
            triggered: true,
            summary: injurySummary,
          }
        : {
            triggered: false,
            resolved: injuriesResolved > 0 ? injuriesResolved : undefined,
          },
    })
  } catch (error) {
    logger.error('Error saving daily metrics', {}, error)
    return NextResponse.json(
      { error: 'Failed to save daily metrics' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/daily-metrics?clientId=xxx&days=30
 *
 * Retrieve historical daily metrics
 */
export async function GET(request: NextRequest) {
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

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')
    const days = parseInt(searchParams.get('days') || '30')

    if (!clientId) {
      return NextResponse.json(
        { error: 'Missing required parameter: clientId' },
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

    // Retrieve metrics
    const metrics = await prisma.dailyMetrics.findMany({
      where: {
        clientId,
        date: {
          gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
        },
      },
      orderBy: { date: 'desc' },
    })

    // Calculate summary statistics
    const recentMetrics = metrics.slice(0, 7) // Last 7 days

    const summary = {
      totalDays: metrics.length,
      recentDays: recentMetrics.length,
      averageReadiness:
        recentMetrics.length > 0
          ? recentMetrics.reduce((sum, m) => sum + (m.readinessScore || 0), 0) /
            recentMetrics.filter(m => m.readinessScore !== null).length
          : null,
      averageWellness:
        recentMetrics.length > 0
          ? recentMetrics.reduce((sum, m) => sum + (m.wellnessScore || 0), 0) /
            recentMetrics.filter(m => m.wellnessScore !== null).length
          : null,
      averageHRV:
        recentMetrics.length > 0
          ? recentMetrics.reduce((sum, m) => sum + (m.hrvRMSSD || 0), 0) /
            recentMetrics.filter(m => m.hrvRMSSD !== null).length
          : null,
      averageRHR:
        recentMetrics.length > 0
          ? recentMetrics.reduce((sum, m) => sum + (m.restingHR || 0), 0) /
            recentMetrics.filter(m => m.restingHR !== null).length
          : null,
    }

    return NextResponse.json({
      success: true,
      metrics,
      summary,
    })
  } catch (error) {
    logger.error('Error retrieving daily metrics', {}, error)
    return NextResponse.json(
      { error: 'Failed to retrieve daily metrics' },
      { status: 500 }
    )
  }
}

function normalizeMeasurementQuality(
  value?: string | null
): 'GOOD' | 'FAIR' | 'POOR' {
  if (value === 'FAIR') return 'FAIR'
  if (value === 'POOR') return 'POOR'
  return 'GOOD'
}

function normalizePosition(value?: string | null): 'SUPINE' | 'SEATED' {
  return value === 'SEATED' ? 'SEATED' : 'SUPINE'
}

function createFallbackHRVBaseline(measurement: HRVMeasurement): HRVBaseline {
  return {
    mean: measurement.rmssd,
    stdDev: 0,
    cv: 0,
    measurementDays: 1,
    startDate: measurement.timestamp,
    endDate: measurement.timestamp,
    thresholds: {
      excellent: measurement.rmssd,
      good: measurement.rmssd,
      moderate: measurement.rmssd,
      fair: measurement.rmssd,
      poor: measurement.rmssd,
      veryPoor: measurement.rmssd,
    },
  }
}

function createFallbackRHRBaseline(measurement: RHRMeasurement): RHRBaseline {
  return {
    mean: measurement.heartRate,
    stdDev: 0,
    min: measurement.heartRate,
    max: measurement.heartRate,
    measurementDays: 1,
    startDate: measurement.timestamp,
    endDate: measurement.timestamp,
    thresholds: {
      normal: measurement.heartRate,
      slightlyElevated: measurement.heartRate + 3,
      elevated: measurement.heartRate + 6,
      highlyElevated: measurement.heartRate + 8,
    },
  }
}

/**
 * Calculate consecutive days with check-ins starting from today
 */
function calculateStreakFromMetrics(metrics: Array<{ date: Date }>): number {
  if (metrics.length === 0) return 0

  // Sort by date descending
  const sorted = [...metrics].sort((a, b) => b.date.getTime() - a.date.getTime())

  let streak = 0
  let expectedDate = new Date()
  expectedDate.setHours(0, 0, 0, 0)

  for (const metric of sorted) {
    const metricDate = new Date(metric.date)
    metricDate.setHours(0, 0, 0, 0)

    if (metricDate.getTime() === expectedDate.getTime()) {
      streak++
      // Move to previous day
      expectedDate.setDate(expectedDate.getDate() - 1)
    } else {
      // Streak broken
      break
    }
  }

  return streak
}
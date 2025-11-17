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
  type HRVMeasurement,
  type RHRMeasurement,
  type WellnessResponses,
} from '@/lib/training-engine/monitoring'

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
      restingHR,
      sleepQuality,
      sleepHours,
      muscleSoreness,
      energyLevel,
      mood,
      stress,
      injuryPain,
      notes,
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
        quality: hrvQuality as 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR',
        timestamp: metricsDate,
      }

      // Calculate baseline from historical data
      const historicalHRVData = historicalMetrics
        .filter(m => m.hrvRMSSD !== null && m.hrvQuality === 'EXCELLENT')
        .map(m => m.hrvRMSSD as number)

      let hrvBaseline
      if (historicalHRVData.length >= 7) {
        hrvBaseline = establishHRVBaseline(historicalHRVData)
      } else {
        // Not enough data for baseline - use measurement as baseline
        hrvBaseline = {
          baseline: hrvRMSSD,
          standardDeviation: 0,
          measurementCount: 1,
          lastUpdated: metricsDate,
          isReliable: false,
        }
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
        bpm: restingHR,
        timestamp: metricsDate,
      }

      // Calculate baseline from historical data
      const historicalRHRData = historicalMetrics
        .filter(m => m.restingHR !== null)
        .map(m => m.restingHR as number)

      let rhrBaseline
      if (historicalRHRData.length >= 7) {
        rhrBaseline = establishRHRBaseline(historicalRHRData)
      } else {
        // Not enough data for baseline
        rhrBaseline = {
          baseline: restingHR,
          standardDeviation: 0,
          measurementCount: 1,
          lastUpdated: metricsDate,
          isReliable: false,
        }
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

      const wellnessResponses: WellnessResponses = {
        sleepQuality: scaleTo5(sleepQuality) as 1 | 2 | 3 | 4 | 5,
        sleepDuration: sleepHours,
        fatigueLevel: scaleTo5(energyLevel) as 1 | 2 | 3 | 4 | 5,
        muscleSoreness: scaleTo5(muscleSoreness) as 1 | 2 | 3 | 4 | 5,
        stressLevel: scaleTo5(stress) as 1 | 2 | 3 | 4 | 5,
        mood: scaleTo5(mood) as 1 | 2 | 3 | 4 | 5,
        motivationToTrain: scaleTo5(injuryPain) as 1 | 2 | 3 | 4 | 5, // 1 = significant pain (low motivation), 10 = no pain (high motivation)
      }

      console.log('Original wellness input (1-10 scale):', {
        sleepQuality, sleepHours, energyLevel, muscleSoreness, stress, mood, injuryPain
      })
      console.log('Converted wellness (1-5 scale):', wellnessResponses)

      wellnessScoreData = calculateWellnessScore(wellnessResponses)
      calculatedWellnessScore = wellnessScoreData.totalScore

      console.log('Wellness score result:', {
        totalScore: wellnessScoreData.totalScore,
        rawScore: wellnessScoreData.rawScore,
        status: wellnessScoreData.status
      })
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
        updatedAt: new Date(),
      },
      create: {
        clientId,
        date: metricsDate,

        // HRV data
        hrvRMSSD: hrvRMSSD || null,
        hrvQuality: hrvQuality || null,
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
      },
    })

    return NextResponse.json({
      success: true,
      dailyMetrics,
      assessments: {
        hrv: hrvAssessment,
        rhr: rhrAssessment,
        wellness: wellnessScoreData,
        readiness: readinessScoreData,
      },
    })
  } catch (error) {
    console.error('Error saving daily metrics:', error)
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
    console.error('Error retrieving daily metrics:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve daily metrics' },
      { status: 500 }
    )
  }
}

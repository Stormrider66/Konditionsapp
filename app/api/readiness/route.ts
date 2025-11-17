/**
 * Readiness API
 *
 * GET /api/readiness?clientId=xxx - Get current readiness score and trends
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { analyzeReadinessTrend } from '@/lib/training-engine/monitoring'

/**
 * GET /api/readiness?clientId=xxx
 *
 * Returns:
 * - Current readiness score (today or most recent)
 * - 7-day trend
 * - 30-day average
 * - Readiness factors (HRV, RHR, Wellness, ACWR)
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

    // Get today's date (start of day)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Get current readiness (today or most recent)
    const currentMetrics = await prisma.dailyMetrics.findFirst({
      where: {
        clientId,
        date: {
          lte: today,
        },
      },
      orderBy: { date: 'desc' },
    })

    // Get last 7 days for trend analysis
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const last7Days = await prisma.dailyMetrics.findMany({
      where: {
        clientId,
        date: {
          gte: sevenDaysAgo,
        },
      },
      orderBy: { date: 'asc' },
    })

    // Get last 30 days for averages
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const last30Days = await prisma.dailyMetrics.findMany({
      where: {
        clientId,
        date: {
          gte: thirtyDaysAgo,
        },
      },
      orderBy: { date: 'asc' },
    })

    // Calculate trend
    const readinessScores = last7Days
      .filter(m => m.readinessScore !== null)
      .map(m => ({
        score: m.readinessScore!,
        date: m.date,
      }))

    let trend = null
    if (readinessScores.length >= 3) {
      trend = analyzeReadinessTrend(readinessScores)
    }

    // Calculate 30-day averages
    const metricsWithReadiness = last30Days.filter(m => m.readinessScore !== null)
    const metricsWithHRV = last30Days.filter(m => m.hrvRMSSD !== null)
    const metricsWithRHR = last30Days.filter(m => m.restingHR !== null)
    const metricsWithWellness = last30Days.filter(m => m.wellnessScore !== null)

    const averages = {
      readiness:
        metricsWithReadiness.length > 0
          ? metricsWithReadiness.reduce((sum, m) => sum + m.readinessScore!, 0) /
            metricsWithReadiness.length
          : null,
      hrv:
        metricsWithHRV.length > 0
          ? metricsWithHRV.reduce((sum, m) => sum + m.hrvRMSSD!, 0) /
            metricsWithHRV.length
          : null,
      rhr:
        metricsWithRHR.length > 0
          ? metricsWithRHR.reduce((sum, m) => sum + m.restingHR!, 0) /
            metricsWithRHR.length
          : null,
      wellness:
        metricsWithWellness.length > 0
          ? metricsWithWellness.reduce((sum, m) => sum + m.wellnessScore!, 0) /
            metricsWithWellness.length
          : null,
    }

    // Build readiness factors breakdown
    let factors = null
    if (currentMetrics) {
      factors = {
        hrv: currentMetrics.hrvRMSSD
          ? {
              value: currentMetrics.hrvRMSSD,
              status: currentMetrics.hrvStatus,
              percentOfBaseline: currentMetrics.hrvPercent,
              trend: currentMetrics.hrvTrend,
            }
          : null,
        rhr: currentMetrics.restingHR
          ? {
              value: currentMetrics.restingHR,
              status: currentMetrics.restingHRStatus,
              deviation: currentMetrics.restingHRDev,
            }
          : null,
        wellness: currentMetrics.wellnessScore
          ? {
              score: currentMetrics.wellnessScore,
              breakdown: {
                sleepQuality: currentMetrics.sleepQuality,
                sleepHours: currentMetrics.sleepHours,
                muscleSoreness: currentMetrics.muscleSoreness,
                energyLevel: currentMetrics.energyLevel,
                mood: currentMetrics.mood,
                stress: currentMetrics.stress,
                injuryPain: currentMetrics.injuryPain,
              },
            }
          : null,
      }
    }

    // Check if check-in needed today
    const hasCheckedInToday = currentMetrics &&
      currentMetrics.date.toDateString() === today.toDateString()

    return NextResponse.json({
      success: true,
      current: {
        date: currentMetrics?.date || null,
        readinessScore: currentMetrics?.readinessScore || null,
        readinessLevel: currentMetrics?.readinessLevel || null,
        recommendedAction: currentMetrics?.recommendedAction || null,
        factors,
      },
      trend: trend || {
        direction: 'STABLE',
        magnitude: 'SMALL',
        consecutive: 0,
        explanation: 'Insufficient data for trend analysis (need 3+ days)',
      },
      averages,
      history: {
        last7Days: last7Days.map(m => ({
          date: m.date,
          readinessScore: m.readinessScore,
          readinessLevel: m.readinessLevel,
        })),
        last30Days: last30Days.map(m => ({
          date: m.date,
          readinessScore: m.readinessScore,
          readinessLevel: m.readinessLevel,
        })),
      },
      meta: {
        hasCheckedInToday,
        totalCheckIns: last30Days.length,
        checkInStreak: calculateCheckInStreak(last30Days),
      },
    })
  } catch (error) {
    console.error('Error retrieving readiness:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve readiness data' },
      { status: 500 }
    )
  }
}

/**
 * Calculate consecutive days with check-ins
 */
function calculateCheckInStreak(metrics: Array<{ date: Date }>): number {
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

/**
 * Garmin Pre-fill API
 *
 * Fetches today's Garmin data to pre-populate daily check-in form:
 * - HRV (from last night)
 * - RHR (resting heart rate)
 * - Sleep data (hours, quality)
 *
 * Returns suggested values that athlete can accept or override.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { canAccessClient } from '@/lib/auth-utils'
import { logError } from '@/lib/logger-console'

interface GarminPrefillData {
  available: boolean
  source: 'garmin' | 'none'
  lastSyncAt?: string
  data: {
    hrvRMSSD?: number
    hrvStatus?: string
    restingHR?: number
    sleepHours?: number
    sleepQuality?: number // 1-10 scale
    sleepDetails?: {
      deepSleepMinutes?: number
      lightSleepMinutes?: number
      remSleepMinutes?: number
      awakeMinutes?: number
    }
    stress?: number // 1-10 scale
    steps?: number
    activeMinutes?: number
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')

    if (!clientId) {
      return NextResponse.json({ error: 'clientId required' }, { status: 400 })
    }

    const hasAccess = await canAccessClient(user.id, clientId)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Check if Garmin is connected
    const integrationToken = await prisma.integrationToken.findUnique({
      where: {
        clientId_type: {
          clientId,
          type: 'GARMIN',
        },
      },
      select: {
        syncEnabled: true,
        lastSyncAt: true,
      },
    })

    if (!integrationToken?.syncEnabled) {
      const result: GarminPrefillData = {
        available: false,
        source: 'none',
        data: {},
      }
      return NextResponse.json(result)
    }

    // Get today's date and yesterday (for sleep data which is recorded for previous night)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    // Fetch today's and yesterday's metrics
    const [todayMetrics, yesterdayMetrics] = await Promise.all([
      prisma.dailyMetrics.findUnique({
        where: {
          clientId_date: {
            clientId,
            date: today,
          },
        },
        select: {
          restingHR: true,
          hrvRMSSD: true,
          hrvStatus: true,
          sleepHours: true,
          sleepQuality: true,
          stress: true,
          factorScores: true,
        },
      }),
      prisma.dailyMetrics.findUnique({
        where: {
          clientId_date: {
            clientId,
            date: yesterday,
          },
        },
        select: {
          sleepHours: true,
          sleepQuality: true,
          factorScores: true,
        },
      }),
    ])

    // Extract Garmin-specific data from factorScores
    const todayFactors = todayMetrics?.factorScores as {
      garminDaily?: {
        steps?: number
        activeMinutes?: number
        restingHR?: number
      }
      garminHRV?: {
        lastNightAvg?: number
        status?: string
      }
      garminSleep?: {
        durationMinutes?: number
        deepSleepMinutes?: number
        lightSleepMinutes?: number
        remSleepMinutes?: number
        awakeMinutes?: number
        scores?: {
          overall?: number
        }
      }
    } | null

    const yesterdayFactors = yesterdayMetrics?.factorScores as {
      garminSleep?: {
        durationMinutes?: number
        deepSleepMinutes?: number
        lightSleepMinutes?: number
        remSleepMinutes?: number
        awakeMinutes?: number
        scores?: {
          overall?: number
        }
      }
    } | null

    // Use last night's sleep data (could be on today or yesterday depending on sync timing)
    const sleepData = todayFactors?.garminSleep || yesterdayFactors?.garminSleep

    // Build prefill data
    const prefillData: GarminPrefillData = {
      available: true,
      source: 'garmin',
      lastSyncAt: integrationToken.lastSyncAt?.toISOString(),
      data: {
        // HRV - prefer from garminHRV, fallback to direct field
        hrvRMSSD: todayFactors?.garminHRV?.lastNightAvg || todayMetrics?.hrvRMSSD || undefined,
        hrvStatus: todayFactors?.garminHRV?.status || todayMetrics?.hrvStatus || undefined,

        // RHR - prefer from garminDaily, fallback to direct field
        restingHR: todayFactors?.garminDaily?.restingHR || todayMetrics?.restingHR || undefined,

        // Sleep - convert from minutes to hours if from Garmin
        sleepHours: sleepData?.durationMinutes
          ? Math.round((sleepData.durationMinutes / 60) * 10) / 10
          : todayMetrics?.sleepHours || yesterdayMetrics?.sleepHours || undefined,

        // Sleep quality - convert from 0-100 to 1-10 if from Garmin
        sleepQuality: sleepData?.scores?.overall
          ? Math.max(1, Math.min(10, Math.round(sleepData.scores.overall / 10)))
          : todayMetrics?.sleepQuality || yesterdayMetrics?.sleepQuality || undefined,

        // Sleep details
        sleepDetails: sleepData
          ? {
              deepSleepMinutes: sleepData.deepSleepMinutes,
              lightSleepMinutes: sleepData.lightSleepMinutes,
              remSleepMinutes: sleepData.remSleepMinutes,
              awakeMinutes: sleepData.awakeMinutes,
            }
          : undefined,

        // Stress - already on 1-10 scale
        stress: todayMetrics?.stress || undefined,

        // Activity data
        steps: todayFactors?.garminDaily?.steps,
        activeMinutes: todayFactors?.garminDaily?.activeMinutes,
      },
    }

    // Check if we actually have useful data
    const hasData =
      prefillData.data.hrvRMSSD ||
      prefillData.data.restingHR ||
      prefillData.data.sleepHours ||
      prefillData.data.sleepQuality

    if (!hasData) {
      prefillData.available = false
    }

    return NextResponse.json(prefillData)
  } catch (error) {
    logError('Error fetching Garmin prefill data:', error)
    return NextResponse.json({ error: 'Failed to fetch Garmin data' }, { status: 500 })
  }
}

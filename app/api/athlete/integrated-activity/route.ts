/**
 * Integrated Activity API
 *
 * Fetches combined activity data from:
 * - Manual workout logs (WorkoutLog)
 * - Strava synced activities (StravaActivity)
 * - Garmin synced activities (DailyMetrics.factorScores)
 * - Concept2 synced results (Concept2Result)
 *
 * Returns unified format for dashboard display.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

interface UnifiedActivity {
  id: string
  source: 'manual' | 'strava' | 'garmin' | 'concept2' | 'ai'
  name: string
  type: string
  date: Date
  duration?: number // minutes
  distance?: number // km
  avgHR?: number
  maxHR?: number
  calories?: number
  tss?: number
  trimp?: number
  pace?: string // min/km for running, or MM:SS.t/500m for rowing
  speed?: number // km/h for cycling
  elevationGain?: number
  completed?: boolean
  notes?: string
  stravaId?: string
  garminId?: number
  concept2Id?: number
  // Concept2 specific
  strokeRate?: number
  equipmentType?: string
  // AI WOD specific
  sessionRPE?: number
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
    const days = parseInt(searchParams.get('days') || '14')
    const limit = parseInt(searchParams.get('limit') || '20')

    if (!clientId) {
      return NextResponse.json({ error: 'clientId required' }, { status: 400 })
    }

    // Verify access
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { userId: true, athleteAccount: { select: { userId: true } } },
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    const isCoach = client.userId === user.id
    const isAthlete = client.athleteAccount?.userId === user.id
    const athleteId = client.athleteAccount?.userId

    if (!isCoach && !isAthlete) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Fetch all data sources in parallel
    const [manualLogs, stravaActivities, dailyMetrics, concept2Results, aiWods] = await Promise.all([
      // Manual workout logs - filter by athleteId (the user ID of the athlete)
      athleteId
        ? prisma.workoutLog.findMany({
            where: {
              athleteId,
              completedAt: { gte: startDate },
            },
            include: {
              workout: { select: { name: true, type: true } },
            },
            orderBy: { completedAt: 'desc' },
            take: limit,
          })
        : [],

      // Strava activities
      prisma.stravaActivity.findMany({
        where: {
          clientId,
          startDate: { gte: startDate },
        },
        orderBy: { startDate: 'desc' },
        take: limit,
      }),

      // Garmin activities (stored in DailyMetrics.factorScores)
      prisma.dailyMetrics.findMany({
        where: {
          clientId,
          date: { gte: startDate },
        },
        select: {
          date: true,
          factorScores: true,
        },
        orderBy: { date: 'desc' },
      }),

      // Concept2 results
      prisma.concept2Result.findMany({
        where: {
          clientId,
          date: { gte: startDate },
        },
        orderBy: { date: 'desc' },
        take: limit,
      }),

      // AI-generated WODs (completed only)
      prisma.aIGeneratedWOD.findMany({
        where: {
          clientId,
          status: 'COMPLETED',
          completedAt: { gte: startDate },
        },
        orderBy: { completedAt: 'desc' },
        take: limit,
      }),
    ])

    const activities: UnifiedActivity[] = []

    // Process manual logs
    for (const log of manualLogs) {
      activities.push({
        id: log.id,
        source: 'manual',
        name: log.workout?.name || 'Workout',
        type: log.workout?.type || 'OTHER',
        date: log.completedAt || new Date(),
        duration: log.duration || undefined,
        distance: log.distance || undefined,
        avgHR: log.avgHR || undefined,
        completed: log.completed,
        notes: log.notes || undefined,
      })
    }

    // Process Strava activities
    for (const activity of stravaActivities) {
      const durationMin = activity.movingTime ? Math.round(activity.movingTime / 60) : undefined
      const distanceKm = activity.distance ? activity.distance / 1000 : undefined

      // Calculate pace for running
      let pace: string | undefined
      if (activity.type?.toLowerCase().includes('run') && activity.averageSpeed && activity.averageSpeed > 0) {
        const paceMinPerKm = 1000 / (activity.averageSpeed * 60)
        const paceMin = Math.floor(paceMinPerKm)
        const paceSec = Math.round((paceMinPerKm - paceMin) * 60)
        pace = `${paceMin}:${paceSec.toString().padStart(2, '0')}`
      }

      // Calculate speed for cycling
      let speed: number | undefined
      if (activity.type?.toLowerCase().includes('ride') && activity.averageSpeed) {
        speed = activity.averageSpeed * 3.6 // m/s to km/h
      }

      activities.push({
        id: activity.id,
        source: 'strava',
        name: activity.name,
        type: activity.mappedType || activity.type || 'OTHER',
        date: activity.startDate,
        duration: durationMin,
        distance: distanceKm,
        avgHR: activity.averageHeartrate || undefined,
        maxHR: activity.maxHeartrate || undefined,
        calories: activity.calories || undefined,
        tss: activity.tss || undefined,
        trimp: activity.trimp || undefined,
        pace,
        speed,
        elevationGain: activity.elevationGain || undefined,
        stravaId: activity.stravaId,
      })
    }

    // Process Garmin activities
    for (const metric of dailyMetrics) {
      const factorScores = metric.factorScores as {
        garminActivities?: Array<{
          activityId?: number
          type?: string
          mappedType?: string
          duration?: number
          distance?: number
          avgHR?: number
          maxHR?: number
          calories?: number
          tss?: number
        }>
      } | null

      const garminActivities = factorScores?.garminActivities || []

      for (const activity of garminActivities) {
        const durationMin = activity.duration ? Math.round(activity.duration / 60) : undefined
        const distanceKm = activity.distance ? activity.distance / 1000 : undefined

        activities.push({
          id: `garmin-${activity.activityId}-${metric.date.toISOString()}`,
          source: 'garmin',
          name: activity.type || 'Garmin Activity',
          type: activity.mappedType || activity.type || 'OTHER',
          date: metric.date,
          duration: durationMin,
          distance: distanceKm,
          avgHR: activity.avgHR,
          maxHR: activity.maxHR,
          calories: activity.calories,
          tss: activity.tss,
          garminId: activity.activityId,
        })
      }
    }

    // Process Concept2 results
    for (const result of concept2Results) {
      // Time is in tenths of seconds, convert to minutes
      const durationMin = result.time ? Math.round(result.time / 600) : undefined
      // Distance is in meters, convert to km
      const distanceKm = result.distance ? result.distance / 1000 : undefined

      // Format pace as MM:SS.t/500m (standard rowing format)
      let pace: string | undefined
      if (result.pace && result.pace > 0) {
        const paceMin = Math.floor(result.pace / 60)
        const paceSec = (result.pace % 60).toFixed(1)
        pace = `${paceMin}:${paceSec.padStart(4, '0')}/500m`
      }

      // Map equipment type to display name
      const equipmentNames: Record<string, string> = {
        rower: 'RowErg',
        skierg: 'SkiErg',
        bike: 'BikeErg',
        dynamic: 'Dynamic',
        slides: 'Slides',
        multierg: 'MultiErg',
      }

      const equipmentName = equipmentNames[result.type] || result.type

      activities.push({
        id: result.id,
        source: 'concept2',
        name: result.workoutType
          ? `${equipmentName} - ${result.workoutType}`
          : equipmentName,
        type: result.mappedType || 'ROWING',
        date: result.date,
        duration: durationMin,
        distance: distanceKm,
        avgHR: result.avgHeartRate || undefined,
        maxHR: result.maxHeartRate || undefined,
        calories: result.calories || undefined,
        tss: result.tss || undefined,
        trimp: result.trimp || undefined,
        pace,
        notes: result.comments || undefined,
        concept2Id: result.concept2Id,
        strokeRate: result.strokeRate || undefined,
        equipmentType: result.type,
      })
    }

    // Process AI-generated WODs
    for (const wod of aiWods) {
      activities.push({
        id: wod.id,
        source: 'ai',
        name: wod.title,
        type: wod.primarySport || 'STRENGTH',
        date: wod.completedAt || wod.createdAt,
        duration: wod.actualDuration || wod.requestedDuration || undefined,
        completed: true,
        notes: wod.subtitle || undefined,
        sessionRPE: wod.sessionRPE || undefined,
      })
    }

    // Sort by date (newest first) and deduplicate
    activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    // Remove potential duplicates (same activity from different sources)
    const seen = new Set<string>()
    const deduplicated = activities.filter(activity => {
      const key = `${activity.date.toISOString().split('T')[0]}-${activity.type}-${activity.duration || 0}`
      if (seen.has(key) && activity.source === 'manual') {
        // Prefer synced activities over manual if similar
        return false
      }
      seen.add(key)
      return true
    })

    return NextResponse.json({
      success: true,
      activities: deduplicated.slice(0, limit),
      counts: {
        manual: manualLogs.length,
        strava: stravaActivities.length,
        garmin: dailyMetrics.reduce((sum, m) => {
          const fs = m.factorScores as { garminActivities?: unknown[] } | null
          return sum + (fs?.garminActivities?.length || 0)
        }, 0),
        concept2: concept2Results.length,
        ai: aiWods.length,
      },
    })
  } catch (error) {
    console.error('Error fetching integrated activities:', error)
    return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 500 })
  }
}

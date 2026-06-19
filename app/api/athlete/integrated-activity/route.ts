/**
 * Integrated Activity API
 *
 * Fetches combined activity data from:
 * - Manual workout logs (WorkoutLog)
 * - Strava synced activities (StravaActivity)
 * - Garmin synced activities (DailyMetrics.factorScores)
 * - Concept2 synced results (Concept2Result)
 * - Quick Erg sessions (QuickErgSession)
 * - Phone GPS run sessions (PhoneRunSession)
 * - AI-generated WODs (AIGeneratedWOD)
 *
 * Uses smart deduplication to prevent showing the same activity
 * multiple times when synced from different sources.
 *
 * Returns unified format for dashboard display.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { canAccessClient, getCurrentUser } from '@/lib/auth-utils'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'
import { logger } from '@/lib/logger'
import { getParsedWorkoutDistanceKm } from '@/lib/adhoc-workout/distance'
import type { ParsedWorkout } from '@/lib/adhoc-workout/types'
import {
  formatMachineName,
  inferActivityType,
  inferQuickErgMachineTypeFromDevice,
  type QuickErgMachineType,
} from '@/lib/quick-erg/session-summary'
import {
  deduplicateActivities,
  type NormalizedActivity,
  type ActivitySource,
} from '@/lib/training/activity-deduplication'

interface UnifiedActivity {
  id: string
  source: 'manual' | 'strava' | 'garmin' | 'concept2' | 'quickerg' | 'phonerun' | 'ai' | 'adhoc' | 'adhoc+garmin' | 'hybrid' | 'hybrid+garmin'
  name: string
  type: string
  sport?: string
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
  deviceModel?: string
  concept2Id?: number
  // Power/cadence (cycling, skiing, rowing)
  avgPower?: number // watts
  maxPower?: number // watts
  normalizedPower?: number // watts
  cadence?: number // rpm or spm
  // Concept2 specific
  strokeRate?: number
  equipmentType?: string
  // AI WOD specific
  sessionRPE?: number
  // Strength/hybrid details (for display)
  strengthExercises?: Array<{ exerciseName: string; sets: number; reps: number | string; weight?: number; weightString?: string }>
  hybridFormat?: string
  movements?: Array<{ name: string; reps?: number; weight?: number; distance?: number }>
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

function asQuickErgMachineKind(value?: string | null): 'bike' | 'rower' | null {
  return value === 'bike' || value === 'rower' ? value : null
}

function displayQuickErgMachineType(session: {
  machineType: QuickErgMachineType
  machineKind?: string | null
  deviceName?: string | null
}): QuickErgMachineType {
  return inferQuickErgMachineTypeFromDevice({
    currentMachineType: session.machineType,
    machineKind: asQuickErgMachineKind(session.machineKind),
    deviceName: session.deviceName,
  }) ?? session.machineType
}

export async function GET(request: NextRequest) {
  let locale: AppLocale = resolveRequestLocale(request)

  try {
    // Session cookie or mobile bearer token
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }

    locale = resolveRequestLocale(request, user.language)

    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')
    const days = parseInt(searchParams.get('days') || '14')
    const limit = parseInt(searchParams.get('limit') || '20')

    if (!clientId) {
      return NextResponse.json(
        { error: t(locale, 'clientId required', 'clientId krävs') },
        { status: 400 }
      )
    }

    // Verify access
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { userId: true, athleteAccount: { select: { userId: true } } },
    })

    if (!client) {
      return NextResponse.json(
        { error: t(locale, 'Client not found', 'Klienten hittades inte') },
        { status: 404 }
      )
    }

    const hasAccess = await canAccessClient(user.id, clientId)
    const athleteId = client.athleteAccount?.userId

    if (!hasAccess) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 403 })
    }

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Fetch all data sources in parallel
    const [manualLogs, stravaActivities, garminActivities, concept2Results, quickErgSessions, phoneRunSessions, aiWods, adHocWorkouts, hybridWorkoutLogs] = await Promise.all([
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

      // Garmin activities from GarminActivity model (Gap 5 fix)
      prisma.garminActivity.findMany({
        where: {
          clientId,
          startDate: { gte: startDate },
        },
        orderBy: { startDate: 'desc' },
        take: limit,
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

      // Direct Bluetooth erg sessions
      prisma.quickErgSession.findMany({
        where: {
          clientId,
          startedAt: { gte: startDate },
        },
        orderBy: { startedAt: 'desc' },
        take: limit,
      }),

      // Direct phone GPS run sessions
      prisma.phoneRunSession.findMany({
        where: {
          clientId,
          startedAt: { gte: startDate },
        },
        orderBy: { startedAt: 'desc' },
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

      // Ad-hoc workouts (confirmed only), include linked Garmin activity
      prisma.adHocWorkout.findMany({
        where: {
          athleteId: clientId,
          status: 'CONFIRMED',
          workoutDate: { gte: startDate },
        },
        include: {
          garminActivity: {
            select: {
              id: true,
              tss: true,
              averageHeartrate: true,
              maxHeartrate: true,
              duration: true,
              distance: true,
              calories: true,
              deviceName: true,
            },
          },
        },
        orderBy: { workoutDate: 'desc' },
        take: limit,
      }),

      // Hybrid focus-mode logs (completed only), include linked Garmin activity
      prisma.hybridWorkoutLog.findMany({
        where: {
          athleteId: clientId,
          status: 'COMPLETED',
          startedAt: { gte: startDate },
        },
        include: {
          workout: {
            select: {
              name: true,
              format: true,
              movements: {
                select: {
                  reps: true,
                  weightMale: true,
                  weightFemale: true,
                  distance: true,
                  exercise: {
                    select: {
                      name: true,
                    },
                  },
                },
                orderBy: { order: 'asc' },
              },
            },
          },
          garminActivity: {
            select: {
              id: true,
              tss: true,
              averageHeartrate: true,
              maxHeartrate: true,
              duration: true,
              distance: true,
              calories: true,
              deviceName: true,
            },
          },
        },
        orderBy: { startedAt: 'desc' },
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

    // Build set of Garmin activity IDs linked to app-side workouts (to skip in Garmin loop)
    const linkedGarminIds = new Set([
      ...adHocWorkouts
        .map((a) => a.garminActivityId)
        .filter((id): id is string => Boolean(id)),
      ...hybridWorkoutLogs
        .map((log) => log.garminActivityId)
        .filter((id): id is string => Boolean(id)),
    ])

    // Process Garmin activities from GarminActivity model (Gap 5 fix)
    for (const activity of garminActivities) {
      // Skip if this Garmin activity is linked to an ad-hoc workout (merged display handled there)
      if (linkedGarminIds.has(activity.id)) continue
      const durationMin = activity.duration ? Math.round(activity.duration / 60) : undefined
      const distanceKm = activity.distance ? activity.distance / 1000 : undefined

      // Calculate pace for running
      let pace: string | undefined
      if (activity.type?.toLowerCase().includes('running') && activity.averageSpeed && activity.averageSpeed > 0) {
        const paceMinPerKm = 1000 / (activity.averageSpeed * 60)
        const paceMin = Math.floor(paceMinPerKm)
        const paceSec = Math.round((paceMinPerKm - paceMin) * 60)
        pace = `${paceMin}:${paceSec.toString().padStart(2, '0')}`
      }

      // Calculate speed for cycling
      let speed: number | undefined
      if (activity.type?.toLowerCase().includes('cycling') && activity.averageSpeed) {
        speed = activity.averageSpeed * 3.6 // m/s to km/h
      }

      activities.push({
        id: activity.id,
        source: 'garmin',
        name: activity.name || activity.type || 'Garmin Activity',
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
        garminId: Number(activity.garminActivityId),
        deviceModel: activity.deviceName || undefined,
      })
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

    // Process direct Bluetooth erg sessions
    for (const session of quickErgSessions) {
      const machineType = displayQuickErgMachineType({
        machineType: session.machineType as QuickErgMachineType,
        machineKind: session.machineKind,
        deviceName: session.deviceName,
      })
      const isRower = machineType === 'CONCEPT2_ROW' || machineType === 'CONCEPT2_SKIERG'
      let pace: string | undefined

      if (isRower && session.avgPace500m && session.avgPace500m > 0) {
        const paceMin = Math.floor(session.avgPace500m / 60)
        const paceSec = Math.round(session.avgPace500m % 60)
        pace = `${paceMin}:${paceSec.toString().padStart(2, '0')}/500m`
      }

      activities.push({
        id: session.id,
        source: 'quickerg',
        name: formatMachineName(machineType),
        type: inferActivityType(machineType),
        date: session.startedAt,
        duration: Math.round(session.durationSec / 60),
        distance: session.distanceMeters ? session.distanceMeters / 1000 : undefined,
        avgHR: session.avgHeartRate || undefined,
        maxHR: session.maxHeartRate || undefined,
        calories: session.calories || undefined,
        pace,
        avgPower: session.avgPower || undefined,
        maxPower: session.maxPower || undefined,
        normalizedPower: session.normalizedPower || undefined,
        cadence: session.avgCadence || session.avgStrokeRate || undefined,
        completed: true,
        notes: session.notes || undefined,
        deviceModel: session.deviceName || undefined,
        equipmentType: machineType,
      })
    }

    // Process direct phone GPS run sessions
    for (const session of phoneRunSessions) {
      const pace = session.avgPaceSecPerKm && session.avgPaceSecPerKm > 0
        ? `${Math.floor(session.avgPaceSecPerKm / 60)}:${String(Math.round(session.avgPaceSecPerKm % 60)).padStart(2, '0')}`
        : undefined

      activities.push({
        id: session.id,
        source: 'phonerun',
        name: t(locale, 'Phone run', 'Telefonlopning'),
        type: 'RUNNING',
        date: session.startedAt,
        duration: Math.round(session.durationSec / 60),
        distance: session.distanceMeters / 1000,
        avgHR: session.avgHeartRate || undefined,
        maxHR: session.maxHeartRate || undefined,
        pace,
        speed: session.avgSpeedMps ? session.avgSpeedMps * 3.6 : undefined,
        elevationGain: session.elevationGainMeters || undefined,
        completed: true,
        notes: session.notes || undefined,
        deviceModel: session.deviceName || undefined,
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

    // Process confirmed ad-hoc workouts (merge with linked Garmin data when available)
    for (const adhoc of adHocWorkouts) {
      // Extract data from parsedStructure
      const parsed = adhoc.parsedStructure as ParsedWorkout | null
      const garmin = adhoc.garminActivity

      // Build workout name
      let workoutName = adhoc.workoutName || parsed?.name
      if (!workoutName) {
        const type = adhoc.parsedType || parsed?.type || 'OTHER'
        const sport = parsed?.sport
        workoutName = sport ? `${sport} ${type}` : type
      }

      // Convert avgPace from seconds/km (number) to "M:SS" string
      let adhocPace: string | undefined
      if (parsed?.avgPace && typeof parsed.avgPace === 'number' && parsed.avgPace > 0) {
        const paceMin = Math.floor(parsed.avgPace / 60)
        const paceSec = Math.round(parsed.avgPace % 60)
        adhocPace = `${paceMin}:${paceSec.toString().padStart(2, '0')}`
      } else if (parsed?.avgPace && typeof parsed.avgPace === 'string') {
        adhocPace = parsed.avgPace as unknown as string
      }

      // When linked to Garmin, prefer sensor data for metrics
      const mergedDuration = garmin?.duration ? Math.round(garmin.duration / 60) : parsed?.duration || undefined
      const mergedDistance = garmin?.distance ? garmin.distance / 1000 : getParsedWorkoutDistanceKm(parsed) || undefined
      const mergedAvgHR = garmin?.averageHeartrate || parsed?.avgHeartRate || undefined
      const mergedMaxHR = garmin?.maxHeartrate || parsed?.maxHeartRate || undefined
      const mergedCalories = garmin?.calories || parsed?.estimatedCalories || undefined
      const mergedTSS = garmin?.tss || undefined

      activities.push({
        id: adhoc.id,
        source: garmin ? 'adhoc+garmin' : 'adhoc',
        name: workoutName,
        type: adhoc.parsedType || parsed?.type || 'OTHER',
        sport: parsed?.sport || undefined,
        date: adhoc.workoutDate,
        duration: mergedDuration,
        distance: mergedDistance,
        avgHR: mergedAvgHR,
        maxHR: mergedMaxHR,
        calories: mergedCalories,
        tss: mergedTSS,
        pace: adhocPace,
        speed: parsed?.avgSpeed || undefined,
        elevationGain: parsed?.elevationGain || undefined,
        avgPower: parsed?.avgPower || undefined,
        maxPower: parsed?.maxPower || undefined,
        normalizedPower: parsed?.normalizedPower || undefined,
        cadence: parsed?.cadence || undefined,
        completed: true,
        notes: parsed?.notes || undefined,
        strengthExercises: parsed?.strengthExercises?.map(e => ({
          exerciseName: e.exerciseName,
          sets: e.sets,
          reps: e.reps,
          weight: e.weight,
          weightString: e.weightString,
        })) || undefined,
        hybridFormat: parsed?.hybridFormat || undefined,
        movements: parsed?.movements?.map(m => ({
          name: m.name,
          reps: m.reps,
          weight: m.weight,
          distance: m.distance,
        })) || undefined,
        deviceModel: garmin?.deviceName || undefined,
      })
    }

    // Process completed hybrid focus logs (merge with linked Garmin data when available)
    for (const log of hybridWorkoutLogs) {
      const garmin = log.garminActivity
      const durationMin = garmin?.duration
        ? Math.round(garmin.duration / 60)
        : log.totalTime
          ? Math.round(log.totalTime / 60)
          : undefined
      const estimatedTSS = log.totalTime
        ? Math.round((log.totalTime / 60) * ((log.sessionRPE || 7) / 10) * 1.1)
        : undefined

      activities.push({
        id: log.id,
        source: garmin ? 'hybrid+garmin' : 'hybrid',
        name: log.workout?.name || t(locale, 'Hybrid workout', 'Hybridpass'),
        type: 'HYBRID',
        date: log.completedAt || log.startedAt,
        duration: durationMin,
        distance: garmin?.distance ? garmin.distance / 1000 : undefined,
        avgHR: garmin?.averageHeartrate || undefined,
        maxHR: garmin?.maxHeartrate || undefined,
        calories: garmin?.calories || undefined,
        tss: garmin?.tss || estimatedTSS,
        completed: true,
        notes: log.notes || undefined,
        sessionRPE: log.sessionRPE || undefined,
        hybridFormat: log.workout?.format || undefined,
        movements: log.workout?.movements.map((movement) => ({
          name: movement.exercise.name,
          reps: movement.reps || undefined,
          weight: movement.weightMale ?? movement.weightFemale ?? undefined,
          distance: movement.distance || undefined,
        })) || undefined,
        deviceModel: garmin?.deviceName || undefined,
      })
    }

    // Sort by date (newest first)
    activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    // Create normalized activities for deduplication
    const normalizedActivities: NormalizedActivity[] = activities.map(activity => ({
      id: activity.id,
      source: (activity.source === 'adhoc+garmin' ? 'adhoc' : activity.source === 'hybrid+garmin' ? 'hybrid' : activity.source) as ActivitySource,
      date: new Date(activity.date),
      startTime: new Date(activity.date),
      duration: (activity.duration || 0) * 60, // Convert to seconds
      type: activity.type,
      distance: activity.distance ? activity.distance * 1000 : undefined, // Convert km to meters
      tss: activity.tss,
      trimp: activity.trimp,
      avgHR: activity.avgHR,
    }))

    // Deduplicate using smart matching algorithm
    const { deduplicated: deduplicatedNormalized, duplicatesRemoved, matchedPairs } = deduplicateActivities(
      normalizedActivities,
      { debug: process.env.NODE_ENV === 'development' }
    )

    // Get IDs of kept activities
    const keptIds = new Set(deduplicatedNormalized.map(a => a.id))

    // Filter original activities to only kept ones
    const deduplicated = activities.filter(a => keptIds.has(a.id))

    // Log deduplication results in development
    if (process.env.NODE_ENV === 'development' && duplicatesRemoved > 0) {
      logger.debug('Integrated activity deduplication', {
        duplicatesRemoved,
        matchedPairsCount: matchedPairs.length,
      })
    }

    return NextResponse.json({
      success: true,
      activities: deduplicated.slice(0, limit),
      counts: {
        manual: manualLogs.length,
        strava: stravaActivities.length,
        garmin: garminActivities.length,
        concept2: concept2Results.length,
        quickerg: quickErgSessions.length,
        phonerun: phoneRunSessions.length,
        ai: aiWods.length,
        adhoc: adHocWorkouts.length,
        hybrid: hybridWorkoutLogs.length,
      },
      deduplication: {
        totalBeforeDedup: activities.length,
        duplicatesRemoved,
        totalAfterDedup: deduplicated.length,
      },
    })
  } catch (error) {
    logger.error('Error fetching integrated activities', {}, error)
    return NextResponse.json(
      { error: t(locale, 'Failed to fetch activities', 'Kunde inte hämta aktiviteter') },
      { status: 500 }
    )
  }
}

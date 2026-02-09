/**
 * Strava Activity Import API
 *
 * POST /api/adhoc-workouts/import/strava - Import a Strava activity as ad-hoc workout
 * GET /api/adhoc-workouts/import/strava - List available Strava activities to import
 */

import { NextRequest, NextResponse } from 'next/server'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { parseWorkoutFromStrava } from '@/lib/adhoc-workout'
import type { StravaActivityImport } from '@/lib/adhoc-workout/types'
import { logger } from '@/lib/logger'

// ============================================
// GET - List Available Strava Activities
// ============================================

export async function GET(request: NextRequest) {
  try {
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    const { clientId } = resolved

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)
    const offset = parseInt(searchParams.get('offset') || '0')

    // Get Strava activities that haven't been imported yet
    const stravaActivities = await prisma.stravaActivity.findMany({
      where: {
        clientId: clientId,
      },
      orderBy: { startDate: 'desc' },
      take: limit,
      skip: offset,
      select: {
        id: true,
        stravaId: true,
        name: true,
        type: true,
        startDate: true,
        distance: true,
        movingTime: true,
        elevationGain: true,
        averageHeartrate: true,
        maxHeartrate: true,
        averageWatts: true,
        calories: true,
      },
    })

    // Check which ones have already been imported as ad-hoc workouts
    const existingImports = await prisma.adHocWorkout.findMany({
      where: {
        athleteId: clientId,
        inputType: 'STRAVA_IMPORT',
      },
      select: {
        rawInputMetadata: true,
      },
    })

    const importedActivityIds = new Set(
      existingImports
        .map((i) => (i.rawInputMetadata as { activityId?: string })?.activityId)
        .filter(Boolean)
    )

    // Transform and mark already imported
    const activities = stravaActivities.map((a) => ({
      id: a.id,
      stravaId: a.stravaId,
      name: a.name,
      type: a.type,
      startDate: a.startDate.toISOString(),
      distance: a.distance,
      movingTime: a.movingTime,
      elevationGain: a.elevationGain,
      averageHeartrate: a.averageHeartrate,
      maxHeartrate: a.maxHeartrate,
      averageWatts: a.averageWatts,
      calories: a.calories,
      alreadyImported: importedActivityIds.has(a.stravaId),
    }))

    return NextResponse.json({
      success: true,
      data: {
        activities,
        total: stravaActivities.length,
      },
    })
  } catch (error) {
    console.error('Error listing Strava activities:', error)

    if (error instanceof Error && error.message.includes('Access denied')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json(
      { success: false, error: 'Failed to list Strava activities' },
      { status: 500 }
    )
  }
}

// ============================================
// POST - Import Strava Activity
// ============================================

export async function POST(request: NextRequest) {
  try {
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    const { clientId } = resolved

    // Parse request body
    const body = await request.json()
    const { stravaActivityId } = body

    if (!stravaActivityId) {
      return NextResponse.json(
        { success: false, error: 'stravaActivityId is required' },
        { status: 400 }
      )
    }

    // Get the Strava activity
    const stravaActivity = await prisma.stravaActivity.findFirst({
      where: {
        clientId: clientId,
        stravaId: stravaActivityId,
      },
    })

    if (!stravaActivity) {
      return NextResponse.json(
        { success: false, error: 'Strava activity not found' },
        { status: 404 }
      )
    }

    // Check if already imported
    const existingImport = await prisma.adHocWorkout.findFirst({
      where: {
        athleteId: clientId,
        inputType: 'STRAVA_IMPORT',
        rawInputMetadata: {
          path: ['activityId'],
          equals: stravaActivityId,
        },
      },
    })

    if (existingImport) {
      return NextResponse.json({
        success: true,
        data: {
          id: existingImport.id,
          status: existingImport.status,
        },
        message: 'Activity already imported',
      })
    }

    // Convert to our import format
    const importData: StravaActivityImport = {
      id: stravaActivity.stravaId,
      name: stravaActivity.name,
      type: stravaActivity.type,
      startDate: stravaActivity.startDate.toISOString(),
      distance: stravaActivity.distance || 0,
      movingTime: stravaActivity.movingTime || 0,
      elapsedTime: stravaActivity.elapsedTime || 0,
      elevationGain: stravaActivity.elevationGain || 0,
      averageSpeed: stravaActivity.averageSpeed || 0,
      maxSpeed: stravaActivity.maxSpeed || 0,
      averageHeartrate: stravaActivity.averageHeartrate || undefined,
      maxHeartrate: stravaActivity.maxHeartrate || undefined,
      averageWatts: stravaActivity.averageWatts || undefined,
      kilojoules: stravaActivity.kilojoules || undefined,
      calories: stravaActivity.calories || undefined,
    }

    // Parse the activity (no AI needed - direct mapping)
    const parsedWorkout = await parseWorkoutFromStrava(importData)

    // Create ad-hoc workout entry
    const adHocWorkout = await prisma.adHocWorkout.create({
      data: {
        athleteId: clientId,
        inputType: 'STRAVA_IMPORT',
        workoutDate: stravaActivity.startDate,
        workoutName: stravaActivity.name,
        rawInputMetadata: {
          source: 'strava',
          activityId: stravaActivityId,
          activityData: importData as unknown as Prisma.InputJsonValue,
        } as Prisma.InputJsonValue,
        status: 'READY_FOR_REVIEW',
        parsedType: parsedWorkout.type === 'CARDIO' ? 'RUNNING' : 'OTHER',
        parsedStructure: parsedWorkout as unknown as Prisma.InputJsonValue,
        parsingModel: 'Direct Strava Import',
        parsingConfidence: parsedWorkout.confidence,
      },
    })

    logger.info('Strava activity imported', {
      athleteId: clientId,
      stravaActivityId,
      adHocWorkoutId: adHocWorkout.id,
    })

    return NextResponse.json({
      success: true,
      data: {
        id: adHocWorkout.id,
        status: adHocWorkout.status,
        parsedStructure: parsedWorkout,
      },
    })
  } catch (error) {
    console.error('Error importing Strava activity:', error)

    if (error instanceof Error && error.message.includes('Access denied')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json(
      { success: false, error: 'Failed to import Strava activity' },
      { status: 500 }
    )
  }
}

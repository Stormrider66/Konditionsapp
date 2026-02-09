/**
 * Garmin Activity Import API
 *
 * POST /api/adhoc-workouts/import/garmin - Import a Garmin activity as ad-hoc workout
 * GET /api/adhoc-workouts/import/garmin - List available Garmin activities to import
 */

import { NextRequest, NextResponse } from 'next/server'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { parseWorkoutFromGarmin } from '@/lib/adhoc-workout'
import type { GarminActivityImport } from '@/lib/adhoc-workout/types'
import { logger } from '@/lib/logger'

// ============================================
// GET - List Available Garmin Activities
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

    // Get Garmin activities
    const garminActivities = await prisma.garminActivity.findMany({
      where: {
        clientId: clientId,
      },
      orderBy: { startDate: 'desc' },
      take: limit,
      skip: offset,
      select: {
        id: true,
        garminActivityId: true,
        name: true,
        type: true,
        startDate: true,
        duration: true,
        distance: true,
        elevationGain: true,
        averageHeartrate: true,
        maxHeartrate: true,
        calories: true,
        trainingEffect: true,
        anaerobicEffect: true,
      },
    })

    // Check which ones have already been imported as ad-hoc workouts
    const existingImports = await prisma.adHocWorkout.findMany({
      where: {
        athleteId: clientId,
        inputType: 'GARMIN_IMPORT',
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
    const activities = garminActivities.map((a) => ({
      id: a.id,
      activityId: a.garminActivityId.toString(),
      activityName: a.name,
      activityType: a.type,
      startTime: a.startDate.toISOString(),
      duration: a.duration,
      distance: a.distance,
      elevationGain: a.elevationGain,
      averageHR: a.averageHeartrate,
      maxHR: a.maxHeartrate,
      calories: a.calories,
      trainingEffect: a.trainingEffect,
      anaerobicEffect: a.anaerobicEffect,
      alreadyImported: importedActivityIds.has(a.garminActivityId.toString()),
    }))

    return NextResponse.json({
      success: true,
      data: {
        activities,
        total: garminActivities.length,
      },
    })
  } catch (error) {
    console.error('Error listing Garmin activities:', error)

    if (error instanceof Error && error.message.includes('Access denied')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json(
      { success: false, error: 'Failed to list Garmin activities' },
      { status: 500 }
    )
  }
}

// ============================================
// POST - Import Garmin Activity
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
    const { garminActivityId } = body

    if (!garminActivityId) {
      return NextResponse.json(
        { success: false, error: 'garminActivityId is required' },
        { status: 400 }
      )
    }

    // Get the Garmin activity - garminActivityId is BigInt, so we need to handle string/bigint conversion
    const garminActivity = await prisma.garminActivity.findFirst({
      where: {
        clientId: clientId,
        garminActivityId: BigInt(garminActivityId),
      },
    })

    if (!garminActivity) {
      return NextResponse.json(
        { success: false, error: 'Garmin activity not found' },
        { status: 404 }
      )
    }

    // Check if already imported
    const existingImport = await prisma.adHocWorkout.findFirst({
      where: {
        athleteId: clientId,
        inputType: 'GARMIN_IMPORT',
        rawInputMetadata: {
          path: ['activityId'],
          equals: garminActivityId,
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
    const importData: GarminActivityImport = {
      activityId: garminActivity.garminActivityId.toString(),
      activityName: garminActivity.name || 'Garmin Activity',
      activityType: garminActivity.type || 'other',
      startTimeLocal: garminActivity.startDate.toISOString(),
      duration: garminActivity.duration || 0,
      distance: garminActivity.distance || 0,
      elevationGain: garminActivity.elevationGain || 0,
      averageHR: garminActivity.averageHeartrate || undefined,
      maxHR: garminActivity.maxHeartrate || undefined,
      averageSpeed: garminActivity.averageSpeed || undefined,
      calories: garminActivity.calories || undefined,
      trainingEffect: garminActivity.trainingEffect || undefined,
      anaerobicEffect: garminActivity.anaerobicEffect || undefined,
    }

    // Parse the activity (no AI needed - direct mapping)
    const parsedWorkout = await parseWorkoutFromGarmin(importData)

    // Create ad-hoc workout entry
    const adHocWorkout = await prisma.adHocWorkout.create({
      data: {
        athleteId: clientId,
        inputType: 'GARMIN_IMPORT',
        workoutDate: garminActivity.startDate,
        workoutName: garminActivity.name || 'Garmin Activity',
        rawInputMetadata: {
          source: 'garmin',
          activityId: garminActivityId,
          activityData: importData as unknown as Prisma.InputJsonValue,
        } as Prisma.InputJsonValue,
        status: 'READY_FOR_REVIEW',
        parsedType: parsedWorkout.type === 'CARDIO' ? 'RUNNING' : 'OTHER',
        parsedStructure: parsedWorkout as unknown as Prisma.InputJsonValue,
        parsingModel: 'Direct Garmin Import',
        parsingConfidence: parsedWorkout.confidence,
      },
    })

    logger.info('Garmin activity imported', {
      athleteId: clientId,
      garminActivityId,
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
    console.error('Error importing Garmin activity:', error)

    if (error instanceof Error && error.message.includes('Access denied')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json(
      { success: false, error: 'Failed to import Garmin activity' },
      { status: 500 }
    )
  }
}

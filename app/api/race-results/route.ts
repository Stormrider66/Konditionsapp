// app/api/race-results/route.ts
// CRUD endpoints for race results and VDOT calculation

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { calculateVDOTFromRace, type VDOTResult } from '@/lib/training-engine/calculations/vdot'
import { logger } from '@/lib/logger'

/**
 * POST /api/race-results
 * Create new race result with automatic VDOT calculation
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()

    const {
      clientId,
      raceName,
      raceDate,
      distance,
      customDistanceKm,
      timeMinutes,
      timeFormatted,
      temperature,
      humidity,
      windSpeed,
      elevation,
      terrain,
      goalTime,
      goalAchieved,
      raceType,
      avgHeartRate,
      maxHeartRate,
      avgPace,
      splits,
      conditions,
      athleteNotes,
      coachNotes,
      usedForZones,
    } = body

    // Validate required fields
    if (!clientId || !raceDate || !distance || !timeMinutes) {
      return NextResponse.json(
        { error: 'Missing required fields: clientId, raceDate, distance, timeMinutes' },
        { status: 400 }
      )
    }

    // Get client data for age and gender
    const client = await prisma.client.findUnique({
      where: { id: clientId },
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Calculate age at race date
    const raceDateObj = new Date(raceDate)
    const birthDate = new Date(client.birthDate)
    const ageAtRace = Math.floor(
      (raceDateObj.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
    )

    // Calculate VDOT
    const vdotResult = calculateVDOTFromRace(
      distance as '5K' | '10K' | 'HALF_MARATHON' | 'MARATHON' | 'CUSTOM',
      timeMinutes,
      customDistanceKm,
      raceDateObj,
      ageAtRace,
      client.gender as 'MALE' | 'FEMALE'
    )

    // Calculate age in days (for confidence decay)
    const now = new Date()
    const ageInDays = Math.floor(
      (now.getTime() - raceDateObj.getTime()) / (1000 * 60 * 60 * 24)
    )

    // Create race result
    const raceResult = await prisma.raceResult.create({
      data: {
        clientId,
        raceName,
        raceDate: raceDateObj,
        distance,
        customDistanceKm,
        timeMinutes,
        timeFormatted: timeFormatted || formatTime(timeMinutes),
        temperature,
        humidity,
        windSpeed,
        elevation,
        terrain,
        vdot: vdotResult.vdot,
        vdotAdjusted: vdotResult.vdot, // Same if adjustments applied
        confidence: vdotResult.confidence,
        ageInDays,
        trainingPaces: vdotResult.trainingPaces as Prisma.InputJsonValue,
        equivalentTimes: vdotResult.equivalentTimes as Prisma.InputJsonValue,
        goalTime,
        goalAchieved: goalAchieved || false,
        raceType,
        avgHeartRate,
        maxHeartRate,
        avgPace,
        splits,
        conditions,
        athleteNotes,
        coachNotes,
        usedForZones: usedForZones || false,
      },
    })

    // If this race should be used for zones, update athlete profile
    if (usedForZones) {
      await updateAthleteProfileFromRace(clientId, raceResult.id, vdotResult)
    }

    return NextResponse.json(raceResult, { status: 201 })
  } catch (error) {
    logger.error('Error creating race result', {}, error)
    return NextResponse.json(
      {
        error: 'Internal server error',
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
 * GET /api/race-results?clientId=xxx
 * List all race results for a client
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const clientId = searchParams.get('clientId')

    if (!clientId) {
      return NextResponse.json({ error: 'clientId required' }, { status: 400 })
    }

    const raceResults = await prisma.raceResult.findMany({
      where: { clientId },
      orderBy: { raceDate: 'desc' },
      include: {
        client: {
          select: {
            name: true,
            gender: true,
            birthDate: true,
          },
        },
      },
    })

    // Update ageInDays for each result
    const now = new Date()
    const updatedResults = raceResults.map((result) => ({
      ...result,
      ageInDays: Math.floor(
        (now.getTime() - new Date(result.raceDate).getTime()) / (1000 * 60 * 60 * 24)
      ),
    }))

    return NextResponse.json(updatedResults)
  } catch (error) {
    logger.error('Error fetching race results', {}, error)
    return NextResponse.json(
      {
        error: 'Internal server error',
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
 * Helper: Format time in minutes to HH:MM:SS or MM:SS
 */
function formatTime(timeMinutes: number): string {
  const hours = Math.floor(timeMinutes / 60)
  const minutes = Math.floor(timeMinutes % 60)
  const seconds = Math.round((timeMinutes % 1) * 60)

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  } else {
    return `${minutes}:${String(seconds).padStart(2, '0')}`
  }
}

/**
 * Helper: Update athlete profile with race-based VDOT
 */
async function updateAthleteProfileFromRace(
  clientId: string,
  raceResultId: string,
  vdotResult: VDOTResult
) {
  // Get or create athlete profile
  let profile = await prisma.athleteProfile.findUnique({
    where: { clientId },
  })

  if (!profile) {
    // Create new profile
    profile = await prisma.athleteProfile.create({
      data: {
        clientId,
        category: 'RECREATIONAL', // Will be updated by classification
        currentVDOT: vdotResult.vdot,
        vdotSource: 'RACE_PERFORMANCE',
        vdotConfidence: vdotResult.confidence,
        vdotLastUpdated: new Date(),
        vdotAgeAdjusted: vdotResult.adjustments.ageAdjusted,
        vdotGenderAdjusted: vdotResult.adjustments.genderAdjusted,
        danielsZones: vdotResult.trainingPaces as Prisma.InputJsonValue,
        zonesLastUpdated: new Date(),
        zonesPrimarySource: 'VDOT',
      },
    })
  } else {
    // Update existing profile
    await prisma.athleteProfile.update({
      where: { clientId },
      data: {
        currentVDOT: vdotResult.vdot,
        vdotSource: 'RACE_PERFORMANCE',
        vdotConfidence: vdotResult.confidence,
        vdotLastUpdated: new Date(),
        vdotAgeAdjusted: vdotResult.adjustments.ageAdjusted,
        vdotGenderAdjusted: vdotResult.adjustments.genderAdjusted,
        danielsZones: vdotResult.trainingPaces as Prisma.InputJsonValue,
        zonesLastUpdated: new Date(),
        zonesPrimarySource: 'VDOT',
      },
    })
  }

  // Mark other race results as not used for zones
  await prisma.raceResult.updateMany({
    where: {
      clientId,
      id: { not: raceResultId },
    },
    data: {
      usedForZones: false,
    },
  })

  return profile
}

// app/api/race-results/[id]/route.ts
// Individual race result operations

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { calculateVDOTFromRace } from '@/lib/training-engine/calculations/vdot'
import { logger } from '@/lib/logger'

/**
 * GET /api/race-results/[id]
 * Get single race result by ID
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const raceResult = await prisma.raceResult.findFirst({
      where: {
        id,
        client: {
          OR: [
            { userId: user.id }, // coach
            { athleteAccount: { userId: user.id } }, // athlete
          ],
        },
      },
      include: {
        client: {
          select: {
            name: true,
            gender: true,
            birthDate: true,
            email: true,
          },
        },
      },
    })

    if (!raceResult) {
      return NextResponse.json({ error: 'Race result not found' }, { status: 404 })
    }

    // Update ageInDays
    const now = new Date()
    const ageInDays = Math.floor(
      (now.getTime() - new Date(raceResult.raceDate).getTime()) / (1000 * 60 * 60 * 24)
    )

    return NextResponse.json({
      ...raceResult,
      ageInDays,
    })
  } catch (error) {
    logger.error('Error fetching race result', {}, error)
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
 * PUT /api/race-results/[id]
 * Update race result and recalculate VDOT if time/distance changed
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()

    // Get existing race result
    const existingResult = await prisma.raceResult.findFirst({
      where: {
        id,
        client: {
          OR: [
            { userId: user.id }, // coach
            { athleteAccount: { userId: user.id } }, // athlete
          ],
        },
      },
      include: {
        client: true,
      },
    })

    if (!existingResult) {
      return NextResponse.json({ error: 'Race result not found' }, { status: 404 })
    }

    // Check if distance or time changed (requires VDOT recalculation)
    const needsRecalculation =
      (body.distance && body.distance !== existingResult.distance) ||
      (body.timeMinutes && body.timeMinutes !== existingResult.timeMinutes) ||
      (body.customDistanceKm && body.customDistanceKm !== existingResult.customDistanceKm)

    let vdotResult: any = null
    if (needsRecalculation) {
      // Recalculate VDOT
      const raceDateObj = body.raceDate ? new Date(body.raceDate) : new Date(existingResult.raceDate)
      const birthDate = new Date(existingResult.client.birthDate)
      const ageAtRace = Math.floor(
        (raceDateObj.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
      )

      vdotResult = calculateVDOTFromRace(
        (body.distance || existingResult.distance) as '5K' | '10K' | 'HALF_MARATHON' | 'MARATHON' | 'CUSTOM',
        body.timeMinutes || existingResult.timeMinutes,
        body.customDistanceKm || existingResult.customDistanceKm,
        raceDateObj,
        ageAtRace,
        existingResult.client.gender as 'MALE' | 'FEMALE'
      )
    }

    // Update race result
    const updatedResult = await prisma.raceResult.update({
      where: { id },
      data: {
        raceName: body.raceName,
        raceDate: body.raceDate ? new Date(body.raceDate) : undefined,
        distance: body.distance,
        customDistanceKm: body.customDistanceKm,
        timeMinutes: body.timeMinutes,
        timeFormatted: body.timeFormatted,
        temperature: body.temperature,
        humidity: body.humidity,
        windSpeed: body.windSpeed,
        elevation: body.elevation,
        terrain: body.terrain,
        vdot: vdotResult?.vdot,
        vdotAdjusted: vdotResult?.vdot,
        confidence: vdotResult?.confidence,
        trainingPaces: vdotResult?.trainingPaces as any,
        equivalentTimes: vdotResult?.equivalentTimes as any,
        goalTime: body.goalTime,
        goalAchieved: body.goalAchieved,
        raceType: body.raceType,
        avgHeartRate: body.avgHeartRate,
        maxHeartRate: body.maxHeartRate,
        avgPace: body.avgPace,
        splits: body.splits,
        conditions: body.conditions,
        athleteNotes: body.athleteNotes,
        coachNotes: body.coachNotes,
        usedForZones: body.usedForZones,
      },
    })

    // If usedForZones changed to true, update athlete profile
    if (body.usedForZones && !existingResult.usedForZones && vdotResult) {
      await updateAthleteProfileFromRace(
        existingResult.clientId,
        id,
        vdotResult
      )
    }

    return NextResponse.json(updatedResult)
  } catch (error) {
    logger.error('Error updating race result', {}, error)
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
 * DELETE /api/race-results/[id]
 * Delete race result
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if race exists
    const raceResult = await prisma.raceResult.findFirst({
      where: {
        id,
        client: {
          OR: [
            { userId: user.id }, // coach
            { athleteAccount: { userId: user.id } }, // athlete
          ],
        },
      },
    })

    if (!raceResult) {
      return NextResponse.json({ error: 'Race result not found' }, { status: 404 })
    }

    // If this race was used for zones, warn or prevent deletion
    if (raceResult.usedForZones) {
      return NextResponse.json(
        {
          error: 'Cannot delete race result that is currently used for training zones',
          message: 'Please select a different race for zones first, or set usedForZones to false'
        },
        { status: 400 }
      )
    }

    // Delete race result
    await prisma.raceResult.delete({
      where: { id },
    })

    return NextResponse.json({ success: true, message: 'Race result deleted' })
  } catch (error) {
    logger.error('Error deleting race result', {}, error)
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
 * Helper: Update athlete profile with race-based VDOT
 */
async function updateAthleteProfileFromRace(
  clientId: string,
  raceResultId: string,
  vdotResult: any
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
        danielsZones: vdotResult.trainingPaces as any,
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
        danielsZones: vdotResult.trainingPaces as any,
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

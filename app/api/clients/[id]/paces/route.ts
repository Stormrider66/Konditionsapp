// app/api/clients/[id]/paces/route.ts
// Calculate optimal training paces using comprehensive pace selector

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { selectOptimalPaces, type RacePerformance, type AthleteProfileData, type LactateTestData } from '@/lib/training-engine/calculations/pace-selector'
import { logger } from '@/lib/logger'

/**
 * GET /api/clients/[id]/paces
 * Calculate optimal training paces from all available data sources
 *
 * Priority hierarchy:
 * 1. Recent race performance → VDOT
 * 2. Lactate test → Individual ratio method
 * 3. HR-based estimation
 * 4. Profile estimation
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: clientId } = await params

    // Get client data
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        athleteProfile: true,
      },
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Calculate age
    const birthDate = new Date(client.birthDate)
    const now = new Date()
    const age = Math.floor(
      (now.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
    )

    // Build athlete profile data
    const profileData: AthleteProfileData = {
      age,
      gender: client.gender as 'MALE' | 'FEMALE',
      weeklyKm: client.athleteProfile?.typicalWeeklyKm || 50,
      trainingAge: client.athleteProfile?.yearsRunning || 2,
      restingHR: client.athleteProfile?.rhrBaseline ?? undefined,
      maxHR: undefined, // Will be set from test if available
    }

    // Get race performances (most recent 5)
    const raceResults = await prisma.raceResult.findMany({
      where: { clientId },
      orderBy: { raceDate: 'desc' },
      take: 5,
    })

    const races: RacePerformance[] = raceResults.map((race) => ({
      distance: race.distance as '5K' | '10K' | 'HALF_MARATHON' | 'MARATHON' | 'CUSTOM',
      timeMinutes: race.timeMinutes,
      customDistanceKm: race.customDistanceKm || undefined,
      date: new Date(race.raceDate),
      age,
      gender: client.gender as 'MALE' | 'FEMALE',
    }))

    // Get most recent lactate test (from Test model)
    const latestTest = await prisma.test.findFirst({
      where: {
        clientId,
        testType: 'RUNNING',
      },
      orderBy: { testDate: 'desc' },
      include: {
        testStages: {
          orderBy: { sequence: 'asc' },
        },
      },
    })

    let lactateTest: LactateTestData | undefined = undefined
    if (latestTest && latestTest.testStages.length >= 4) {
      // Check if we have lactate data
      const hasLactate = latestTest.testStages.some((stage) => stage.lactate > 0)

      if (hasLactate && latestTest.maxHR) {
        lactateTest = {
          testStages: latestTest.testStages.map((stage) => ({
            sequence: stage.sequence,
            speed: stage.speed || 0,
            heartRate: stage.heartRate,
            lactate: stage.lactate,
          })),
          maxHR: latestTest.maxHR,
        }

        // Set maxHR for profile if available
        if (latestTest.maxHR) {
          profileData.maxHR = latestTest.maxHR
        }
      }
    }

    // Call pace selector
    const paceSelection = selectOptimalPaces(
      profileData,
      races.length > 0 ? races : undefined,
      lactateTest
    )

    // Update athlete profile with calculated paces (if not already done)
    if (client.athleteProfile) {
      await prisma.athleteProfile.update({
        where: { clientId },
        data: {
          currentVDOT: paceSelection.vdotResult?.vdot,
          vdotConfidence: paceSelection.vdotResult?.confidence,
          vdotLastUpdated: paceSelection.vdotResult ? new Date() : undefined,
          maxLactate: paceSelection.lactateProfile?.maxLactate,
          lt2LactateRatio: paceSelection.lactateProfile?.lt2Ratio,
          lt2Speed: paceSelection.lactateProfile?.lt2.speed,
          lt2HeartRate: paceSelection.lactateProfile?.lt2.heartRate,
          lactateTestDate: lactateTest ? latestTest?.testDate : undefined,
          lactateConfidence: paceSelection.lactateProfile?.confidence,
          metabolicType: paceSelection.athleteClassification.metabolicType,
          metabolicTypeSource: paceSelection.lactateProfile ? 'LACTATE_PROFILE' : 'ESTIMATED',
          compressionFactor: paceSelection.athleteClassification.compressionFactor,
          danielsZones: paceSelection.zones.daniels as unknown as Prisma.InputJsonValue,
          canovaZones: paceSelection.zones.canova as unknown as Prisma.InputJsonValue,
          norwegianZones: paceSelection.zones.norwegian as unknown as Prisma.InputJsonValue,
          hrZones: paceSelection.zones.hrBased as unknown as Prisma.InputJsonValue,
          zonesLastUpdated: new Date(),
          zonesPrimarySource: paceSelection.primarySource,
          category: paceSelection.athleteClassification.level,
        },
      })
    } else {
      // Create athlete profile if doesn't exist
      await prisma.athleteProfile.create({
        data: {
          clientId,
          category: paceSelection.athleteClassification.level,
          currentVDOT: paceSelection.vdotResult?.vdot,
          vdotConfidence: paceSelection.vdotResult?.confidence,
          vdotLastUpdated: paceSelection.vdotResult ? new Date() : undefined,
          maxLactate: paceSelection.lactateProfile?.maxLactate,
          lt2LactateRatio: paceSelection.lactateProfile?.lt2Ratio,
          lt2Speed: paceSelection.lactateProfile?.lt2.speed,
          lt2HeartRate: paceSelection.lactateProfile?.lt2.heartRate,
          lactateTestDate: lactateTest ? latestTest?.testDate : undefined,
          lactateConfidence: paceSelection.lactateProfile?.confidence,
          metabolicType: paceSelection.athleteClassification.metabolicType,
          metabolicTypeSource: paceSelection.lactateProfile ? 'LACTATE_PROFILE' : 'ESTIMATED',
          compressionFactor: paceSelection.athleteClassification.compressionFactor,
          danielsZones: paceSelection.zones.daniels as unknown as Prisma.InputJsonValue,
          canovaZones: paceSelection.zones.canova as unknown as Prisma.InputJsonValue,
          norwegianZones: paceSelection.zones.norwegian as unknown as Prisma.InputJsonValue,
          hrZones: paceSelection.zones.hrBased as unknown as Prisma.InputJsonValue,
          zonesLastUpdated: new Date(),
          zonesPrimarySource: paceSelection.primarySource,
        },
      })
    }

    // Return complete pace selection
    return NextResponse.json({
      ...paceSelection,
      clientInfo: {
        name: client.name,
        age,
        gender: client.gender,
      },
      dataSources: {
        raceCount: races.length,
        hasLactateTest: !!lactateTest,
        hasAthleteProfile: !!client.athleteProfile,
      },
    })
  } catch (error) {
    logger.error('Error calculating paces', {}, error)
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
 * POST /api/clients/[id]/paces
 * Force recalculation of paces with optional manual overrides
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { preferredSource, maxMismatchPercent, manualLT1Stage, manualLT2Stage } = body

    const { id: clientId } = await params

    // Get client data
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        athleteProfile: true,
      },
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Calculate age
    const birthDate = new Date(client.birthDate)
    const now = new Date()
    const age = Math.floor(
      (now.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
    )

    // Build athlete profile data
    const profileData: AthleteProfileData = {
      age,
      gender: client.gender as 'MALE' | 'FEMALE',
      weeklyKm: client.athleteProfile?.typicalWeeklyKm || 50,
      trainingAge: client.athleteProfile?.yearsRunning || 2,
      restingHR: client.athleteProfile?.rhrBaseline ?? undefined,
      maxHR: undefined,
    }

    // Get race performances
    const raceResults = await prisma.raceResult.findMany({
      where: { clientId },
      orderBy: { raceDate: 'desc' },
      take: 5,
    })

    const races: RacePerformance[] = raceResults.map((race) => ({
      distance: race.distance as '5K' | '10K' | 'HALF_MARATHON' | 'MARATHON' | 'CUSTOM',
      timeMinutes: race.timeMinutes,
      customDistanceKm: race.customDistanceKm || undefined,
      date: new Date(race.raceDate),
      age,
      gender: client.gender as 'MALE' | 'FEMALE',
    }))

    // Get lactate test
    const latestTest = await prisma.test.findFirst({
      where: {
        clientId,
        testType: 'RUNNING',
      },
      orderBy: { testDate: 'desc' },
      include: {
        testStages: {
          orderBy: { sequence: 'asc' },
        },
      },
    })

    let lactateTest: LactateTestData | undefined = undefined
    if (latestTest && latestTest.testStages.length >= 4 && latestTest.maxHR) {
      const hasLactate = latestTest.testStages.some((stage) => stage.lactate > 0)

      if (hasLactate) {
        lactateTest = {
          testStages: latestTest.testStages.map((stage) => ({
            sequence: stage.sequence,
            speed: stage.speed || 0,
            heartRate: stage.heartRate,
            lactate: stage.lactate,
          })),
          maxHR: latestTest.maxHR,
          manualLT1Stage,
          manualLT2Stage,
        }

        profileData.maxHR = latestTest.maxHR
      }
    }

    // Call pace selector with options
    const paceSelection = selectOptimalPaces(
      profileData,
      races.length > 0 ? races : undefined,
      lactateTest,
      {
        preferredSource,
        maxMismatchPercent,
      }
    )

    // Update athlete profile
    if (client.athleteProfile) {
      await prisma.athleteProfile.update({
        where: { clientId },
        data: {
          currentVDOT: paceSelection.vdotResult?.vdot,
          vdotConfidence: paceSelection.vdotResult?.confidence,
          vdotLastUpdated: paceSelection.vdotResult ? new Date() : undefined,
          maxLactate: paceSelection.lactateProfile?.maxLactate,
          lt2LactateRatio: paceSelection.lactateProfile?.lt2Ratio,
          lt2Speed: paceSelection.lactateProfile?.lt2.speed,
          lt2HeartRate: paceSelection.lactateProfile?.lt2.heartRate,
          lactateTestDate: lactateTest ? latestTest?.testDate : undefined,
          lactateConfidence: paceSelection.lactateProfile?.confidence,
          metabolicType: paceSelection.athleteClassification.metabolicType,
          compressionFactor: paceSelection.athleteClassification.compressionFactor,
          danielsZones: paceSelection.zones.daniels as unknown as Prisma.InputJsonValue,
          canovaZones: paceSelection.zones.canova as unknown as Prisma.InputJsonValue,
          norwegianZones: paceSelection.zones.norwegian as unknown as Prisma.InputJsonValue,
          hrZones: paceSelection.zones.hrBased as unknown as Prisma.InputJsonValue,
          zonesLastUpdated: new Date(),
          zonesPrimarySource: paceSelection.primarySource,
          category: paceSelection.athleteClassification.level,
        },
      })
    }

    return NextResponse.json(paceSelection)
  } catch (error) {
    logger.error('Error recalculating paces', {}, error)
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

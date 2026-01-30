// app/api/sport-tests/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { Prisma, SportTestCategory, SportTestProtocol, SportType } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { createSportTestSchema } from '@/lib/validations/sport-test-schemas'
import {
  calculateJumpPower,
  calculateRSI,
  calculateAcceleration,
  analyzeRSA,
  estimateOneRepMax,
  calculateRelativeStrength,
  calculateCSS,
  estimateVO2maxFromYoYoIR1,
  calculateYoYoDistance,
  classifyStationPerformance,
  type HYROXStation,
} from '@/lib/calculations/sport-tests'

// GET /api/sport-tests - Get all sport tests for logged in user (with optional clientId filter)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const clientId = searchParams.get('clientId')
    const category = searchParams.get('category')
    const protocol = searchParams.get('protocol')
    const sport = searchParams.get('sport')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build filter with validated enum values
    const categoryFilter = category && Object.values(SportTestCategory).includes(category as SportTestCategory)
      ? { category: category as SportTestCategory }
      : {}
    const protocolFilter = protocol && Object.values(SportTestProtocol).includes(protocol as SportTestProtocol)
      ? { protocol: protocol as SportTestProtocol }
      : {}
    const sportFilter = sport && Object.values(SportType).includes(sport as SportType)
      ? { sport: sport as SportType }
      : {}

    const tests = await prisma.sportTest.findMany({
      where: {
        userId: user.id,
        ...(clientId ? { clientId } : {}),
        ...categoryFilter,
        ...protocolFilter,
        ...sportFilter,
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            gender: true,
            birthDate: true,
            weight: true,
          },
        },
      },
      orderBy: {
        testDate: 'desc',
      },
      take: limit,
      skip: offset,
    })

    const total = await prisma.sportTest.count({
      where: {
        userId: user.id,
        ...(clientId ? { clientId } : {}),
        ...categoryFilter,
        ...protocolFilter,
        ...sportFilter,
      },
    })

    return NextResponse.json({
      success: true,
      data: tests,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + tests.length < total,
      },
    })
  } catch (error) {
    logger.error('Error fetching sport tests', {}, error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sport tests' },
      { status: 500 }
    )
  }
}

// POST /api/sport-tests - Create new sport test
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()

    // Validate input
    const validation = createSportTestSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          details: validation.error.errors,
        },
        { status: 400 }
      )
    }

    const { clientId, testDate, category, protocol, sport, conditions, rawData, notes } =
      validation.data

    // Verify client belongs to user
    const client = await prisma.client.findFirst({
      where: {
        id: clientId,
        userId: user.id,
      },
      select: {
        id: true,
        weight: true,
        gender: true,
      },
    })

    if (!client) {
      return NextResponse.json(
        { success: false, error: 'Client not found' },
        { status: 404 }
      )
    }

    // Calculate derived metrics based on protocol
    const derivedMetrics = calculateDerivedMetrics(
      protocol,
      rawData,
      client.weight,
      client.gender
    )

    // Create sport test record
    const sportTest = await prisma.sportTest.create({
      data: {
        clientId,
        userId: user.id,
        testDate: new Date(testDate),
        category,
        protocol,
        sport,
        conditions: (conditions || undefined) as Prisma.InputJsonValue | undefined,
        rawData: rawData as Prisma.InputJsonValue,
        notes,
        ...derivedMetrics,
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            gender: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: sportTest,
      derivedMetrics,
    })
  } catch (error) {
    logger.error('Error creating sport test', {}, error)
    return NextResponse.json(
      { success: false, error: 'Failed to create sport test' },
      { status: 500 }
    )
  }
}

/**
 * Calculate derived metrics based on test protocol and raw data
 */
function calculateDerivedMetrics(
  protocol: string,
  rawData: Record<string, unknown>,
  bodyWeight: number,
  gender: string
): Record<string, unknown> {
  const metrics: Record<string, unknown> = {}

  switch (protocol) {
    // Power Tests
    case 'VERTICAL_JUMP_CMJ':
    case 'VERTICAL_JUMP_SJ':
    case 'VERTICAL_JUMP_DJ': {
      const jumpHeight = rawData.jumpHeight as number
      if (jumpHeight && bodyWeight) {
        const power = calculateJumpPower(jumpHeight, bodyWeight)
        metrics.primaryResult = jumpHeight
        metrics.primaryUnit = 'cm'
        metrics.peakPower = power.peakPower
        metrics.relativePower = power.relativePower

        // RSI for drop jump
        if (protocol === 'VERTICAL_JUMP_DJ' && rawData.contactTime) {
          metrics.secondaryResult = calculateRSI(jumpHeight, rawData.contactTime as number)
          metrics.secondaryUnit = 'RSI'
        }
      }
      break
    }

    case 'STANDING_LONG_JUMP': {
      const jumpDistance = rawData.jumpDistance as number
      if (jumpDistance) {
        metrics.primaryResult = jumpDistance
        metrics.primaryUnit = 'cm'
      }
      break
    }

    case 'MEDICINE_BALL_THROW': {
      const throwDistance = rawData.throwDistance as number
      if (throwDistance) {
        metrics.primaryResult = throwDistance
        metrics.primaryUnit = 'm'
      }
      break
    }

    // Speed Tests
    case 'SPRINT_5M':
    case 'SPRINT_10M':
    case 'SPRINT_20M':
    case 'SPRINT_30M':
    case 'SPRINT_40M': {
      const totalTime = rawData.totalTime as number
      const distance = parseInt(protocol.replace('SPRINT_', '').replace('M', ''))
      if (totalTime && distance) {
        metrics.primaryResult = totalTime
        metrics.primaryUnit = 's'
        metrics.acceleration = calculateAcceleration(distance, totalTime)
        metrics.maxVelocity = distance / totalTime
      }
      break
    }

    case 'RSA_6X30M': {
      const sprintTimes = rawData.sprintTimes as number[]
      if (sprintTimes && sprintTimes.length > 0) {
        const analysis = analyzeRSA(sprintTimes)
        metrics.primaryResult = analysis.bestTime
        metrics.primaryUnit = 's'
        metrics.secondaryResult = analysis.fatigueIndex
        metrics.secondaryUnit = '%'
      }
      break
    }

    // Agility Tests
    case 'T_TEST':
    case 'ILLINOIS_AGILITY':
    case 'PRO_AGILITY_5_10_5':
    case 'LANE_AGILITY': {
      const time = rawData.time as number
      if (time) {
        metrics.primaryResult = time
        metrics.primaryUnit = 's'
      }
      break
    }

    // Endurance Tests
    case 'YOYO_IR1':
    case 'YOYO_IR2': {
      const level = rawData.level as number
      const shuttle = rawData.shuttle as number
      if (level && shuttle) {
        const distance = calculateYoYoDistance(level, shuttle)
        const vo2max = estimateVO2maxFromYoYoIR1(distance)
        metrics.primaryResult = level + shuttle / 10 // e.g., 17.4
        metrics.primaryUnit = 'level'
        metrics.estimatedVO2max = vo2max
        metrics.distance = distance
        metrics.level = level
      }
      break
    }

    case 'COOPER_TEST': {
      const distance = rawData.distance as number
      if (distance) {
        metrics.primaryResult = distance
        metrics.primaryUnit = 'm'
        metrics.estimatedVO2max = (distance - 504.9) / 44.73
      }
      break
    }

    // Strength Tests
    case 'BENCH_PRESS_1RM':
    case 'SQUAT_1RM':
    case 'DEADLIFT_1RM':
    case 'LEG_PRESS_1RM':
    case 'OVERHEAD_PRESS_1RM': {
      let weight = rawData.weight as number
      const reps = rawData.reps as number
      const isEstimated = rawData.isEstimated as boolean

      if (weight && reps && reps > 1 && isEstimated) {
        weight = estimateOneRepMax(weight, reps)
      }

      if (weight && bodyWeight) {
        metrics.primaryResult = weight
        metrics.primaryUnit = 'kg'
        metrics.relativePower = calculateRelativeStrength(weight, bodyWeight)
      }
      break
    }

    // Swimming Tests
    case 'CSS_TEST': {
      const time400m = rawData.time400m as number
      const time200m = rawData.time200m as number
      if (time400m && time200m) {
        const cssResult = calculateCSS(time400m, time200m)
        metrics.primaryResult = cssResult.cssPer100m
        metrics.primaryUnit = 's/100m'
        metrics.secondaryResult = cssResult.css
        metrics.secondaryUnit = 'm/s'
      }
      break
    }

    // HYROX Tests
    case 'HYROX_SKIERG_1K':
    case 'HYROX_ROW_1K':
    case 'HYROX_SLED_PUSH':
    case 'HYROX_SLED_PULL':
    case 'HYROX_BURPEE_BROAD_JUMP':
    case 'HYROX_FARMERS_CARRY':
    case 'HYROX_SANDBAG_LUNGE':
    case 'HYROX_WALL_BALLS': {
      const time = rawData.time as number
      if (time) {
        const station = protocol.replace('HYROX_', '') as HYROXStation
        const division = gender === 'MALE' ? 'MEN' : 'WOMEN'
        metrics.primaryResult = time
        metrics.primaryUnit = 's'
        metrics.benchmarkTier = classifyStationPerformance(station, time, division)
      }
      break
    }

    // Sport-Specific Tests
    case 'SERVE_SPEED':
    case 'SHOT_SPEED': {
      const speed = rawData.speed as number
      if (speed) {
        metrics.primaryResult = speed
        metrics.primaryUnit = 'km/h'
      }
      break
    }
  }

  return metrics
}

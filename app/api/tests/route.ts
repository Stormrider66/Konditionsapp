// app/api/tests/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from "@/lib/prisma"
import { createTestApiSchema, type CreateTestApiData } from '@/lib/validations/schemas'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

// GET /api/tests - Hämta alla tester för inloggad användare (med optional clientId filter)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
        },
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const clientId = searchParams.get('clientId')
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 200)
    const offset = parseInt(searchParams.get('offset') || '0')

    const where = {
      userId: user.id,
      ...(clientId ? { clientId } : {}),
    }

    const [tests, total] = await Promise.all([
      prisma.test.findMany({
        where,
        include: {
          testStages: {
            orderBy: { sequence: 'asc' },
          },
        },
        orderBy: {
          testDate: 'desc',
        },
        take: limit,
        skip: offset,
      }),
      prisma.test.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: tests,
      pagination: { total, limit, offset, hasMore: offset + tests.length < total },
    })
  } catch (error) {
    logger.error('Error fetching tests', {}, error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch tests',
      },
      { status: 500 }
    )
  }
}

// POST /api/tests - Skapa nytt test med stages
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
        },
        { status: 401 }
      )
    }

    const body = await request.json()

    // Validate input
    const validation = createTestApiSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validation.error.errors,
        },
        { status: 400 }
      )
    }

    const data: CreateTestApiData = validation.data

    // Ensure clientId is provided
    if (!data.clientId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Client ID is required',
        },
        { status: 400 }
      )
    }

    // Verify client exists and belongs to user
    const client = await prisma.client.findUnique({
      where: { id: data.clientId },
    })

    if (!client) {
      return NextResponse.json(
        {
          success: false,
          error: 'Client not found',
        },
        { status: 404 }
      )
    }

    if (client.userId !== user.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized - client does not belong to you',
        },
        { status: 403 }
      )
    }

    // Create test with stages
    const test = await prisma.test.create({
      data: {
        clientId: data.clientId,
        userId: user.id,
        testDate: new Date(data.testDate),
        testType: data.testType,
        location: data.location || null,
        testLeader: data.testLeader || null,
        inclineUnit: data.inclineUnit || 'PERCENT',
        notes: data.notes || null,
        // New fields
        restingLactate: data.restingLactate || null,
        postTestMeasurements: data.postTestMeasurements || Prisma.JsonNull,
        recommendedNextTestDate: data.recommendedNextTestDate ? new Date(data.recommendedNextTestDate) : null,
        testStages: {
          create: data.stages.map((stage, index) => ({
            sequence: index,
            duration: stage.duration,
            heartRate: stage.heartRate,
            lactate: stage.lactate,
            vo2: stage.vo2 || null,
            speed: stage.speed || null,
            incline: stage.incline || null,
            power: stage.power || null,
            cadence: stage.cadence || null,
            pace: stage.pace || null,
          })),
        },
      },
      include: {
        testStages: {
          orderBy: { sequence: 'asc' },
        },
      },
    })

    return NextResponse.json(
      {
        success: true,
        data: test,
        message: 'Test created successfully',
      },
      { status: 201 }
    )
  } catch (error) {
    logger.error('Error creating test', {}, error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create test',
      },
      { status: 500 }
    )
  }
}

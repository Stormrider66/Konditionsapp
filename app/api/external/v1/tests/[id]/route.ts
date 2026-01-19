import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withApiKey } from '@/lib/api-key-auth'

/**
 * External API: Get single test with full details
 *
 * GET /api/external/v1/tests/:id
 * Authorization: Bearer bak_xxxxx
 *
 * Required scope: read:tests
 */
export const GET = withApiKey(
  async (request, { apiKey, params }) => {
    const testId = params?.id

    if (!testId) {
      return NextResponse.json(
        { success: false, error: 'Test ID required' },
        { status: 400 }
      )
    }

    // Get coaches belonging to this business
    const businessMembers = await prisma.businessMember.findMany({
      where: { businessId: apiKey.businessId, isActive: true },
      select: { userId: true }
    })
    const coachIds = businessMembers.map(m => m.userId)

    // Find test and verify it belongs to this business
    const test = await prisma.test.findFirst({
      where: {
        id: testId,
        userId: { in: coachIds }
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            gender: true,
            birthDate: true,
            height: true,
            weight: true,
          }
        },
        testStages: {
          orderBy: { sequence: 'asc' }
        }
      }
    })

    if (!test) {
      return NextResponse.json(
        { success: false, error: 'Test not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        id: test.id,
        testDate: test.testDate,
        testType: test.testType,
        status: test.status,
        location: test.location,
        testLeader: test.testLeader,
        inclineUnit: test.inclineUnit,
        // Results
        vo2max: test.vo2max,
        maxHR: test.maxHR,
        maxLactate: test.maxLactate,
        aerobicThreshold: test.aerobicThreshold,
        anaerobicThreshold: test.anaerobicThreshold,
        trainingZones: test.trainingZones,
        // Athlete info
        athlete: test.client,
        // Test stages (the actual measurements)
        stages: test.testStages.map(stage => ({
          sequence: stage.sequence,
          duration: stage.duration,
          heartRate: stage.heartRate,
          lactate: stage.lactate,
          vo2: stage.vo2,
          speed: stage.speed,
          incline: stage.incline,
          power: stage.power,
          cadence: stage.cadence,
          pace: stage.pace,
          economy: stage.economy,
          wattsPerKg: stage.wattsPerKg,
        })),
        notes: test.notes,
        createdAt: test.createdAt,
        updatedAt: test.updatedAt,
      },
      meta: {
        business: apiKey.business.name,
        requestedAt: new Date().toISOString()
      }
    })
  },
  { requiredScopes: ['read:tests'] }
)

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withApiKey } from '@/lib/api-key-auth'

/**
 * External API: Get single athlete details
 *
 * GET /api/external/v1/athletes/:id
 * Authorization: Bearer bak_xxxxx
 *
 * Required scope: read:athletes
 */
export const GET = withApiKey(
  async (request, { apiKey, params }) => {
    const athleteId = params?.id

    if (!athleteId) {
      return NextResponse.json(
        { success: false, error: 'Athlete ID required' },
        { status: 400 }
      )
    }

    // Get coaches belonging to this business
    const businessMembers = await prisma.businessMember.findMany({
      where: { businessId: apiKey.businessId, isActive: true },
      select: { userId: true }
    })
    const coachIds = businessMembers.map(m => m.userId)

    // Find athlete and verify they belong to this business
    const athlete = await prisma.client.findFirst({
      where: {
        id: athleteId,
        userId: { in: coachIds }
      },
      include: {
        tests: {
          select: {
            id: true,
            testDate: true,
            testType: true,
            status: true,
            vo2max: true,
            maxHR: true,
          },
          orderBy: { testDate: 'desc' },
          take: 5
        },
        team: {
          select: { id: true, name: true }
        },
        _count: {
          select: { tests: true }
        }
      }
    })

    if (!athlete) {
      return NextResponse.json(
        { success: false, error: 'Athlete not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        id: athlete.id,
        name: athlete.name,
        email: athlete.email,
        phone: athlete.phone,
        gender: athlete.gender,
        birthDate: athlete.birthDate,
        height: athlete.height,
        weight: athlete.weight,
        notes: athlete.notes,
        team: athlete.team,
        recentTests: athlete.tests,
        totalTests: athlete._count.tests,
        createdAt: athlete.createdAt,
        updatedAt: athlete.updatedAt,
      },
      meta: {
        business: apiKey.business.name,
        requestedAt: new Date().toISOString()
      }
    })
  },
  { requiredScopes: ['read:athletes'] }
)

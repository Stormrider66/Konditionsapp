import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withApiKey } from '@/lib/api-key-auth'

/**
 * External API: List tests for the authenticated business
 *
 * GET /api/external/v1/tests
 * Authorization: Bearer bak_xxxxx
 *
 * Query params:
 *   - page: Page number (default: 1)
 *   - limit: Items per page (default: 20, max: 100)
 *   - athleteId: Filter by athlete ID
 *   - testType: Filter by test type (RUNNING, CYCLING, SKIING)
 *   - status: Filter by status (DRAFT, COMPLETED, ARCHIVED)
 *
 * Required scope: read:tests
 */
export const GET = withApiKey(
  async (request, { apiKey }) => {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const athleteId = searchParams.get('athleteId')
    const testType = searchParams.get('testType')
    const status = searchParams.get('status')

    // Get coaches belonging to this business
    const businessMembers = await prisma.businessMember.findMany({
      where: { businessId: apiKey.businessId, isActive: true },
      select: { userId: true }
    })
    const coachIds = businessMembers.map(m => m.userId)

    // Build query
    const where: Record<string, unknown> = {
      userId: { in: coachIds }
    }

    if (athleteId) {
      const athlete = await prisma.client.findFirst({
        where: {
          id: athleteId,
          userId: { in: coachIds }
        },
        select: { id: true }
      })

      if (!athlete) {
        return NextResponse.json(
          { success: false, error: 'Athlete not found or access denied' },
          { status: 404 }
        )
      }

      where.clientId = athleteId
    }
    if (testType) {
      where.testType = testType
    }
    if (status) {
      where.status = status
    }

    const [tests, total] = await Promise.all([
      prisma.test.findMany({
        where,
        select: {
          id: true,
          testDate: true,
          testType: true,
          status: true,
          location: true,
          testLeader: true,
          vo2max: true,
          maxHR: true,
          maxLactate: true,
          aerobicThreshold: true,
          anaerobicThreshold: true,
          createdAt: true,
          client: {
            select: { id: true, name: true }
          }
        },
        orderBy: { testDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.test.count({ where })
    ])

    return NextResponse.json({
      success: true,
      data: {
        tests,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        }
      },
      meta: {
        business: apiKey.business.name,
        requestedAt: new Date().toISOString()
      }
    })
  },
  { requiredScopes: ['read:tests'] }
)

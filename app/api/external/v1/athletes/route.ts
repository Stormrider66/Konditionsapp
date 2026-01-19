import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withApiKey } from '@/lib/api-key-auth'

/**
 * External API: List athletes for the authenticated business
 *
 * GET /api/external/v1/athletes
 * Authorization: Bearer bak_xxxxx
 *
 * Query params:
 *   - page: Page number (default: 1)
 *   - limit: Items per page (default: 20, max: 100)
 *   - search: Search by name or email
 *
 * Required scope: read:athletes
 */
export const GET = withApiKey(
  async (request, { apiKey }) => {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const search = searchParams.get('search')

    // Get coaches belonging to this business
    const businessMembers = await prisma.businessMember.findMany({
      where: { businessId: apiKey.businessId, isActive: true },
      select: { userId: true }
    })
    const coachIds = businessMembers.map(m => m.userId)

    // Build query for clients (athletes) of these coaches
    const where: Record<string, unknown> = {
      userId: { in: coachIds }
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ]
    }

    const [athletes, total] = await Promise.all([
      prisma.client.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          gender: true,
          birthDate: true,
          height: true,
          weight: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.client.count({ where })
    ])

    return NextResponse.json({
      success: true,
      data: {
        athletes,
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
  { requiredScopes: ['read:athletes'] }
)

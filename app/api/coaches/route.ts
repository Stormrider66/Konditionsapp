// app/api/coaches/route.ts
// Public API for listing coaches in the marketplace

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { SportType } from '@prisma/client'

/**
 * GET /api/coaches
 * List public coaches in the marketplace
 *
 * Query parameters:
 * - sport: Filter by sport type
 * - methodology: Filter by methodology
 * - location: Filter by location (partial match)
 * - sort: 'rating' | 'clients' | 'newest' (default: 'rating')
 * - page: Page number (default: 1)
 * - limit: Results per page (default: 20, max: 50)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Parse query parameters
    const sport = searchParams.get('sport') as SportType | null
    const methodology = searchParams.get('methodology')
    const location = searchParams.get('location')
    const sort = searchParams.get('sort') || 'rating'
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))

    // Build where clause
    const where: Record<string, unknown> = {
      isPublic: true,
      isAcceptingClients: true,
    }

    if (sport) {
      where.specialties = {
        has: sport,
      }
    }

    if (methodology) {
      where.methodologies = {
        has: methodology,
      }
    }

    if (location) {
      where.location = {
        contains: location,
        mode: 'insensitive',
      }
    }

    // Build orderBy clause
    let orderBy: Record<string, string>[]
    switch (sort) {
      case 'clients':
        orderBy = [{ activeClients: 'desc' }, { averageRating: 'desc' }]
        break
      case 'newest':
        orderBy = [{ createdAt: 'desc' }]
        break
      case 'rating':
      default:
        orderBy = [{ averageRating: 'desc' }, { reviewCount: 'desc' }]
    }

    // Get total count for pagination
    const total = await prisma.coachProfile.count({ where })

    // Fetch coaches
    const coaches = await prisma.coachProfile.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        slug: true,
        headline: true,
        bio: true,
        imageUrl: true,
        specialties: true,
        methodologies: true,
        experienceYears: true,
        credentials: true,
        isVerified: true,
        location: true,
        languages: true,
        activeClients: true,
        averageRating: true,
        reviewCount: true,
        user: {
          select: {
            name: true,
          },
        },
      },
    })

    // Format response
    const formattedCoaches = coaches.map(coach => ({
      id: coach.id,
      slug: coach.slug,
      name: coach.user.name,
      headline: coach.headline,
      bio: coach.bio ? coach.bio.substring(0, 200) + (coach.bio.length > 200 ? '...' : '') : null,
      imageUrl: coach.imageUrl,
      specialties: coach.specialties,
      methodologies: coach.methodologies,
      experienceYears: coach.experienceYears,
      credentials: coach.credentials,
      isVerified: coach.isVerified,
      location: coach.location,
      languages: coach.languages,
      stats: {
        activeClients: coach.activeClients,
        averageRating: coach.averageRating,
        reviewCount: coach.reviewCount,
      },
    }))

    return NextResponse.json({
      success: true,
      data: formattedCoaches,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    logger.error('Error listing coaches', {}, error)
    return NextResponse.json(
      {
        success: false,
        error: 'Misslyckades med att hämta coacher',
      },
      { status: 500 }
    )
  }
}

// app/api/coaches/[slug]/route.ts
// Public API for getting a single coach's profile

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

interface RouteParams {
  params: Promise<{
    slug: string
  }>
}

/**
 * GET /api/coaches/[slug]
 * Get a single coach's public profile
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params

    const coach = await prisma.coachProfile.findUnique({
      where: { slug },
      include: {
        user: {
          select: {
            name: true,
          },
        },
        reviews: {
          where: {
            isPublic: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 10, // Only return recent reviews
          include: {
            athlete: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    })

    if (!coach) {
      return NextResponse.json(
        {
          success: false,
          error: 'Coach not found',
        },
        { status: 404 }
      )
    }

    // Don't return private coaches
    if (!coach.isPublic) {
      return NextResponse.json(
        {
          success: false,
          error: 'Coach profile is not public',
        },
        { status: 404 }
      )
    }

    // Format response
    const formattedCoach = {
      id: coach.id,
      slug: coach.slug,
      name: coach.user.name,
      headline: coach.headline,
      bio: coach.bio,
      imageUrl: coach.imageUrl,
      coverImageUrl: coach.coverImageUrl,
      specialties: coach.specialties,
      methodologies: coach.methodologies,
      experienceYears: coach.experienceYears,
      credentials: coach.credentials,
      isVerified: coach.isVerified,
      isAcceptingClients: coach.isAcceptingClients,
      location: coach.location,
      timezone: coach.timezone,
      languages: coach.languages,
      stats: {
        totalClients: coach.totalClients,
        activeClients: coach.activeClients,
        averageRating: coach.averageRating,
        reviewCount: coach.reviewCount,
      },
      reviews: coach.reviews.map(review => ({
        id: review.id,
        rating: review.rating,
        title: review.title,
        comment: review.comment,
        isVerified: review.isVerified,
        athleteName: review.athlete.name.split(' ')[0], // First name only for privacy
        createdAt: review.createdAt,
      })),
    }

    return NextResponse.json({
      success: true,
      data: formattedCoach,
    })
  } catch (error) {
    logger.error('Error fetching coach profile', {}, error)
    return NextResponse.json(
      {
        success: false,
        error: 'Misslyckades med att hämta coachprofil',
      },
      { status: 500 }
    )
  }
}

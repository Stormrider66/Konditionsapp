// app/api/coach/requests/route.ts
// API for coach to view and manage incoming connection requests

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { logger } from '@/lib/logger'

/**
 * GET /api/coach/requests
 * List all coach requests (pending and recent)
 *
 * Query parameters:
 * - status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'all' (default: 'PENDING')
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Obehörig' },
        { status: 401 }
      )
    }

    if (user.role !== 'COACH' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Endast coacher kan se förfrågningar' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'PENDING'

    // Build where clause
    const where: Record<string, unknown> = {
      coachUserId: user.id,
    }

    if (status !== 'all') {
      where.status = status
    }

    const requests = await prisma.coachRequest.findMany({
      where,
      orderBy: {
        requestedAt: 'desc',
      },
      include: {
        athlete: {
          select: {
            id: true,
            name: true,
            email: true,
            gender: true,
            birthDate: true,
            sportProfile: {
              select: {
                primarySport: true,
                currentGoal: true,
              },
            },
            athleteSubscription: {
              select: {
                tier: true,
                status: true,
              },
            },
          },
        },
      },
    })

    // Format and check for expiring requests
    const now = new Date()
    const formattedRequests = requests.map((req) => {
      const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000
      const expiresInMs = req.expiresAt.getTime() - now.getTime()

      return {
        id: req.id,
        status: req.status,
        message: req.message,
        requestedAt: req.requestedAt,
        respondedAt: req.respondedAt,
        expiresAt: req.expiresAt,
        // Only "expiring soon" if it hasn't already expired
        isExpiringSoon: req.status === 'PENDING' && expiresInMs > 0 && expiresInMs < THREE_DAYS_MS,
        athlete: {
          id: req.athlete.id,
          name: req.athlete.name,
          email: req.athlete.email,
          gender: req.athlete.gender,
          age: Math.floor((now.getTime() - req.athlete.birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)),
          sport: req.athlete.sportProfile?.primarySport,
          goal: req.athlete.sportProfile?.currentGoal,
          subscription: req.athlete.athleteSubscription ? {
            tier: req.athlete.athleteSubscription.tier,
            status: req.athlete.athleteSubscription.status,
          } : null,
        },
      }
    })

    return NextResponse.json({
      success: true,
      data: formattedRequests,
    })
  } catch (error) {
    logger.error('Error listing coach requests', {}, error)
    return NextResponse.json(
      { success: false, error: 'Misslyckades med att hämta förfrågningar' },
      { status: 500 }
    )
  }
}

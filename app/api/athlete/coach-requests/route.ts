// app/api/athlete/coach-requests/route.ts
// API for athletes to create and manage coach connection requests

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils'
import { createCoachRequest, cancelCoachRequest } from '@/lib/coach/agreement'
import { logger } from '@/lib/logger'
import { z } from 'zod'

const createRequestSchema = z.object({
  coachUserId: z.string().uuid(),
  message: z.string().max(1000).optional(),
})

/**
 * GET /api/athlete/coach-requests
 * List athlete's coach requests (sent requests)
 */
export async function GET(request: NextRequest) {
  try {
    const { clientId } = await requireAthleteOrCoachInAthleteMode()

    const requests = await prisma.coachRequest.findMany({
      where: {
        athleteClientId: clientId,
      },
      orderBy: {
        requestedAt: 'desc',
      },
      include: {
        coach: {
          select: {
            id: true,
            name: true,
            coachProfile: {
              select: {
                slug: true,
                headline: true,
                imageUrl: true,
                isVerified: true,
              },
            },
          },
        },
      },
    })

    const formattedRequests = requests.map(req => ({
      id: req.id,
      status: req.status,
      message: req.message,
      coachResponse: req.coachResponse,
      requestedAt: req.requestedAt,
      respondedAt: req.respondedAt,
      expiresAt: req.expiresAt,
      coach: {
        id: req.coach.id,
        name: req.coach.name,
        slug: req.coach.coachProfile?.slug,
        headline: req.coach.coachProfile?.headline,
        imageUrl: req.coach.coachProfile?.imageUrl,
        isVerified: req.coach.coachProfile?.isVerified || false,
      },
    }))

    return NextResponse.json({
      success: true,
      data: formattedRequests,
    })
  } catch (error) {
    logger.error('Error listing athlete coach requests', {}, error)
    return NextResponse.json(
      { success: false, error: 'Misslyckades med att hämta förfrågningar' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/athlete/coach-requests
 * Create a new request to connect with a coach
 */
export async function POST(request: NextRequest) {
  try {
    const { clientId } = await requireAthleteOrCoachInAthleteMode()

    const body = await request.json()
    const validatedData = createRequestSchema.parse(body)

    // Check subscription - only STANDARD+ can request coaches
    const subscription = await prisma.athleteSubscription.findUnique({
      where: { clientId },
    })

    if (!subscription || subscription.tier === 'FREE') {
      return NextResponse.json(
        {
          success: false,
          error: 'Du behöver en Standard eller Pro-prenumeration för att ansluta till en coach',
          code: 'SUBSCRIPTION_REQUIRED',
        },
        { status: 403 }
      )
    }

    const result = await createCoachRequest(
      clientId,
      validatedData.coachUserId,
      validatedData.message
    )

    return NextResponse.json({
      success: true,
      data: {
        id: result.id,
        status: result.status,
        expiresAt: result.expiresAt,
      },
      message: 'Förfrågan skickad! Coachen kommer att meddelas.',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Ogiltiga data', details: error.errors },
        { status: 400 }
      )
    }

    if (error instanceof Error) {
      // Known errors from createCoachRequest
      if (
        error.message.includes('already have') ||
        error.message.includes('not accepting')
      ) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 400 }
        )
      }
    }

    logger.error('Error creating coach request', {}, error)
    return NextResponse.json(
      { success: false, error: 'Misslyckades med att skapa förfrågan' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/athlete/coach-requests
 * Cancel a pending request
 *
 * Body: { requestId: string }
 */
export async function DELETE(request: NextRequest) {
  try {
    const { clientId } = await requireAthleteOrCoachInAthleteMode()

    const body = await request.json()
    const { requestId } = body

    if (!requestId) {
      return NextResponse.json(
        { success: false, error: 'requestId krävs' },
        { status: 400 }
      )
    }

    const result = await cancelCoachRequest(requestId, clientId)

    return NextResponse.json({
      success: true,
      data: {
        id: result.id,
        status: result.status,
      },
      message: 'Förfrågan avbruten.',
    })
  } catch (error) {
    if (error instanceof Error) {
      if (
        error.message.includes('not found') ||
        error.message.includes('Unauthorized') ||
        error.message.includes('Can only cancel')
      ) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 400 }
        )
      }
    }

    logger.error('Error cancelling coach request', {}, error)
    return NextResponse.json(
      { success: false, error: 'Misslyckades med att avbryta förfrågan' },
      { status: 500 }
    )
  }
}

// app/api/athlete/coach-requests/route.ts
// API for athletes to create and manage coach connection requests

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils'
import { createCoachRequest, cancelCoachRequest } from '@/lib/coach/agreement'
import { logger } from '@/lib/logger'
import { z } from 'zod'
import { requireFeatureAccess } from '@/lib/subscription/require-feature-access'

const createRequestSchema = z.object({
  coachUserId: z.string().uuid(),
  message: z.string().max(1000).optional(),
})

type AppLocale = 'en' | 'sv'

function getUserLocale(language: string | null | undefined): AppLocale {
  return language === 'sv' ? 'sv' : 'en'
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

/**
 * GET /api/athlete/coach-requests
 * List athlete's coach requests (sent requests)
 */
export async function GET(_request: NextRequest) {
  let locale: AppLocale = 'en'

  try {
    const { clientId, user } = await requireAthleteOrCoachInAthleteMode()
    locale = getUserLocale(user.language)

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
      { success: false, error: t(locale, 'Failed to fetch requests', 'Misslyckades med att hämta förfrågningar') },
      { status: 500 }
    )
  }
}

/**
 * POST /api/athlete/coach-requests
 * Create a new request to connect with a coach
 */
export async function POST(request: NextRequest) {
  let locale: AppLocale = 'en'

  try {
    const { clientId, user } = await requireAthleteOrCoachInAthleteMode()
    locale = getUserLocale(user.language)

    const body = await request.json()
    const validatedData = createRequestSchema.parse(body)

    const featureDenied = await requireFeatureAccess(clientId, 'coach_requests', {
      featureLabel: t(locale, 'Coach connection', 'Coachanslutning'),
    })

    if (featureDenied) {
      return featureDenied
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
      message: t(locale, 'Request sent. The coach will be notified.', 'Förfrågan skickad! Coachen kommer att meddelas.'),
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: t(locale, 'Invalid data', 'Ogiltiga data'), details: error.errors },
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
      { success: false, error: t(locale, 'Failed to create request', 'Misslyckades med att skapa förfrågan') },
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
  let locale: AppLocale = 'en'

  try {
    const { clientId, user } = await requireAthleteOrCoachInAthleteMode()
    locale = getUserLocale(user.language)

    const body = await request.json()
    const { requestId } = body

    if (!requestId) {
      return NextResponse.json(
        { success: false, error: t(locale, 'requestId is required', 'requestId krävs') },
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
      message: t(locale, 'Request cancelled.', 'Förfrågan avbruten.'),
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
      { success: false, error: t(locale, 'Failed to cancel request', 'Misslyckades med att avbryta förfrågan') },
      { status: 500 }
    )
  }
}

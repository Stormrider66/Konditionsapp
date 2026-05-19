// app/api/coach/requests/[id]/reject/route.ts
// API for coach to reject a connection request

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { rejectCoachRequest } from '@/lib/coach/agreement'
import { logger } from '@/lib/logger'
import { z } from 'zod'
import { canAccessCoachPlatform } from '@/lib/user-capabilities'

type AppLocale = 'en' | 'sv'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

const rejectSchema = z.object({
  response: z.string().max(500).optional(),
})

const copy = {
  en: {
    unauthorized: 'Unauthorized',
    coachOnly: 'Only coaches can reject requests',
    rejected: 'Request rejected.',
    invalidData: 'Invalid data',
    rejectFailed: 'Failed to reject request',
  },
  sv: {
    unauthorized: 'Obehörig',
    coachOnly: 'Endast coacher kan avvisa förfrågningar',
    rejected: 'Förfrågan avvisad.',
    invalidData: 'Ogiltiga data',
    rejectFailed: 'Misslyckades med att avvisa förfrågan',
  },
} satisfies Record<AppLocale, Record<string, string>>

/**
 * POST /api/coach/requests/[id]/reject
 * Reject a connection request from an athlete
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  let locale: AppLocale = 'en'
  try {
    const user = await getCurrentUser()
    locale = user?.language === 'sv' ? 'sv' : 'en'

    if (!user) {
      return NextResponse.json(
        { success: false, error: copy[locale].unauthorized },
        { status: 401 }
      )
    }

    if (!(await canAccessCoachPlatform(user.id))) {
      return NextResponse.json(
        { success: false, error: copy[locale].coachOnly },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const validatedData = rejectSchema.parse(body)

    const result = await rejectCoachRequest(id, user.id, validatedData.response)

    return NextResponse.json({
      success: true,
      data: {
        id: result.id,
        status: result.status,
      },
      message: copy[locale].rejected,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: copy[locale].invalidData, details: error.errors },
        { status: 400 }
      )
    }

    if (error instanceof Error) {
      if (
        error.message.includes('not found') ||
        error.message.includes('Unauthorized') ||
        error.message.includes('Cannot reject')
      ) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 400 }
        )
      }
    }

    logger.error('Error rejecting coach request', {}, error)
    return NextResponse.json(
      { success: false, error: copy[locale].rejectFailed },
      { status: 500 }
    )
  }
}

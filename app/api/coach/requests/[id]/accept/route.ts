// app/api/coach/requests/[id]/accept/route.ts
// API for coach to accept a connection request

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { acceptCoachRequest } from '@/lib/coach/agreement'
import { logger } from '@/lib/logger'
import { z } from 'zod'
import { canAccessCoachPlatform } from '@/lib/user-capabilities'

type AppLocale = 'en' | 'sv'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

const acceptSchema = z.object({
  response: z.string().max(500).optional(),
  programAction: z.enum(['KEPT', 'MODIFIED', 'REPLACED']).optional(),
})

const copy = {
  en: {
    unauthorized: 'Unauthorized',
    coachOnly: 'Only coaches can accept requests',
    accepted: 'Request accepted. The athlete is now connected to you.',
    invalidData: 'Invalid data',
    acceptFailed: 'Failed to accept request',
  },
  sv: {
    unauthorized: 'Obehörig',
    coachOnly: 'Endast coacher kan acceptera förfrågningar',
    accepted: 'Förfrågan accepterad! Atleten är nu kopplad till dig.',
    invalidData: 'Ogiltiga data',
    acceptFailed: 'Misslyckades med att acceptera förfrågan',
  },
} satisfies Record<AppLocale, Record<string, string>>

/**
 * POST /api/coach/requests/[id]/accept
 * Accept a connection request from an athlete
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
    const validatedData = acceptSchema.parse(body)

    const result = await acceptCoachRequest(id, user.id, {
      response: validatedData.response,
      programAction: validatedData.programAction,
    })

    return NextResponse.json({
      success: true,
      data: {
        request: {
          id: result.request.id,
          status: result.request.status,
        },
        agreement: {
          id: result.agreement.id,
          status: result.agreement.status,
          revenueShareStartDate: result.agreement.revenueShareStartDate,
        },
      },
      message: copy[locale].accepted,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: copy[locale].invalidData, details: error.errors },
        { status: 400 }
      )
    }

    if (error instanceof Error) {
      // Known errors from acceptCoachRequest
      if (
        error.message.includes('not found') ||
        error.message.includes('Unauthorized') ||
        error.message.includes('Cannot accept') ||
        error.message.includes('expired')
      ) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 400 }
        )
      }
    }

    logger.error('Error accepting coach request', {}, error)
    return NextResponse.json(
      { success: false, error: copy[locale].acceptFailed },
      { status: 500 }
    )
  }
}

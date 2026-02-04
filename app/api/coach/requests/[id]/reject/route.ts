// app/api/coach/requests/[id]/reject/route.ts
// API for coach to reject a connection request

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { rejectCoachRequest } from '@/lib/coach/agreement'
import { logger } from '@/lib/logger'
import { z } from 'zod'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

const rejectSchema = z.object({
  response: z.string().max(500).optional(),
})

/**
 * POST /api/coach/requests/[id]/reject
 * Reject a connection request from an athlete
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
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
        { success: false, error: 'Endast coacher kan avvisa förfrågningar' },
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
      message: 'Förfrågan avvisad.',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Ogiltiga data', details: error.errors },
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
      { success: false, error: 'Misslyckades med att avvisa förfrågan' },
      { status: 500 }
    )
  }
}

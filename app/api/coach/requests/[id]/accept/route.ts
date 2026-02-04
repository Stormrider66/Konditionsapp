// app/api/coach/requests/[id]/accept/route.ts
// API for coach to accept a connection request

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { acceptCoachRequest } from '@/lib/coach/agreement'
import { logger } from '@/lib/logger'
import { z } from 'zod'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

const acceptSchema = z.object({
  response: z.string().max(500).optional(),
  programAction: z.enum(['KEPT', 'MODIFIED', 'REPLACED']).optional(),
})

/**
 * POST /api/coach/requests/[id]/accept
 * Accept a connection request from an athlete
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
        { success: false, error: 'Endast coacher kan acceptera förfrågningar' },
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
      message: 'Förfrågan accepterad! Atleten är nu kopplad till dig.',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Ogiltiga data', details: error.errors },
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
      { success: false, error: 'Misslyckades med att acceptera förfrågan' },
      { status: 500 }
    )
  }
}

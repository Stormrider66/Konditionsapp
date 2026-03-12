import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, handleApiError } from '@/lib/api/utils'
import { requireBusinessMembership } from '@/lib/auth-utils'
import { acceptCoachRequest } from '@/lib/coach/agreement'

interface RouteParams {
  params: Promise<{ id: string; requestId: string }>
}

/**
 * POST /api/business/[id]/coach-requests/[requestId]/accept
 * Accept a coach request within business.
 * Body: { response?, programAction? }
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth()
    const { id: businessId, requestId } = await params

    await requireBusinessMembership(user.id, businessId, {
      roles: ['OWNER', 'ADMIN', 'COACH'],
    })

    // Verify the request belongs to this business
    const coachRequest = await prisma.coachRequest.findUnique({
      where: { id: requestId },
    })

    if (!coachRequest || coachRequest.businessId !== businessId) {
      return NextResponse.json(
        { error: 'Coach request not found in this business' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { response, programAction } = body

    const result = await acceptCoachRequest(requestId, user.id, {
      response,
      programAction,
    })

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return handleApiError(error)
  }
}

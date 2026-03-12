import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, handleApiError } from '@/lib/api/utils'
import { requireBusinessMembership } from '@/lib/auth-utils'
import { rejectCoachRequest } from '@/lib/coach/agreement'

interface RouteParams {
  params: Promise<{ id: string; requestId: string }>
}

/**
 * POST /api/business/[id]/coach-requests/[requestId]/reject
 * Reject a coach request within business.
 * Body: { response? }
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth()
    const { id: businessId, requestId } = await params

    await requireBusinessMembership(user.id, businessId, {
      roles: ['OWNER', 'ADMIN', 'COACH'],
    })

    const body = await request.json()
    const { response } = body

    const updatedRequest = await rejectCoachRequest(requestId, user.id, response)

    return NextResponse.json(updatedRequest)
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return handleApiError(error)
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, handleApiError } from '@/lib/api/utils'
import { requireBusinessMembership } from '@/lib/auth-utils'
import { acceptCoachInvitation } from '@/lib/coach/agreement'

interface RouteParams {
  params: Promise<{ id: string; requestId: string }>
}

/**
 * POST /api/business/[id]/coach-invitations/[requestId]/accept
 * Athlete accepts a coach-initiated invitation.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth()
    const { id: businessId, requestId } = await params

    await requireBusinessMembership(user.id, businessId)

    // Get athlete's clientId
    const athleteAccount = await prisma.athleteAccount.findFirst({
      where: { userId: user.id },
    })

    if (!athleteAccount) {
      return NextResponse.json(
        { error: 'Athlete account not found' },
        { status: 404 }
      )
    }

    const body = await request.json().catch(() => ({}))

    const result = await acceptCoachInvitation(
      requestId,
      athleteAccount.clientId,
      body.response
    )

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return handleApiError(error)
  }
}

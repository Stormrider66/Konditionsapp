import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, handleApiError } from '@/lib/api/utils'
import { requireBusinessMembership } from '@/lib/auth-utils'
import { assignAthleteToCoach } from '@/lib/coach/agreement'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /api/business/[id]/assign-athlete
 * Direct assignment of an athlete to a coach by coach/admin.
 * Body: { athleteClientId, coachUserId }
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth()
    const { id: businessId } = await params

    const { role } = await requireBusinessMembership(user.id, businessId, {
      roles: ['OWNER', 'ADMIN', 'COACH'],
    })

    const body = await request.json()
    const { athleteClientId, coachUserId } = body

    if (!athleteClientId || !coachUserId) {
      return NextResponse.json(
        { error: 'athleteClientId and coachUserId are required' },
        { status: 400 }
      )
    }

    // If role is COACH (not OWNER/ADMIN), can only assign to self
    if (role === 'COACH' && coachUserId !== user.id) {
      return NextResponse.json(
        { error: 'Coaches can only assign athletes to themselves' },
        { status: 403 }
      )
    }

    const agreement = await assignAthleteToCoach(
      athleteClientId,
      coachUserId,
      user.id,
      businessId
    )

    return NextResponse.json(agreement, { status: 201 })
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return handleApiError(error)
  }
}

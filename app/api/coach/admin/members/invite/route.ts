import { NextRequest, NextResponse } from 'next/server'
import { requireBusinessAdminRole } from '@/lib/auth-utils'
import { handleApiError } from '@/lib/api-error'
import { inviteUserToBusiness } from '@/lib/invite-utils'
import { z } from 'zod'

const inviteSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(['OWNER', 'ADMIN', 'MEMBER', 'COACH']).default('MEMBER'),
})

// POST /api/coach/admin/members/invite - Invite a new user to the coach's business
export async function POST(request: NextRequest) {
  try {
    const admin = await requireBusinessAdminRole()
    const businessId = admin.businessId

    const body = await request.json()
    const validatedData = inviteSchema.parse(body)

    // Only OWNER can invite another OWNER
    if (validatedData.role === 'OWNER' && admin.businessRole !== 'OWNER') {
      return NextResponse.json(
        { success: false, error: 'Endast ägare kan bjuda in andra ägare' },
        { status: 403 }
      )
    }

    const result = await inviteUserToBusiness({
      email: validatedData.email,
      name: validatedData.name,
      businessId,
      role: validatedData.role,
    })

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          userId: result.userId,
          memberId: result.memberId,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    return handleApiError(error, 'POST /api/coach/admin/members/invite')
  }
}

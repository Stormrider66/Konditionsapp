import { NextRequest, NextResponse } from 'next/server'
import { requireAdminRole } from '@/lib/auth-utils'
import { handleApiError } from '@/lib/api-error'
import { inviteUserToBusiness } from '@/lib/invite-utils'
import { z } from 'zod'

const inviteSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  businessId: z.string().uuid(),
  role: z.enum(['OWNER', 'ADMIN', 'MEMBER', 'COACH']).default('MEMBER'),
})

// POST /api/admin/users/invite - Invite a new user to a business
export async function POST(request: NextRequest) {
  try {
    await requireAdminRole(['SUPER_ADMIN', 'ADMIN'])

    const body = await request.json()
    const validatedData = inviteSchema.parse(body)

    const result = await inviteUserToBusiness({
      email: validatedData.email,
      name: validatedData.name,
      businessId: validatedData.businessId,
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
    return handleApiError(error, 'POST /api/admin/users/invite')
  }
}

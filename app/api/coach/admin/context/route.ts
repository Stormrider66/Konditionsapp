import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, getBusinessContext } from '@/lib/auth-utils'
import { handleApiError } from '@/lib/api-error'

// GET /api/coach/admin/context - Get business context for current user
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({
        success: true,
        data: {
          businessId: null,
          role: null,
          business: null,
        },
      })
    }

    const context = await getBusinessContext(user.id)

    return NextResponse.json({
      success: true,
      data: context,
    })
  } catch (error) {
    return handleApiError(error, 'GET /api/coach/admin/context')
  }
}

// app/api/users/me/business/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { getUserPrimaryBusinessSlug } from '@/lib/business-context'
import { logger } from '@/lib/logger'

/**
 * GET /api/users/me/business
 * Returns the current user's primary business slug (via Prisma, bypasses RLS)
 */
export async function GET(_request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const slug = await getUserPrimaryBusinessSlug(user.id)

    return NextResponse.json({
      success: true,
      data: { slug },
    })
  } catch (error) {
    logger.error('Error fetching user business context', {}, error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch business context' },
      { status: 500 }
    )
  }
}

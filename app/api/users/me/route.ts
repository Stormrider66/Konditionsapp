// app/api/users/me/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { logger } from '@/lib/logger'

/**
 * GET /api/users/me
 * Get current authenticated user info
 */
export async function GET(_request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
        },
        { status: 401 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        language: user.language,
      },
    })
  } catch (error) {
    logger.error('Error fetching current user', {}, error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch user information',
      },
      { status: 500 }
    )
  }
}

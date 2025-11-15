// app/api/users/me/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'

/**
 * GET /api/users/me
 * Get current authenticated user info
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Obehörig',
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
    console.error('Error fetching current user:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Misslyckades med att hämta användarinformation',
      },
      { status: 500 }
    )
  }
}

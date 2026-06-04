// app/api/users/me/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { logger } from '@/lib/logger'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

/**
 * GET /api/users/me
 * Get current authenticated user info
 */
export async function GET(request: NextRequest) {
  let locale = resolveRequestLocale(request)

  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: t(locale, 'Unauthorized', 'Obehörig'),
        },
        { status: 401 }
      )
    }
    locale = resolveRequestLocale(request, user.language)

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
        error: t(locale, 'Failed to fetch user information', 'Kunde inte hämta användarinformation'),
      },
      { status: 500 }
    )
  }
}

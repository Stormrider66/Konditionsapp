// app/api/users/me/business/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { getUserPrimaryBusinessSlug } from '@/lib/business-context'
import { logger } from '@/lib/logger'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

/**
 * GET /api/users/me/business
 * Returns the current user's primary business slug (via Prisma, bypasses RLS)
 */
export async function GET(request: NextRequest) {
  let locale = resolveRequestLocale(request)

  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: t(locale, 'Unauthorized', 'Obehörig') },
        { status: 401 }
      )
    }
    locale = resolveRequestLocale(request, user.language)

    const slug = await getUserPrimaryBusinessSlug(user.id)

    return NextResponse.json({
      success: true,
      data: { slug },
    })
  } catch (error) {
    logger.error('Error fetching user business context', {}, error)
    return NextResponse.json(
      { success: false, error: t(locale, 'Failed to fetch business context', 'Kunde inte hämta verksamhetskontext') },
      { status: 500 }
    )
  }
}

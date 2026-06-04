// app/api/athlete/me/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'
import { logger } from '@/lib/logger'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

function resolveLocale(request?: Request, userLanguage?: string | null): AppLocale {
  return request ? resolveRequestLocale(request, userLanguage) : userLanguage === 'sv' ? 'sv' : 'en'
}

// GET /api/athlete/me - Get current athlete's info including sport profile
export async function GET(request?: Request) {
  let locale: AppLocale = resolveLocale(request)

  try {
    const resolved = await resolveAthleteClientId()

    if (!resolved) {
      return NextResponse.json(
        { success: false, error: t(locale, 'Unauthorized', 'Obehörig') },
        { status: 401 }
      )
    }

    locale = resolveLocale(request, resolved.user.language)
    const { clientId } = resolved

    // Get client with sport profile
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        sportProfile: true,
      },
    })

    if (!client) {
      return NextResponse.json(
        { success: false, error: t(locale, 'Client not found', 'Klienten hittades inte') },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        id: clientId,
        clientId,
        clientName: client.name,
        sportProfile: client.sportProfile,
      },
    })
  } catch (error) {
    logger.error('Error fetching athlete info', {}, error)
    return NextResponse.json(
      { success: false, error: t(locale, 'Failed to fetch athlete info', 'Kunde inte hämta atletinformation') },
      { status: 500 }
    )
  }
}

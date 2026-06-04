/**
 * Athlete Drills API
 *
 * GET - List published drills for the athlete's team
 */

import { NextResponse } from 'next/server'
import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

function resolveLocale(request?: Request, userLanguage?: string | null): AppLocale {
  return request ? resolveRequestLocale(request, userLanguage) : userLanguage === 'sv' ? 'sv' : 'en'
}

export async function GET(request?: Request) {
  let locale: AppLocale = resolveLocale(request)

  try {
    const { clientId, user } = await requireAthleteOrCoachInAthleteMode()
    locale = resolveLocale(request, user.language)
    if (!clientId) return NextResponse.json({ drills: [] })

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { teamId: true, businessId: true },
    })

    if (!client) return NextResponse.json({ drills: [] })

    const drills = await prisma.teamDrill.findMany({
      where: {
        isPublished: true,
        OR: [
          ...(client.teamId ? [{ teamId: client.teamId }] : []),
          ...(client.businessId ? [{ businessId: client.businessId, teamId: null }] : []),
        ],
      },
      select: {
        id: true,
        title: true,
        description: true,
        sportType: true,
        structure: true,
        createdAt: true,
        team: { select: { name: true } },
        createdBy: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
    })

    return NextResponse.json({ drills })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    return NextResponse.json(
      { error: t(locale, 'Failed to fetch drills', 'Kunde inte hämta övningar') },
      { status: 500 }
    )
  }
}

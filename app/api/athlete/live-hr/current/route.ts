import { NextResponse } from 'next/server'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

function resolveLocale(request?: Request, userLanguage?: string | null): AppLocale {
  return request ? resolveRequestLocale(request, userLanguage) : userLanguage === 'sv' ? 'sv' : 'en'
}

/** Returns the latest HR reading for the authenticated athlete from any active LiveHRSession */
export async function GET(request?: Request) {
  let locale: AppLocale = resolveLocale(request)

  const resolved = await resolveAthleteClientId()
  if (!resolved) {
    return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
  }

  locale = resolveLocale(request, resolved.user.language)
  const { clientId } = resolved

  // Find latest reading from any active session this athlete is participating in
  const participant = await prisma.liveHRParticipant.findFirst({
    where: {
      clientId,
      session: { status: 'ACTIVE' },
    },
    include: {
      readings: {
        orderBy: { timestamp: 'desc' },
        take: 1,
      },
    },
    orderBy: { joinedAt: 'desc' },
  })

  if (!participant || participant.readings.length === 0) {
    return NextResponse.json({ heartRate: null, zone: null, stale: true })
  }

  const reading = participant.readings[0]
  const ageMs = Date.now() - reading.timestamp.getTime()
  const stale = ageMs > 10_000

  return NextResponse.json({
    heartRate: reading.heartRate,
    zone: reading.zone,
    stale,
    timestamp: reading.timestamp.toISOString(),
  })
}

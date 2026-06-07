import { NextRequest, NextResponse } from 'next/server'

import { resolveAthleteClientId } from '@/lib/auth-utils'
import {
  EXTERNAL_ATHLETE_ACCESS_DEFAULT_SCOPES,
  buildExternalAthleteAccessUrl,
  createExternalAthleteAccessSchema,
  createExternalAthleteAccessToken,
  getExternalAthleteAccessDefaultExpiryDate,
  hashExternalAthleteAccessToken,
  serializeExternalAthleteAccess,
} from '@/lib/external-athlete-access'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'
import { logError } from '@/lib/logger-console'
import { prisma } from '@/lib/prisma'

function t(locale: AppLocale, en: string, sv: string) {
  return locale === 'sv' ? sv : en
}

export async function GET(request: NextRequest) {
  let locale: AppLocale = resolveRequestLocale(request)

  try {
    const athleteAccess = await resolveAthleteClientId()
    if (!athleteAccess) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }

    locale = resolveRequestLocale(request, athleteAccess.user.language)
    const includeRevoked = request.nextUrl.searchParams.get('includeRevoked') === 'true'

    const grants = await prisma.athleteExternalAccess.findMany({
      where: {
        athleteClientId: athleteAccess.clientId,
        ...(includeRevoked ? {} : { revokedAt: null }),
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: [{ revokedAt: 'asc' }, { createdAt: 'desc' }],
    })

    return NextResponse.json({ externalAccess: grants.map(serializeExternalAthleteAccess) })
  } catch (error) {
    logError('List athlete-owned external access error:', error)
    return NextResponse.json(
      { error: t(locale, 'Failed to list external access', 'Misslyckades med att hämta extern åtkomst') },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  let locale: AppLocale = resolveRequestLocale(request)

  try {
    const athleteAccess = await resolveAthleteClientId()
    if (!athleteAccess) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }

    locale = resolveRequestLocale(request, athleteAccess.user.language)
    const client = await prisma.client.findUnique({
      where: { id: athleteAccess.clientId },
      select: { id: true, businessId: true },
    })
    if (!client) {
      return NextResponse.json({ error: t(locale, 'Athlete not found', 'Aktiven hittades inte') }, { status: 404 })
    }

    const parsed = createExternalAthleteAccessSchema.safeParse(await request.json().catch(() => ({})))
    if (!parsed.success) {
      return NextResponse.json(
        { error: t(locale, 'Invalid external access details', 'Ogiltiga uppgifter för extern åtkomst') },
        { status: 400 }
      )
    }

    const token = createExternalAthleteAccessToken()
    const expiresAt = parsed.data.expiresAt === null
      ? null
      : parsed.data.expiresAt
        ? new Date(parsed.data.expiresAt)
        : getExternalAthleteAccessDefaultExpiryDate()

    const access = await prisma.athleteExternalAccess.create({
      data: {
        tokenHash: hashExternalAthleteAccessToken(token),
        athleteClientId: client.id,
        businessId: client.businessId,
        createdByUserId: athleteAccess.user.id,
        viewerName: parsed.data.viewerName,
        viewerEmail: parsed.data.viewerEmail,
        organizationName: parsed.data.organizationName,
        organizationType: parsed.data.organizationType,
        roleLabel: parsed.data.roleLabel,
        note: parsed.data.note,
        expiresAt,
        scopes: parsed.data.scopes ?? [...EXTERNAL_ATHLETE_ACCESS_DEFAULT_SCOPES],
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
      },
    })

    return NextResponse.json({
      externalAccess: serializeExternalAthleteAccess(access),
      token,
      shareUrl: buildExternalAthleteAccessUrl(request.nextUrl.origin, token),
    }, { status: 201 })
  } catch (error) {
    logError('Create athlete-owned external access error:', error)
    return NextResponse.json(
      { error: t(locale, 'Failed to create external access', 'Misslyckades med att skapa extern åtkomst') },
      { status: 500 }
    )
  }
}

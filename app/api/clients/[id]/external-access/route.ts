import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { canAccessClient, requireCoach } from '@/lib/auth-utils'
import {
  EXTERNAL_ATHLETE_ACCESS_DEFAULT_SCOPES,
  buildExternalAthleteAccessUrl,
  createExternalAthleteAccessToken,
  getExternalAthleteAccessStatus,
  hashExternalAthleteAccessToken,
} from '@/lib/external-athlete-access'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'
import { logError } from '@/lib/logger-console'
import { prisma } from '@/lib/prisma'

function t(locale: AppLocale, en: string, sv: string) {
  return locale === 'sv' ? sv : en
}

const optionalText = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().trim().max(250).optional()
)

const createExternalAccessSchema = z.object({
  viewerName: optionalText,
  viewerEmail: z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z.string().trim().email().max(250).optional()
  ),
  organizationName: optionalText,
  organizationType: optionalText,
  roleLabel: optionalText,
  note: z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z.string().trim().max(1000).optional()
  ),
  expiresAt: z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z.string().datetime().optional().nullable()
  ),
  scopes: z.array(z.enum(['calendar', 'workouts', 'tests'])).min(1).optional(),
})

function defaultExpiryDate() {
  const expiresAt = new Date()
  expiresAt.setUTCDate(expiresAt.getUTCDate() + 120)
  return expiresAt
}

function serializeAccess(access: {
  id: string
  viewerName: string | null
  viewerEmail: string | null
  organizationName: string | null
  organizationType: string | null
  roleLabel: string | null
  accessLevel: string
  scopes: string[]
  note: string | null
  expiresAt: Date | null
  revokedAt: Date | null
  lastViewedAt: Date | null
  viewCount: number
  createdAt: Date
  updatedAt: Date
  createdBy?: { id: string; name: string; email: string } | null
}) {
  return {
    id: access.id,
    viewerName: access.viewerName,
    viewerEmail: access.viewerEmail,
    organizationName: access.organizationName,
    organizationType: access.organizationType,
    roleLabel: access.roleLabel,
    accessLevel: access.accessLevel,
    scopes: access.scopes,
    note: access.note,
    expiresAt: access.expiresAt,
    revokedAt: access.revokedAt,
    lastViewedAt: access.lastViewedAt,
    viewCount: access.viewCount,
    status: getExternalAthleteAccessStatus(access),
    createdAt: access.createdAt,
    updatedAt: access.updatedAt,
    createdBy: access.createdBy ?? null,
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let locale: AppLocale = resolveRequestLocale(request)

  try {
    const user = await requireCoach()
    locale = resolveRequestLocale(request, user.language)
    const { id: clientId } = await params
    const includeRevoked = request.nextUrl.searchParams.get('includeRevoked') === 'true'

    const hasAccess = await canAccessClient(user.id, clientId)
    if (!hasAccess) {
      return NextResponse.json({ error: t(locale, 'Athlete not found', 'Aktiven hittades inte') }, { status: 404 })
    }

    const grants = await prisma.athleteExternalAccess.findMany({
      where: {
        athleteClientId: clientId,
        ...(includeRevoked ? {} : { revokedAt: null }),
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: [{ revokedAt: 'asc' }, { createdAt: 'desc' }],
    })

    return NextResponse.json({ externalAccess: grants.map(serializeAccess) })
  } catch (error) {
    logError('List external athlete access error:', error)
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    return NextResponse.json(
      { error: t(locale, 'Failed to list external access', 'Misslyckades med att hämta extern åtkomst') },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let locale: AppLocale = resolveRequestLocale(request)

  try {
    const user = await requireCoach()
    locale = resolveRequestLocale(request, user.language)
    const { id: clientId } = await params

    const hasAccess = await canAccessClient(user.id, clientId)
    if (!hasAccess) {
      return NextResponse.json({ error: t(locale, 'Athlete not found', 'Aktiven hittades inte') }, { status: 404 })
    }

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true, businessId: true },
    })
    if (!client) {
      return NextResponse.json({ error: t(locale, 'Athlete not found', 'Aktiven hittades inte') }, { status: 404 })
    }

    const parsed = createExternalAccessSchema.safeParse(await request.json().catch(() => ({})))
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
        : defaultExpiryDate()

    const access = await prisma.athleteExternalAccess.create({
      data: {
        tokenHash: hashExternalAthleteAccessToken(token),
        athleteClientId: client.id,
        businessId: client.businessId,
        createdByUserId: user.id,
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
      externalAccess: serializeAccess(access),
      token,
      shareUrl: buildExternalAthleteAccessUrl(request.nextUrl.origin, token),
    }, { status: 201 })
  } catch (error) {
    logError('Create external athlete access error:', error)
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    return NextResponse.json(
      { error: t(locale, 'Failed to create external access', 'Misslyckades med att skapa extern åtkomst') },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'

import { canAccessClient, requireCoach } from '@/lib/auth-utils'
import { getExternalAthleteAccessStatus } from '@/lib/external-athlete-access'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'
import { logError } from '@/lib/logger-console'
import { prisma } from '@/lib/prisma'

function t(locale: AppLocale, en: string, sv: string) {
  return locale === 'sv' ? sv : en
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; accessId: string }> }
) {
  let locale: AppLocale = resolveRequestLocale(request)

  try {
    const user = await requireCoach()
    locale = resolveRequestLocale(request, user.language)
    const { id: clientId, accessId } = await params

    const hasAccess = await canAccessClient(user.id, clientId)
    if (!hasAccess) {
      return NextResponse.json({ error: t(locale, 'Athlete not found', 'Aktiven hittades inte') }, { status: 404 })
    }

    const existing = await prisma.athleteExternalAccess.findFirst({
      where: { id: accessId, athleteClientId: clientId },
      select: { id: true },
    })
    if (!existing) {
      return NextResponse.json({ error: t(locale, 'External access not found', 'Extern åtkomst hittades inte') }, { status: 404 })
    }

    const access = await prisma.athleteExternalAccess.update({
      where: { id: accessId },
      data: { revokedAt: new Date() },
      select: {
        id: true,
        viewerName: true,
        viewerEmail: true,
        organizationName: true,
        organizationType: true,
        roleLabel: true,
        accessLevel: true,
        scopes: true,
        note: true,
        expiresAt: true,
        revokedAt: true,
        lastViewedAt: true,
        viewCount: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({
      externalAccess: {
        ...access,
        status: getExternalAthleteAccessStatus(access),
      },
    })
  } catch (error) {
    logError('Revoke external athlete access error:', error)
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    return NextResponse.json(
      { error: t(locale, 'Failed to revoke external access', 'Misslyckades med att återkalla extern åtkomst') },
      { status: 500 }
    )
  }
}

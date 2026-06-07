import { NextRequest, NextResponse } from 'next/server'

import { resolveAthleteClientId } from '@/lib/auth-utils'
import { getExternalAthleteAccessStatus } from '@/lib/external-athlete-access'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'
import { logError } from '@/lib/logger-console'
import { prisma } from '@/lib/prisma'

function t(locale: AppLocale, en: string, sv: string) {
  return locale === 'sv' ? sv : en
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ accessId: string }> }
) {
  let locale: AppLocale = resolveRequestLocale(request)

  try {
    const athleteAccess = await resolveAthleteClientId()
    if (!athleteAccess) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }

    locale = resolveRequestLocale(request, athleteAccess.user.language)
    const { accessId } = await params

    const existing = await prisma.athleteExternalAccess.findFirst({
      where: { id: accessId, athleteClientId: athleteAccess.clientId },
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
    logError('Revoke athlete-owned external access error:', error)
    return NextResponse.json(
      { error: t(locale, 'Failed to revoke external access', 'Misslyckades med att återkalla extern åtkomst') },
      { status: 500 }
    )
  }
}

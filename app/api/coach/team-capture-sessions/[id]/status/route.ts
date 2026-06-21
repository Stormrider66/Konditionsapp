import { NextRequest, NextResponse } from 'next/server'
import { TeamCaptureSessionStatus } from '@prisma/client'
import { z } from 'zod'

import { requireCoach } from '@/lib/auth-utils'
import { getRequestedBusinessScope } from '@/lib/auth/current-user'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'
import { logger } from '@/lib/logger'
import { updateTeamCaptureSessionStatus } from '@/lib/team-capture/service'

interface RouteContext {
  params: Promise<{ id: string }>
}

const statusSchema = z.object({
  status: z.nativeEnum(TeamCaptureSessionStatus),
})

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  let locale: AppLocale = resolveRequestLocale(request)

  try {
    const user = await requireCoach()
    locale = resolveRequestLocale(request, user.language)
    const { id } = await context.params
    const scope = getRequestedBusinessScope(request)
    const parsed = statusSchema.safeParse(await request.json().catch(() => ({})))

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: t(locale, 'Invalid status', 'Ogiltig status'), details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const session = await updateTeamCaptureSessionStatus(user.id, id, parsed.data.status, scope.businessSlug)
    if (!session) {
      return NextResponse.json(
        { success: false, error: t(locale, 'Team cardio session not found', 'Lagkonditionen hittades inte') },
        { status: 404 },
      )
    }

    return NextResponse.json({ success: true, data: session })
  } catch (error) {
    logger.error('Failed to update team capture status', {}, error)
    return NextResponse.json(
      { success: false, error: t(locale, 'Failed to update status', 'Kunde inte uppdatera status') },
      { status: 500 },
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { TeamCaptureSessionStatus } from '@prisma/client'
import { z } from 'zod'

import { requireCoach } from '@/lib/auth-utils'
import { getRequestedBusinessScope } from '@/lib/auth/current-user'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'
import { logger } from '@/lib/logger'
import {
  getAccessibleTeamCaptureSession,
  updateTeamCaptureSessionStatus,
} from '@/lib/team-capture/service'

interface RouteContext {
  params: Promise<{ id: string }>
}

const updateSchema = z.object({
  status: z.nativeEnum(TeamCaptureSessionStatus),
})

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

export async function GET(request: NextRequest, context: RouteContext) {
  let locale: AppLocale = resolveRequestLocale(request)

  try {
    const user = await requireCoach()
    locale = resolveRequestLocale(request, user.language)
    const { id } = await context.params
    const scope = getRequestedBusinessScope(request)
    const session = await getAccessibleTeamCaptureSession(user.id, id, scope.businessSlug)

    if (!session) {
      return NextResponse.json(
        { success: false, error: t(locale, 'Capture session not found', 'Fångstpasset hittades inte') },
        { status: 404 },
      )
    }

    return NextResponse.json({ success: true, data: session })
  } catch (error) {
    logger.error('Failed to load team capture session', {}, error)
    return NextResponse.json(
      { success: false, error: t(locale, 'Failed to load capture session', 'Kunde inte läsa fångstpass') },
      { status: 500 },
    )
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  let locale: AppLocale = resolveRequestLocale(request)

  try {
    const user = await requireCoach()
    locale = resolveRequestLocale(request, user.language)
    const { id } = await context.params
    const scope = getRequestedBusinessScope(request)
    const parsed = updateSchema.safeParse(await request.json().catch(() => ({})))

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: t(locale, 'Invalid status update', 'Ogiltig statusuppdatering'), details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const session = await updateTeamCaptureSessionStatus(user.id, id, parsed.data.status, scope.businessSlug)
    if (!session) {
      return NextResponse.json(
        { success: false, error: t(locale, 'Capture session not found', 'Fångstpasset hittades inte') },
        { status: 404 },
      )
    }

    return NextResponse.json({ success: true, data: session })
  } catch (error) {
    logger.error('Failed to update team capture session', {}, error)
    return NextResponse.json(
      { success: false, error: t(locale, 'Failed to update capture session', 'Kunde inte uppdatera fångstpass') },
      { status: 500 },
    )
  }
}

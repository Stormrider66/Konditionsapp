import { NextRequest, NextResponse } from 'next/server'

import { requireCoach } from '@/lib/auth-utils'
import { getRequestedBusinessScope } from '@/lib/auth/current-user'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'
import { logger } from '@/lib/logger'
import { resolveTeamCaptureSession } from '@/lib/team-capture/service'

interface RouteContext {
  params: Promise<{ id: string }>
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

export async function POST(request: NextRequest, context: RouteContext) {
  let locale: AppLocale = resolveRequestLocale(request)

  try {
    const user = await requireCoach()
    locale = resolveRequestLocale(request, user.language)
    const { id } = await context.params
    const scope = getRequestedBusinessScope(request)
    const result = await resolveTeamCaptureSession(user.id, id, scope.businessSlug)

    if (!result) {
      return NextResponse.json(
        { success: false, error: t(locale, 'Team cardio session not ready to resolve', 'Lagkonditionen är inte redo att sammanställas') },
        { status: 400 },
      )
    }

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    logger.error('Failed to resolve team capture session', {}, error)
    return NextResponse.json(
      { success: false, error: t(locale, 'Failed to resolve team cardio session', 'Kunde inte sammanställa lagkondition') },
      { status: 500 },
    )
  }
}

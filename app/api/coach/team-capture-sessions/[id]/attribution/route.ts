import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { requireCoach } from '@/lib/auth-utils'
import { getRequestedBusinessScope } from '@/lib/auth/current-user'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'
import { logger } from '@/lib/logger'
import { overrideTeamCaptureSegment } from '@/lib/team-capture/service'

interface RouteContext {
  params: Promise<{ id: string }>
}

const attributionSchema = z.object({
  segmentId: z.string().uuid(),
  clientId: z.string().uuid().optional(),
  actualStartAt: z.string().datetime().nullable().optional(),
  actualEndAt: z.string().datetime().nullable().optional(),
  summary: z.record(z.unknown()).nullable().optional(),
  reason: z.string().max(1000).nullable().optional(),
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
    const parsed = attributionSchema.safeParse(await request.json().catch(() => ({})))

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: t(locale, 'Invalid attribution update', 'Ogiltig justering'), details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const data = parsed.data
    const session = await overrideTeamCaptureSegment(user.id, id, data.segmentId, {
      clientId: data.clientId,
      actualStartAt: data.actualStartAt === undefined
        ? undefined
        : data.actualStartAt
          ? new Date(data.actualStartAt)
          : null,
      actualEndAt: data.actualEndAt === undefined
        ? undefined
        : data.actualEndAt
          ? new Date(data.actualEndAt)
          : null,
      summary: data.summary,
      reason: data.reason,
    }, scope.businessSlug)

    if (!session) {
      return NextResponse.json(
        { success: false, error: t(locale, 'Segment not found', 'Segmentet hittades inte') },
        { status: 404 },
      )
    }

    return NextResponse.json({ success: true, data: session })
  } catch (error) {
    logger.error('Failed to update team capture attribution', {}, error)
    return NextResponse.json(
      { success: false, error: t(locale, 'Failed to update attribution', 'Kunde inte justera kopplingen') },
      { status: 500 },
    )
  }
}

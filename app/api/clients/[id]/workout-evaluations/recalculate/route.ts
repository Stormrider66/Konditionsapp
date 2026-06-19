import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { requireAuth } from '@/lib/api/utils'
import { canAccessClient } from '@/lib/auth-utils'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'
import { logger } from '@/lib/logger'
import { recalculateWorkoutEvaluationsForClient } from '@/lib/workout-evaluation'

type RouteParams = {
  params: Promise<{ id: string }>
}

const recalculateSchema = z.object({
  days: z.number().int().min(1).max(365).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
})

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

function startDaysAgo(days: number): Date {
  const date = new Date()
  date.setDate(date.getDate() - days)
  date.setHours(0, 0, 0, 0)
  return date
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  let locale = resolveRequestLocale(request)

  try {
    const user = await requireAuth()
    locale = resolveRequestLocale(request, user.language)
    const { id: clientId } = await params

    if (user.role === 'ATHLETE') {
      return NextResponse.json(
        { success: false, error: t(locale, 'Staff access required', 'Personalbehörighet krävs') },
        { status: 403 },
      )
    }

    const hasAccess = await canAccessClient(user.id, clientId)
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: t(locale, 'Client not found or unauthorized', 'Klienten hittades inte eller saknar behörighet') },
        { status: 404 },
      )
    }

    const body = await request.json().catch(() => ({}))
    const parsed = recalculateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: t(locale, 'Invalid recalculation request', 'Ogiltig omräkningsbegäran'), details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const days = parsed.data.days ?? 30
    const startDate = parsed.data.startDate ? new Date(parsed.data.startDate) : startDaysAgo(days)
    const endDate = parsed.data.endDate ? new Date(parsed.data.endDate) : new Date()

    const result = await recalculateWorkoutEvaluationsForClient({
      clientId,
      startDate,
      endDate,
      deleteMissing: true,
    })

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    logger.error('Failed to recalculate workout evaluations', {}, error)
    return NextResponse.json(
      { success: false, error: t(locale, 'Failed to recalculate workout evaluations', 'Kunde inte räkna om träningsutvärderingar') },
      { status: 500 },
    )
  }
}

/**
 * Client Load Summary API
 *
 * GET /api/clients/:id/load-summary
 *
 * Coach-facing per-athlete view of TrainingLoad: latest ACWR + zone +
 * a 30-day series for a sparkline. Feeds the Analys tab's load card.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, handleApiError } from '@/lib/api/utils'
import { canAccessClient } from '@/lib/auth-utils'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

type AcwrZone = 'DETRAINING' | 'OPTIMAL' | 'CAUTION' | 'DANGER' | 'CRITICAL'

interface LoadPoint {
  date: string
  acwr: number | null
  acuteLoad: number | null
  chronicLoad: number | null
  zone: AcwrZone | null
}

const HISTORY_DAYS = 30

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const locale = resolveRequestLocale(request, user.language)
    const { id: clientId } = await params

    const hasAccess = await canAccessClient(user.id, clientId)
    if (!hasAccess) {
      return NextResponse.json({ error: t(locale, 'Forbidden', 'Åtkomst nekad') }, { status: 403 })
    }

    const since = new Date()
    since.setDate(since.getDate() - HISTORY_DAYS)

    const rows = await prisma.trainingLoad.findMany({
      where: {
        clientId,
        date: { gte: since },
      },
      orderBy: { date: 'asc' },
      select: {
        date: true,
        acwr: true,
        acuteLoad: true,
        chronicLoad: true,
        acwrZone: true,
      },
    })

    const series: LoadPoint[] = rows.map((r) => ({
      date: r.date.toISOString(),
      acwr: r.acwr ?? null,
      acuteLoad: r.acuteLoad ?? null,
      chronicLoad: r.chronicLoad ?? null,
      zone: (r.acwrZone as AcwrZone | null) ?? null,
    }))

    // Latest non-null ACWR — walk from the end since some rows might
    // be raw load entries without ACWR computed (cron computes it later).
    let latest: LoadPoint | null = null
    for (let i = series.length - 1; i >= 0; i--) {
      if (series[i].acwr != null) {
        latest = series[i]
        break
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        latest,
        series,
      },
    })
  } catch (error: unknown) {
    return handleApiError(error)
  }
}

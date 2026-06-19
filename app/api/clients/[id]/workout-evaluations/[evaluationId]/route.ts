import { NextRequest, NextResponse } from 'next/server'

import { requireAuth } from '@/lib/api/utils'
import { canAccessClient } from '@/lib/auth-utils'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'
import { logger } from '@/lib/logger'
import { prisma } from '@/lib/prisma'

type RouteParams = {
  params: Promise<{ id: string; evaluationId: string }>
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  let locale = resolveRequestLocale(request)

  try {
    const user = await requireAuth()
    locale = resolveRequestLocale(request, user.language)
    const { id: clientId, evaluationId } = await params

    const hasAccess = await canAccessClient(user.id, clientId)
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: t(locale, 'Client not found or unauthorized', 'Klienten hittades inte eller saknar behörighet') },
        { status: 404 },
      )
    }

    const evaluation = await prisma.workoutEvaluation.findFirst({
      where: {
        id: evaluationId,
        clientId,
      },
      select: {
        id: true,
        startedAt: true,
        completedAt: true,
        sourceLinks: true,
        summary: true,
        timelinePreview: true,
        segmentEvaluations: true,
        zoneSummary: true,
        fatigueSummary: true,
        readinessContext: true,
        confidence: true,
        primarySource: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!evaluation) {
      return NextResponse.json(
        { success: false, error: t(locale, 'Workout evaluation not found', 'Träningsutvärderingen hittades inte') },
        { status: 404 },
      )
    }

    return NextResponse.json({
      success: true,
      data: evaluation,
    })
  } catch (error) {
    logger.error('Failed to load workout evaluation detail', {}, error)
    return NextResponse.json(
      { success: false, error: t(locale, 'Failed to load workout evaluation', 'Kunde inte läsa träningsutvärderingen') },
      { status: 500 },
    )
  }
}

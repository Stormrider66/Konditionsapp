import { NextRequest, NextResponse } from 'next/server'

import { requireAuth } from '@/lib/api/utils'
import { canAccessClient } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'
import { recalculateWorkoutEvaluationsForClient } from '@/lib/workout-evaluation'

type RouteParams = {
  params: Promise<{ id: string }>
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

function clampInt(value: string | null, fallback: number, min: number, max: number): number {
  const parsed = Number(value ?? fallback)
  return Number.isFinite(parsed) ? Math.min(Math.max(Math.floor(parsed), min), max) : fallback
}

function daysAgo(days: number): Date {
  const date = new Date()
  date.setDate(date.getDate() - days)
  date.setHours(0, 0, 0, 0)
  return date
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  let locale = resolveRequestLocale(request)

  try {
    const user = await requireAuth()
    locale = resolveRequestLocale(request, user.language)
    const { id: clientId } = await params

    const hasAccess = await canAccessClient(user.id, clientId)
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: t(locale, 'Client not found or unauthorized', 'Klienten hittades inte eller saknar behörighet') },
        { status: 404 },
      )
    }

    const days = clampInt(request.nextUrl.searchParams.get('days'), 30, 1, 180)
    const limit = clampInt(request.nextUrl.searchParams.get('limit'), 20, 1, 100)
    const startDate = daysAgo(days)

    let evaluations = await prisma.workoutEvaluation.findMany({
      where: {
        clientId,
        startedAt: { gte: startDate },
      },
      orderBy: { startedAt: 'desc' },
      take: limit,
      select: {
        id: true,
        startedAt: true,
        completedAt: true,
        sourceLinks: true,
        summary: true,
        zoneSummary: true,
        fatigueSummary: true,
        readinessContext: true,
        confidence: true,
        primarySource: true,
        updatedAt: true,
      },
    })

    if (evaluations.length === 0) {
      await recalculateWorkoutEvaluationsForClient({
        clientId,
        startDate,
        endDate: new Date(),
        deleteMissing: false,
      })

      evaluations = await prisma.workoutEvaluation.findMany({
        where: {
          clientId,
          startedAt: { gte: startDate },
        },
        orderBy: { startedAt: 'desc' },
        take: limit,
        select: {
          id: true,
          startedAt: true,
          completedAt: true,
          sourceLinks: true,
          summary: true,
          zoneSummary: true,
          fatigueSummary: true,
          readinessContext: true,
          confidence: true,
          primarySource: true,
          updatedAt: true,
        },
      })
    }

    return NextResponse.json({
      success: true,
      data: evaluations,
    })
  } catch (error) {
    logger.error('Failed to load workout evaluations', {}, error)
    return NextResponse.json(
      { success: false, error: t(locale, 'Failed to load workout evaluations', 'Kunde inte läsa träningsutvärderingar') },
      { status: 500 },
    )
  }
}

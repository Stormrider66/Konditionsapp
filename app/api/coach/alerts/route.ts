/**
 * Coach Alerts API
 *
 * GET /api/coach/alerts - Get active alerts for coach
 */

import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getRequestedBusinessScope, requireCoach } from '@/lib/auth-utils'
import { getBusinessMembership } from '@/lib/coach/team-access'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

function openAlertStatusWhere(now: Date): Prisma.CoachAlertWhereInput {
  return {
    OR: [
      { status: 'ACTIVE' },
      { status: 'SNOOZED', snoozedUntil: { lte: now } },
    ],
  }
}

function statusWhere(status: string, now: Date): Prisma.CoachAlertWhereInput {
  if (status === 'all') return {}
  if (status === 'open' || status === 'ACTIVE') return openAlertStatusWhere(now)
  if (status === 'SNOOZED' || status === 'snoozed') {
    return { status: 'SNOOZED', snoozedUntil: { gt: now } }
  }
  return { status }
}

function unexpiredAlertWhere(now: Date): Prisma.CoachAlertWhereInput {
  return {
    OR: [
      { expiresAt: null },
      { expiresAt: { gt: now } },
    ],
  }
}

export async function GET(request: NextRequest) {
  let locale: AppLocale = resolveRequestLocale(request)

  try {
    const user = await requireCoach()
    locale = resolveRequestLocale(request, user.language)
    const scope = getRequestedBusinessScope(request)
    const membership = await getBusinessMembership(user.id, scope.businessSlug)

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'open'
    const alertType = searchParams.get('type')
    const severity = searchParams.get('severity')
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const now = new Date()

    // Build where clause
    const where: Prisma.CoachAlertWhereInput = {
      coachId: user.id,
    }
    const clientWhere = membership?.businessId
      ? { businessId: membership.businessId }
      : { userId: user.id }

    where.client = clientWhere
    where.AND = [
      statusWhere(status, now),
      unexpiredAlertWhere(now),
    ]

    if (alertType) {
      where.alertType = alertType
    }

    if (severity) {
      where.severity = severity
    }

    // Fetch alerts with client info
    const alerts = await prisma.coachAlert.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            sportProfile: {
              select: {
                primarySport: true,
              },
            },
          },
        },
      },
      orderBy: [
        // Critical first, then high, medium, low
        { severity: 'desc' },
        { createdAt: 'desc' },
      ],
      take: limit,
    })

    // Custom sort to ensure CRITICAL > HIGH > MEDIUM > LOW
    const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }
    alerts.sort((a, b) => {
      const aOrder = severityOrder[a.severity as keyof typeof severityOrder] ?? 4
      const bOrder = severityOrder[b.severity as keyof typeof severityOrder] ?? 4
      if (aOrder !== bOrder) return aOrder - bOrder
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

    // Get counts by type and severity
    const counts = await prisma.coachAlert.groupBy({
      by: ['alertType', 'severity'],
      where: {
        coachId: user.id,
        client: clientWhere,
        AND: [
          openAlertStatusWhere(now),
          unexpiredAlertWhere(now),
        ],
      },
      _count: true,
    })

    const summary = {
      total: alerts.length,
      byType: {} as Record<string, number>,
      bySeverity: {} as Record<string, number>,
    }

    for (const count of counts) {
      summary.byType[count.alertType] = (summary.byType[count.alertType] || 0) + count._count
      summary.bySeverity[count.severity] = (summary.bySeverity[count.severity] || 0) + count._count
    }

    return NextResponse.json({
      alerts,
      summary,
    })
  } catch (error) {
    // Handle redirect from requireCoach
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }

    console.error('Error fetching coach alerts:', error)
    return NextResponse.json({ error: t(locale, 'Failed to fetch alerts', 'Kunde inte hämta varningar') }, { status: 500 })
  }
}

/**
 * Coach Alerts API
 *
 * GET /api/coach/alerts - Get active alerts for coach
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireCoach } from '@/lib/auth-utils'

export async function GET(request: NextRequest) {
  try {
    const user = await requireCoach()

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'ACTIVE'
    const alertType = searchParams.get('type')
    const severity = searchParams.get('severity')
    const limit = parseInt(searchParams.get('limit') || '50', 10)

    // Build where clause
    const where: Record<string, unknown> = {
      coachId: user.id,
    }

    if (status !== 'all') {
      where.status = status
    }

    if (alertType) {
      where.alertType = alertType
    }

    if (severity) {
      where.severity = severity
    }

    // Filter out expired alerts
    where.OR = [
      { expiresAt: null },
      { expiresAt: { gt: new Date() } },
    ]

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
        status: 'ACTIVE',
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.error('Error fetching coach alerts:', error)
    return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 })
  }
}

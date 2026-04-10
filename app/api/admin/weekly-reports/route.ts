/**
 * Weekly Reports Admin API
 *
 * GET /api/admin/weekly-reports — List weekly reports with filters
 * GET /api/admin/weekly-reports?id=xxx — Get a single report by ID
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-utils'
import { logger } from '@/lib/logger'

export async function GET(req: NextRequest) {
  try {
    await requireAdmin()

    const searchParams = req.nextUrl.searchParams
    const id = searchParams.get('id')

    if (id) {
      const report = await prisma.weeklyReport.findUnique({
        where: { id },
      })

      if (!report) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
      }

      // Mark as read when accessed
      if (!report.readAt) {
        await prisma.weeklyReport.update({
          where: { id },
          data: { readAt: new Date() },
        })
      }

      return NextResponse.json({ report })
    }

    // List mode with filters
    const reportType = searchParams.get('type') // BI_WEEKLY | COMPETITOR | MARKETING_WEEKLY
    const weeks = parseInt(searchParams.get('weeks') || '12', 10)
    const since = new Date(Date.now() - weeks * 7 * 24 * 60 * 60 * 1000)

    const reports = await prisma.weeklyReport.findMany({
      where: {
        weekStart: { gte: since },
        ...(reportType ? { reportType } : {}),
      },
      orderBy: { weekStart: 'desc' },
      take: 50,
      select: {
        id: true,
        weekStart: true,
        reportType: true,
        title: true,
        createdAt: true,
        emailedAt: true,
        readAt: true,
      },
    })

    // Counts by type
    const counts = await prisma.weeklyReport.groupBy({
      by: ['reportType'],
      where: { weekStart: { gte: since } },
      _count: true,
    })

    return NextResponse.json({
      reports,
      counts: Object.fromEntries(counts.map(c => [c.reportType, c._count])),
      totalCount: reports.length,
    })
  } catch (error) {
    logger.error('[admin/weekly-reports] Failed', {}, error)
    return NextResponse.json({ error: 'Unauthorized or error' }, { status: 401 })
  }
}

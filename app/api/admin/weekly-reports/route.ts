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
  // Separate auth check from data fetch for accurate status codes
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const searchParams = req.nextUrl.searchParams
    const id = searchParams.get('id')

    if (id) {
      try {
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
          }).catch(() => { /* best-effort */ })
        }

        return NextResponse.json({ report })
      } catch (dbError) {
        logger.warn('[admin/weekly-reports] WeeklyReport query failed', {
          error: dbError instanceof Error ? dbError.message : String(dbError),
        })
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
      }
    }

    // List mode with filters
    const reportType = searchParams.get('type')
    const weeks = parseInt(searchParams.get('weeks') || '12', 10)
    const since = new Date(Date.now() - weeks * 7 * 24 * 60 * 60 * 1000)

    // Graceful fallback: if the WeeklyReport table doesn't exist yet
    // (migration not run), return empty lists instead of crashing.
    let reports: Array<{
      id: string
      weekStart: Date
      reportType: string
      title: string
      createdAt: Date
      emailedAt: Date | null
      readAt: Date | null
    }> = []
    let countsMap: Record<string, number> = {}

    try {
      reports = await prisma.weeklyReport.findMany({
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

      const counts = await prisma.weeklyReport.groupBy({
        by: ['reportType'],
        where: { weekStart: { gte: since } },
        _count: true,
      })
      countsMap = Object.fromEntries(counts.map(c => [c.reportType, c._count]))
    } catch (dbError) {
      logger.warn('[admin/weekly-reports] WeeklyReport query failed — returning empty', {
        error: dbError instanceof Error ? dbError.message : String(dbError),
        hint: 'If this is P2021 (table not found), run the Prisma migration.',
      })
      reports = []
      countsMap = {}
    }

    return NextResponse.json({
      reports,
      counts: countsMap,
      totalCount: reports.length,
    })
  } catch (error) {
    logger.error('[admin/weekly-reports] Unexpected error', {}, error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

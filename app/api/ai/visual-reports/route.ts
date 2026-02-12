/**
 * Visual Reports List API
 *
 * GET /api/ai/visual-reports?clientId=...&reportType=...&testId=...&limit=10
 * Returns existing visual reports for a client (no regeneration).
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, canAccessClient } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = request.nextUrl
    const clientId = searchParams.get('clientId')
    const reportType = searchParams.get('reportType')
    const testId = searchParams.get('testId')
    const programId = searchParams.get('programId')
    const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10), 50)

    if (!clientId) {
      return NextResponse.json({ error: 'clientId is required' }, { status: 400 })
    }

    // Verify access
    const hasAccess = await canAccessClient(user.id, clientId)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const where: Record<string, unknown> = { clientId }
    if (reportType) where.reportType = reportType
    if (testId) where.testId = testId
    if (programId) where.programId = programId

    const reports = await prisma.visualReport.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        reportType: true,
        sportType: true,
        imageUrl: true,
        model: true,
        testId: true,
        programId: true,
        periodStart: true,
        periodEnd: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ success: true, reports })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to fetch visual reports', message: errorMessage },
      { status: 500 }
    )
  }
}

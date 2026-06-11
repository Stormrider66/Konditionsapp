/**
 * Visual Report Image API
 *
 * GET /api/ai/visual-reports/[id]/image — redirect to a short-lived signed
 * URL for the report image in the private visual-reports bucket. Accessible
 * to any user with access to the report's client (coach, staff, or the
 * athlete themselves via canAccessClient).
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, canAccessClient } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { createVisualReportSignedUrl } from '@/lib/ai/visual-reports/storage'
import { logger } from '@/lib/logger'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const report = await prisma.visualReport.findUnique({
      where: { id },
      select: { clientId: true, storagePath: true },
    })

    if (!report) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const hasAccess = await canAccessClient(user.id, report.clientId)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const signedUrl = await createVisualReportSignedUrl(report.storagePath)
    return NextResponse.redirect(signedUrl, 302)
  } catch (error) {
    logger.error('Visual report image redirect failed', {}, error)
    return NextResponse.json({ error: 'Failed to load image' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, canAccessClient } from '@/lib/auth-utils'
import { logError } from '@/lib/logger-console'
import { buildCardioSessionSummary } from '@/lib/cardio/session-summary'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

/**
 * GET /api/cardio-sessions/[id]/summary
 * Post-workout summary for a cardio assignment: round splits, fade,
 * per-equipment comparison, calorie adherence. [id] is the assignment id.
 * Accessible to the athlete who owns the assignment and to coaches/physios
 * with access to the athlete (canAccessClient).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let locale: AppLocale = resolveRequestLocale(request)

  try {
    const { id: assignmentId } = await params
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: t(locale, 'Unauthorized', 'Obehörig') },
        { status: 401 }
      )
    }
    locale = resolveRequestLocale(request, user.language)

    const assignment = await prisma.cardioSessionAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        session: {
          select: {
            id: true,
            name: true,
            description: true,
            sport: true,
            segments: true,
          },
        },
        athlete: { select: { id: true, name: true } },
      },
    })

    if (!assignment) {
      return NextResponse.json(
        { success: false, error: t(locale, 'Assignment not found', 'Tilldelningen hittades inte') },
        { status: 404 }
      )
    }

    if (!(await canAccessClient(user.id, assignment.athleteId))) {
      return NextResponse.json(
        { success: false, error: t(locale, 'Unauthorized', 'Obehörig') },
        { status: 403 }
      )
    }

    // Prefer the completed log; fall back to the most recent one so a summary
    // can be shown for an in-progress or abandoned session too.
    const logInclude = {
      segmentLogs: { orderBy: { segmentIndex: 'asc' as const } },
    }
    const log =
      (await prisma.cardioSessionLog.findFirst({
        where: { assignmentId, status: 'COMPLETED' },
        include: logInclude,
        orderBy: { startedAt: 'desc' },
      })) ??
      (await prisma.cardioSessionLog.findFirst({
        where: { assignmentId },
        include: logInclude,
        orderBy: { startedAt: 'desc' },
      }))

    if (!log) {
      return NextResponse.json(
        { success: false, error: t(locale, 'No logged session found', 'Inget loggat pass hittades') },
        { status: 404 }
      )
    }

    const summary = buildCardioSessionSummary({
      session: assignment.session,
      log,
      locale,
    })

    return NextResponse.json({
      success: true,
      data: {
        ...summary,
        athlete: assignment.athlete,
        assignment: {
          id: assignment.id,
          assignedDate: assignment.assignedDate,
          status: assignment.status,
        },
      },
    })
  } catch (error) {
    logError('Error building cardio session summary:', error)
    return NextResponse.json(
      { success: false, error: t(locale, 'Failed to build summary', 'Kunde inte skapa sammanfattningen') },
      { status: 500 }
    )
  }
}

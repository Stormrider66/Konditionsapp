/**
 * Resolve Injury Alert API
 *
 * PUT /api/injury/alerts/[id]/resolve
 *
 * Marks an injury assessment as resolved or transitions to monitoring status.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { canAccessClient } from '@/lib/auth-utils'
import { logger } from '@/lib/logger'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let locale = resolveRequestLocale(request)
  try {
    const { id } = await params
    // Authenticate user
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }

    // Get user from database
    const dbUser = await prisma.user.findUnique({
      where: { email: user.email },
    })

    if (!dbUser) {
      return NextResponse.json({ error: t(locale, 'User not found', 'Användaren hittades inte') }, { status: 404 })
    }
    locale = resolveRequestLocale(request, dbUser.language)

    // Only coaches can resolve injury alerts
    if (dbUser.role !== 'COACH') {
      return NextResponse.json(
        { error: t(locale, 'Access denied. Coach role required.', 'Åtkomst nekad. Coachroll krävs.') },
        { status: 403 }
      )
    }

    // Verify injury assessment exists and belongs to this coach's athlete
    const injury = await prisma.injuryAssessment.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            userId: true,
          },
        },
      },
    })

    if (!injury) {
      return NextResponse.json({ error: t(locale, 'Injury assessment not found', 'Skadebedömningen hittades inte') }, { status: 404 })
    }

    const hasAccess = await canAccessClient(dbUser.id, injury.clientId)
    if (!hasAccess) {
      return NextResponse.json({ error: t(locale, 'Access denied', 'Åtkomst nekad') }, { status: 403 })
    }

    // Parse request body for resolution details
    const body = await request.json().catch(() => ({}))
    const { status = 'RESOLVED', notes } = body

    // Valid status transitions: ACTIVE → MONITORING → RESOLVED
    const validStatuses = ['MONITORING', 'RESOLVED']
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        {
          error: t(
            locale,
            'Invalid status. Must be MONITORING or RESOLVED.',
            'Ogiltig status. Måste vara MONITORING eller RESOLVED.'
          ),
        },
        { status: 400 }
      )
    }

    // Update injury assessment
    const updatedInjury = await prisma.injuryAssessment.update({
      where: { id },
      data: {
        status,
        resolved: status === 'RESOLVED',
        resolvedDate: status === 'RESOLVED' ? new Date() : null,
        notes: notes || null,
      },
    })

    return NextResponse.json({
      success: true,
      injury: updatedInjury,
      message: t(
        locale,
        `Injury assessment marked as ${status.toLowerCase()}`,
        `Skadebedömningen markerades som ${status.toLowerCase()}`
      ),
    })
  } catch (error) {
    logger.error('Error resolving injury alert', {}, error)
    return NextResponse.json(
      {
        error: t(locale, 'Failed to resolve injury alert', 'Kunde inte lösa skadevarningen'),
        details:
          process.env.NODE_ENV === 'production'
            ? undefined
            : (error instanceof Error ? error.message : t(locale, 'Unknown error', 'Okänt fel')),
      },
      { status: 500 }
    )
  }
}

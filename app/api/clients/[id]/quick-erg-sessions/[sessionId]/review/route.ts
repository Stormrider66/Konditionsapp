import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { z } from 'zod'

import { canAccessClient, requireCoach } from '@/lib/auth-utils'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'
import { logger } from '@/lib/logger'
import { prisma } from '@/lib/prisma'
import {
  quickErgCoachAlertSourcePrefix,
  quickErgCoachReviewSourceId,
} from '@/lib/quick-erg/coach-alerts'

const reviewSchema = z.object({
  note: z.string().max(4000).nullable().optional(),
})

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  let locale = resolveRequestLocale(request)

  try {
    const user = await requireCoach()
    locale = resolveRequestLocale(request, user.language)
    const { id: clientId, sessionId } = await params

    const hasAccess = await canAccessClient(user.id, clientId)
    if (!hasAccess) {
      return NextResponse.json({ success: false, error: t(locale, 'Client not found or access denied', 'Klienten hittades inte eller åtkomst nekades') }, { status: 404 })
    }

    const parsed = reviewSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: t(locale, 'Invalid review note', 'Ogiltig coachanteckning'), details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const session = await prisma.quickErgSession.findFirst({
      where: { id: sessionId, clientId },
      select: {
        id: true,
        client: { select: { name: true } },
      },
    })

    if (!session) {
      return NextResponse.json({ success: false, error: t(locale, 'Session not found', 'Passet hittades inte') }, { status: 404 })
    }

    const now = new Date()
    const note = parsed.data.note?.trim() || null
    const reviewSourceId = quickErgCoachReviewSourceId(session.id)
    const sourcePrefix = quickErgCoachAlertSourcePrefix(session.id)

    const result = await prisma.$transaction(async (tx) => {
      const actionedAlerts = await tx.coachAlert.updateMany({
        where: {
          coachId: user.id,
          clientId,
          status: 'ACTIVE',
          sourceId: { startsWith: sourcePrefix },
        },
        data: {
          status: 'ACTIONED',
          actionedAt: now,
          actionNote: note ?? t(locale, 'Reviewed from the Quick Erg session page.', 'Hanterad från Quick Erg-passidan.'),
        },
      })

      const existingReview = await tx.coachAlert.findFirst({
        where: {
          coachId: user.id,
          clientId,
          sourceId: reviewSourceId,
        },
        select: { id: true },
      })

      if (existingReview) {
        const review = await tx.coachAlert.update({
          where: { id: existingReview.id },
          data: {
            status: 'ACTIONED',
            severity: 'LOW',
            title: t(locale, `${session.client.name}: Quick Erg reviewed`, `${session.client.name}: Quick Erg granskat`),
            message: t(locale, 'Coach reviewed the Quick Erg session.', 'Coach granskade Quick Erg-passet.'),
            contextData: {
              kind: 'quick_erg_review',
              sessionId: session.id,
              reviewedAt: now.toISOString(),
            } as Prisma.InputJsonValue,
            actionedAt: now,
            actionNote: note,
            dismissedAt: null,
            resolvedAt: null,
            expiresAt: null,
          },
          select: {
            actionedAt: true,
            actionNote: true,
          },
        })

        return { actionedAlerts: actionedAlerts.count, review }
      }

      const review = await tx.coachAlert.create({
        data: {
          coachId: user.id,
          clientId,
          alertType: 'QUICK_ERG_REVIEWED',
          severity: 'LOW',
          title: t(locale, `${session.client.name}: Quick Erg reviewed`, `${session.client.name}: Quick Erg granskat`),
          message: t(locale, 'Coach reviewed the Quick Erg session.', 'Coach granskade Quick Erg-passet.'),
          contextData: {
            kind: 'quick_erg_review',
            sessionId: session.id,
            reviewedAt: now.toISOString(),
          } as Prisma.InputJsonValue,
          sourceId: reviewSourceId,
          status: 'ACTIONED',
          actionedAt: now,
          actionNote: note,
        },
        select: {
          actionedAt: true,
          actionNote: true,
        },
      })

      return { actionedAlerts: actionedAlerts.count, review }
    })

    logger.info('Coach reviewed quick erg session', {
      coachId: user.id,
      clientId,
      quickErgSessionId: session.id,
      actionedAlerts: result.actionedAlerts,
      hasNote: Boolean(note),
    })

    return NextResponse.json({
      success: true,
      data: {
        reviewedAt: result.review.actionedAt?.toISOString() ?? now.toISOString(),
        note: result.review.actionNote,
        actionedAlerts: result.actionedAlerts,
      },
    })
  } catch (error) {
    if (error instanceof Error && (error.message === 'NEXT_REDIRECT' || error.message === 'Unauthorized')) {
      return NextResponse.json({ success: false, error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }

    logger.error('Failed to review quick erg session as coach', {}, error)
    return NextResponse.json(
      { success: false, error: t(locale, 'Failed to save coach review', 'Kunde inte spara coachgranskning') },
      { status: 500 }
    )
  }
}

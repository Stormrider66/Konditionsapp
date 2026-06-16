import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { canAccessClient, requireCoach } from '@/lib/auth-utils'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

const reviewSchema = z.object({
  action: z.literal('approve'),
  note: z.string().trim().max(1000).optional(),
})

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let locale: AppLocale = resolveRequestLocale(request)

  try {
    const user = await requireCoach()
    locale = resolveRequestLocale(request, user.language)
    const { id } = await params
    const body = await request.json()
    const validation = reviewSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: t(locale, 'Invalid review request', 'Ogiltig granskningsförfrågan'),
          details: validation.error.errors,
        },
        { status: 400 }
      )
    }

    const test = await prisma.test.findUnique({
      where: { id },
      select: {
        id: true,
        clientId: true,
      },
    })

    if (!test || !(await canAccessClient(user.id, test.clientId))) {
      return NextResponse.json(
        { success: false, error: t(locale, 'Test not found', 'Testet hittades inte') },
        { status: 404 }
      )
    }

    const updated = await prisma.test.update({
      where: { id },
      data: {
        qualityReviewStatus: 'APPROVED',
        qualityReviewedBy: user.id,
        qualityReviewedAt: new Date(),
        qualityReviewNote: validation.data.note || null,
      },
      select: {
        id: true,
        qualityReviewStatus: true,
        qualityReviewedBy: true,
        qualityReviewedAt: true,
        qualityReviewNote: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: updated,
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
      return NextResponse.json({ success: false, error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }

    return NextResponse.json(
      { success: false, error: t(locale, 'Failed to update review', 'Kunde inte uppdatera granskningen') },
      { status: 500 }
    )
  }
}

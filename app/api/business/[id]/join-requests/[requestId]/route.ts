/**
 * Join Request Review API
 *
 * PUT /api/business/[id]/join-requests/[requestId] - Approve or reject a join request
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireCoach, requireBusinessMembership } from '@/lib/auth-utils'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

type RouteParams = {
  params: Promise<{ id: string; requestId: string }>
}

const reviewSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT']),
})

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  let locale = resolveRequestLocale(request)

  try {
    const user = await requireCoach()
    locale = resolveRequestLocale(request, user.language)
    const { id: businessId, requestId } = await params

    await requireBusinessMembership(user.id, businessId, { roles: ['OWNER', 'ADMIN'] })

    const joinRequest = await prisma.businessJoinRequest.findUnique({
      where: { id: requestId },
    })

    if (!joinRequest || joinRequest.businessId !== businessId) {
      return NextResponse.json({ error: t(locale, 'Request not found', 'Förfrågan hittades inte') }, { status: 404 })
    }

    if (joinRequest.status !== 'PENDING') {
      return NextResponse.json(
        { error: t(locale, 'Request has already been reviewed', 'Förfrågan har redan granskats') },
        { status: 400 }
      )
    }

    const body = await request.json()
    const data = reviewSchema.parse(body)

    if (data.action === 'APPROVE') {
      await prisma.$transaction(async (tx) => {
        // Update request status
        await tx.businessJoinRequest.update({
          where: { id: requestId },
          data: {
            status: 'APPROVED',
            reviewedById: user.id,
            reviewedAt: new Date(),
          },
        })

        // Add user as COACH member of business
        await tx.businessMember.create({
          data: {
            userId: joinRequest.userId,
            businessId,
            role: 'COACH',
          },
        })
      })
    } else {
      await prisma.businessJoinRequest.update({
        where: { id: requestId },
        data: {
          status: 'REJECTED',
          reviewedById: user.id,
          reviewedAt: new Date(),
        },
      })
    }

    return NextResponse.json({ success: true, status: data.action === 'APPROVE' ? 'APPROVED' : 'REJECTED' })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: t(locale, 'Invalid input', 'Ogiltig inmatning'), details: error.errors },
        { status: 400 }
      )
    }
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    logger.error('Review join request error', {}, error)
    return NextResponse.json({ error: t(locale, 'Failed to review request', 'Kunde inte granska förfrågan') }, { status: 500 })
  }
}

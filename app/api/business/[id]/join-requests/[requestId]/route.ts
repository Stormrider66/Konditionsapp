/**
 * Join Request Review API
 *
 * PUT /api/business/[id]/join-requests/[requestId] - Approve or reject a join request
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireCoach } from '@/lib/auth-utils'
import { z } from 'zod'
import { logger } from '@/lib/logger'

type RouteParams = {
  params: Promise<{ id: string; requestId: string }>
}

const reviewSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT']),
})

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireCoach()
    const { id: businessId, requestId } = await params

    // Check user is owner/admin of business
    const membership = await prisma.businessMember.findFirst({
      where: {
        userId: user.id,
        businessId,
        role: { in: ['OWNER', 'ADMIN'] },
      },
    })

    if (!membership) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const joinRequest = await prisma.businessJoinRequest.findUnique({
      where: { id: requestId },
    })

    if (!joinRequest || joinRequest.businessId !== businessId) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    if (joinRequest.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Request has already been reviewed' },
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
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    logger.error('Review join request error', {}, error)
    return NextResponse.json({ error: 'Failed to review request' }, { status: 500 })
  }
}

/**
 * Business Join Requests API
 *
 * POST /api/business/[id]/join-requests - Request to join a business (authenticated coach)
 * GET /api/business/[id]/join-requests - List join requests (business owner/admin)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireCoach } from '@/lib/auth-utils'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import { sendJoinRequestNotification } from '@/lib/email'

type RouteParams = {
  params: Promise<{ id: string }>
}

const joinRequestSchema = z.object({
  message: z.string().max(500).optional(),
})

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireCoach()
    const { id: businessId } = await params

    // Verify business exists and is a GYM or CLUB
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      include: {
        members: {
          where: { role: 'OWNER' },
          include: { user: { select: { email: true, name: true } } },
        },
      },
    })

    if (!business || !business.isActive) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    // Check user isn't already a member
    const existingMembership = await prisma.businessMember.findFirst({
      where: { userId: user.id, businessId },
    })

    if (existingMembership) {
      return NextResponse.json(
        { error: 'You are already a member of this business' },
        { status: 400 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const data = joinRequestSchema.parse(body)

    const joinRequest = await prisma.businessJoinRequest.create({
      data: {
        userId: user.id,
        businessId,
        message: data.message || null,
      },
    })

    // Notify business owner
    const owner = business.members[0]
    if (owner?.user?.email) {
      sendJoinRequestNotification(
        owner.user.email,
        user.name,
        business.name
      ).catch(() => {})
    }

    return NextResponse.json({ success: true, id: joinRequest.id }, { status: 201 })
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
    // Handle unique constraint violation (already requested)
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: 'You already have a pending request for this business' },
        { status: 400 }
      )
    }
    logger.error('Join request error', {}, error)
    return NextResponse.json({ error: 'Failed to submit join request' }, { status: 500 })
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireCoach()
    const { id: businessId } = await params

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

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    const requests = await prisma.businessJoinRequest.findMany({
      where: {
        businessId,
        ...(status ? { status: status as 'PENDING' | 'APPROVED' | 'REJECTED' } : {}),
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ requests })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    logger.error('List join requests error', {}, error)
    return NextResponse.json({ error: 'Failed to fetch join requests' }, { status: 500 })
  }
}

/**
 * Business Invitation Accept API
 *
 * POST /api/business/invitations/accept - Accept a business invitation
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { z } from 'zod'

const acceptSchema = z.object({
  code: z.string().uuid('Valid invitation code is required'),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in or create an account first.' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validationResult = acceptSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.flatten() },
        { status: 400 }
      )
    }

    const { code } = validationResult.data

    // Find the invitation
    const invitation = await prisma.invitation.findUnique({
      where: { code },
    })

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      )
    }

    if (invitation.usedAt) {
      return NextResponse.json(
        { error: 'Invitation has already been used' },
        { status: 400 }
      )
    }

    if (invitation.expiresAt && invitation.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Invitation has expired' },
        { status: 400 }
      )
    }

    if (invitation.type !== 'BUSINESS_CLAIM') {
      return NextResponse.json(
        { error: 'Invalid invitation type' },
        { status: 400 }
      )
    }

    if (!invitation.businessId) {
      return NextResponse.json(
        { error: 'Invalid invitation: no business linked' },
        { status: 400 }
      )
    }

    // Find the database user
    const dbUser = await prisma.user.findUnique({
      where: { email: user.email! },
    })

    if (!dbUser) {
      return NextResponse.json(
        { error: 'User account not found' },
        { status: 404 }
      )
    }

    // Check if user is already a member of this business
    const existingMembership = await prisma.businessMember.findFirst({
      where: {
        userId: dbUser.id,
        businessId: invitation.businessId,
      },
    })

    if (existingMembership) {
      // Mark invitation as used even if already a member
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { usedAt: new Date() },
      })
      return NextResponse.json(
        { error: 'You are already a member of this business' },
        { status: 400 }
      )
    }

    // Check if user is already in another business
    const otherMembership = await prisma.businessMember.findFirst({
      where: { userId: dbUser.id },
    })

    if (otherMembership) {
      return NextResponse.json(
        { error: 'You are already a member of another business' },
        { status: 400 }
      )
    }

    // Extract role from metadata
    const metadata = invitation.metadata as Record<string, unknown> | null
    const role = (metadata?.role as string) || 'MEMBER'

    // Create the membership and mark invitation as used in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const membership = await tx.businessMember.create({
        data: {
          userId: dbUser.id,
          businessId: invitation.businessId!,
          role,
        },
        include: {
          business: { select: { name: true, slug: true } },
        },
      })

      await tx.invitation.update({
        where: { id: invitation.id },
        data: { usedAt: new Date(), currentUses: { increment: 1 } },
      })

      return membership
    })

    logger.info('Business invitation accepted', {
      userId: dbUser.id,
      businessId: result.businessId,
      role: result.role,
      invitationId: invitation.id,
    })

    return NextResponse.json({
      success: true,
      business: {
        id: result.businessId,
        name: result.business.name,
        slug: result.business.slug,
      },
      role: result.role,
    })
  } catch (error) {
    logger.error('Accept business invitation error', {}, error)
    return NextResponse.json(
      { error: 'Failed to accept invitation' },
      { status: 500 }
    )
  }
}

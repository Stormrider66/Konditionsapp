import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-utils'
import { logger } from '@/lib/logger'

/**
 * POST /api/admin/users/assign-business
 * Assigns a user to a business (creates BusinessMember + sets businessId on their Client records).
 * Admin-only endpoint.
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin()

    const { userId, businessId } = await request.json()

    if (!userId || !businessId) {
      return NextResponse.json(
        { success: false, error: 'userId and businessId are required' },
        { status: 400 }
      )
    }

    // Verify user and business exist
    const [user, business] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true } }),
      prisma.business.findUnique({ where: { id: businessId }, select: { id: true, name: true } }),
    ])

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
    }
    if (!business) {
      return NextResponse.json({ success: false, error: 'Business not found' }, { status: 404 })
    }

    // Determine role based on user's platform role
    const memberRole = user.role === 'COACH' ? 'COACH' : 'MEMBER'

    await prisma.$transaction(async (tx) => {
      // Upsert BusinessMember (reactivate if previously deactivated)
      await tx.businessMember.upsert({
        where: { businessId_userId: { businessId, userId } },
        create: {
          businessId,
          userId,
          role: memberRole,
          isActive: true,
          acceptedAt: new Date(),
        },
        update: {
          isActive: true,
          role: memberRole,
        },
      })

      // Set businessId on all Client records owned by this user (as coach)
      await tx.client.updateMany({
        where: { userId, businessId: null },
        data: { businessId },
      })

      // Also set businessId on Client records where this user is the athlete
      // (via athleteAccount linkage)
      const athleteAccount = await tx.athleteAccount.findFirst({
        where: { userId },
        select: { clientId: true },
      })
      if (athleteAccount) {
        await tx.client.update({
          where: { id: athleteAccount.clientId },
          data: { businessId },
        })
      }
    })

    logger.info('Assigned user to business', { userId, businessId, businessName: business.name })

    return NextResponse.json({
      success: true,
      message: `User assigned to ${business.name}`,
    })
  } catch (error) {
    logger.error('Error assigning user to business', {}, error)
    return NextResponse.json({ success: false, error: 'Failed to assign user' }, { status: 500 })
  }
}

/**
 * DELETE /api/admin/users/assign-business
 * Removes a user from a business.
 */
export async function DELETE(request: NextRequest) {
  try {
    await requireAdmin()

    const { userId, businessId } = await request.json()

    if (!userId || !businessId) {
      return NextResponse.json(
        { success: false, error: 'userId and businessId are required' },
        { status: 400 }
      )
    }

    await prisma.$transaction(async (tx) => {
      // Deactivate BusinessMember
      await tx.businessMember.updateMany({
        where: { businessId, userId },
        data: { isActive: false },
      })

      // Clear businessId on Client records tied to this business for this user
      await tx.client.updateMany({
        where: { userId, businessId },
        data: { businessId: null },
      })

      // Also clear on athlete-linked client
      const athleteAccount = await tx.athleteAccount.findFirst({
        where: { userId },
        select: { clientId: true },
      })
      if (athleteAccount) {
        const client = await tx.client.findUnique({
          where: { id: athleteAccount.clientId },
          select: { businessId: true },
        })
        if (client?.businessId === businessId) {
          await tx.client.update({
            where: { id: athleteAccount.clientId },
            data: { businessId: null },
          })
        }
      }
    })

    logger.info('Removed user from business', { userId, businessId })

    return NextResponse.json({ success: true, message: 'User removed from business' })
  } catch (error) {
    logger.error('Error removing user from business', {}, error)
    return NextResponse.json({ success: false, error: 'Failed to remove user' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/api/utils'
import { logger } from '@/lib/logger'

/**
 * POST /api/athlete/leave-business
 * Allows an athlete to leave a business. Their data is preserved but
 * business access is revoked.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()

    const { businessId } = await request.json()

    if (!businessId) {
      return NextResponse.json(
        { success: false, error: 'businessId is required' },
        { status: 400 }
      )
    }

    // Verify the user is a member of this business
    const membership = await prisma.businessMember.findFirst({
      where: {
        userId: user.id,
        businessId,
        isActive: true,
      },
    })

    if (!membership) {
      return NextResponse.json(
        { success: false, error: 'Du är inte medlem i detta företag' },
        { status: 404 }
      )
    }

    // Owners cannot leave their own business - they must transfer ownership first
    if (membership.role === 'OWNER') {
      return NextResponse.json(
        { success: false, error: 'Ägare kan inte lämna sitt eget företag. Överför ägarskapet först.' },
        { status: 400 }
      )
    }

    await prisma.$transaction(async (tx) => {
      // Deactivate the BusinessMember record
      await tx.businessMember.update({
        where: { id: membership.id },
        data: { isActive: false },
      })

      // Clear businessId on any Client records linked to this business for this user
      // (both as coach-owned clients and as athlete client)
      await tx.client.updateMany({
        where: { userId: user.id, businessId },
        data: { businessId: null },
      })

      // Also handle athlete account linkage
      const athleteAccount = await tx.athleteAccount.findFirst({
        where: { userId: user.id },
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

    logger.info('Athlete left business', { userId: user.id, businessId })

    return NextResponse.json({
      success: true,
      message: 'Du har lämnat företaget',
    })
  } catch (error) {
    logger.error('Error leaving business', {}, error)
    return NextResponse.json(
      { success: false, error: 'Kunde inte lämna företaget' },
      { status: 500 }
    )
  }
}

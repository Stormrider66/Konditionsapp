import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-utils'
import { logger } from '@/lib/logger'

/**
 * POST /api/admin/backfill/client-business
 * Sets businessId on existing clients based on their coach's business membership.
 * Admin-only endpoint for one-time backfill.
 */
export async function POST() {
  try {
    await requireAdmin()

    // Find all clients that don't have a businessId yet
    const clientsWithoutBusiness = await prisma.client.findMany({
      where: { businessId: null },
      select: { id: true, userId: true },
    })

    if (clientsWithoutBusiness.length === 0) {
      return NextResponse.json({ success: true, message: 'No clients to backfill', updated: 0 })
    }

    // Get unique coach userIds
    const coachUserIds = [...new Set(clientsWithoutBusiness.map(c => c.userId))]

    // Look up each coach's business membership
    const memberships = await prisma.businessMember.findMany({
      where: {
        userId: { in: coachUserIds },
        isActive: true,
        role: { in: ['OWNER', 'ADMIN', 'COACH'] },
      },
      orderBy: { createdAt: 'asc' },
      select: { userId: true, businessId: true },
    })

    // Build a map: coachUserId -> businessId (first/oldest membership)
    const coachBusinessMap = new Map<string, string>()
    for (const m of memberships) {
      if (!coachBusinessMap.has(m.userId)) {
        coachBusinessMap.set(m.userId, m.businessId)
      }
    }

    // Update clients in batches
    let updated = 0
    for (const client of clientsWithoutBusiness) {
      const businessId = coachBusinessMap.get(client.userId)
      if (businessId) {
        await prisma.client.update({
          where: { id: client.id },
          data: { businessId },
        })
        updated++
      }
    }

    logger.info('Backfilled client businessId', { total: clientsWithoutBusiness.length, updated })

    return NextResponse.json({
      success: true,
      message: `Backfilled ${updated} of ${clientsWithoutBusiness.length} clients`,
      updated,
      total: clientsWithoutBusiness.length,
    })
  } catch (error) {
    logger.error('Error backfilling client business', {}, error)
    return NextResponse.json({ success: false, error: 'Failed to backfill' }, { status: 500 })
  }
}

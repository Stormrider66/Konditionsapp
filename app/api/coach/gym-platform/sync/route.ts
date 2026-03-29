import { NextRequest, NextResponse } from 'next/server'
import { requireCoach } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { syncConnection } from '@/lib/integrations/gym-platforms/sync-engine'

/**
 * POST /api/coach/gym-platform/sync
 * Manually trigger sync for a gym platform connection
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireCoach()
    const { connectionId } = await request.json()

    if (!connectionId) {
      return NextResponse.json({ error: 'connectionId required' }, { status: 400 })
    }

    // Verify ownership
    const membership = await prisma.businessMember.findFirst({
      where: { userId: user.id, isActive: true },
      select: { businessId: true },
    })

    if (!membership) {
      return NextResponse.json({ error: 'No business' }, { status: 400 })
    }

    const connection = await prisma.gymPlatformConnection.findFirst({
      where: { id: connectionId, businessId: membership.businessId },
    })

    if (!connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 })
    }

    const result = await syncConnection(connectionId)

    return NextResponse.json({ result })
  } catch {
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 })
  }
}

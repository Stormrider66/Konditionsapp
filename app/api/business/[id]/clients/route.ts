import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, handleApiError } from '@/lib/api/utils'
import { requireBusinessMembership } from '@/lib/auth-utils'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/business/[id]/clients
 * Returns all clients (athletes) from all coaches in the business
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth()
    const { id: businessId } = await params

    await requireBusinessMembership(user.id, businessId)

    // Get all coach members of this business
    const businessCoaches = await prisma.businessMember.findMany({
      where: {
        businessId: businessId,
        isActive: true,
        role: { in: ['OWNER', 'ADMIN', 'COACH'] },
      },
      select: { userId: true },
    })
    const coachUserIds = businessCoaches.map(m => m.userId)

    // Fetch clients belonging to the business OR owned by business coaches (fallback for un-migrated clients)
    const clients = await prisma.client.findMany({
      where: {
        OR: [
          { businessId: businessId },
          { userId: { in: coachUserIds } },
        ],
      },
      include: {
        team: true,
        athleteAccount: {
          select: {
            id: true,
            user: {
              select: {
                email: true,
              }
            }
          }
        }
      },
      orderBy: {
        name: 'asc',
      },
    })

    // Map to the format expected by the assignment dialog
    const mappedClients = clients.map(client => ({
      id: client.id,
      name: client.name,
      email: client.athleteAccount?.user?.email || client.email || undefined,
      team: client.team?.name,
    }))

    return NextResponse.json({
      clients: mappedClients,
    })
  } catch (error) {
    return handleApiError(error)
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, handleApiError } from '@/lib/api/utils'
import { requireBusinessMembership } from '@/lib/auth-utils'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/business/[id]/coaches
 * Returns all coaches in the business
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
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        user: {
          name: 'asc',
        },
      },
    })

    // Map to the format expected by the assignment dialog
    const mappedCoaches = businessCoaches.map(member => ({
      id: member.user.id,
      name: member.user.name || 'Unknown',
      email: member.user.email || undefined,
      role: member.role,
    }))

    return NextResponse.json({
      coaches: mappedCoaches,
    })
  } catch (error) {
    return handleApiError(error)
  }
}

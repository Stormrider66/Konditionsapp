/**
 * GET /api/user/businesses
 *
 * Returns all business memberships for the current user with roles and business details.
 * Used by the OrgSwitcher component to list organizations the user belongs to.
 */

import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const memberships = await prisma.businessMember.findMany({
      where: {
        userId: user.id,
        isActive: true,
        business: { isActive: true },
      },
      select: {
        id: true,
        role: true,
        business: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            primaryColor: true,
            type: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    const businesses = memberships.map((m) => ({
      membershipId: m.id,
      role: m.role,
      businessId: m.business.id,
      name: m.business.name,
      slug: m.business.slug,
      logoUrl: m.business.logoUrl,
      primaryColor: m.business.primaryColor || '#3b82f6',
      type: m.business.type,
    }))

    return NextResponse.json({ businesses })
  } catch (error) {
    console.error('[GET /api/user/businesses]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

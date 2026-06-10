// app/api/organizations/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import { getRequestedBusinessScope, requireCoach } from '@/lib/auth-utils'
import { getBusinessTeamOwnerIds } from '@/lib/coach/team-access'

// Validation schema for organization creation
const createOrganizationSchema = z.object({
  name: z.string().min(2, 'Organization name must be at least 2 characters').max(100),
  description: z.string().max(500).optional(),
  sportType: z.enum([
    'RUNNING', 'CYCLING', 'SKIING', 'SWIMMING', 'TRIATHLON', 'HYROX', 'GENERAL_FITNESS', 'FUNCTIONAL_FITNESS', 'STRENGTH',
    'TEAM_FOOTBALL', 'TEAM_ICE_HOCKEY', 'TEAM_HANDBALL', 'TEAM_FLOORBALL', 'TEAM_BASKETBALL', 'TEAM_VOLLEYBALL',
    'TENNIS', 'PADEL'
  ]).optional(),
})

// GET /api/organizations - Get all organizations for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const user = await requireCoach()
    const scope = getRequestedBusinessScope(request)
    const ownerIds = await getBusinessTeamOwnerIds(user.id, scope.businessSlug)
    const currentBusiness = scope.businessSlug
      ? await prisma.business.findUnique({
          where: { slug: scope.businessSlug },
          select: { id: true, name: true, slug: true },
        })
      : null
    const ownerMemberships = currentBusiness
      ? await prisma.businessMember.findMany({
          where: {
            userId: { in: ownerIds.length ? ownerIds : [user.id] },
            isActive: true,
          },
          select: {
            userId: true,
            businessId: true,
          },
        })
      : []
    const ownerBusinessCounts = ownerMemberships.reduce<Record<string, number>>((acc, membership) => {
      acc[membership.userId] = (acc[membership.userId] || 0) + 1
      return acc
    }, {})
    const otherBusinessOrganizations = currentBusiness
      ? await prisma.business.findMany({
          where: {
            isActive: true,
            slug: { not: currentBusiness.slug },
          },
          select: {
            name: true,
            slug: true,
          },
        })
      : []

    // Exclude other businesses' auto-created orgs in JS — inlining them as a
    // NOT(OR(...)) where-clause grows the SQL by two terms per business on
    // the platform.
    const otherBusinessOrgIds = new Set(
      otherBusinessOrganizations.map((business) => `${business.slug}-org`)
    )
    const otherBusinessNames = new Set(
      otherBusinessOrganizations.map((business) => business.name)
    )

    const ownedOrganizations = await prisma.organization.findMany({
      where: {
        userId: { in: ownerIds.length ? ownerIds : [user.id] },
      },
      include: {
        teams: {
          include: {
            members: true,
          },
        },
        },
      orderBy: {
        createdAt: 'desc',
      },
    })
    const organizations = ownedOrganizations.filter(
      (organization) =>
        !otherBusinessOrgIds.has(organization.id) &&
        !otherBusinessNames.has(organization.name)
    )
    const scopedOrganizations = currentBusiness
      ? organizations.filter((organization) => {
          if (organization.id === `${currentBusiness.slug}-org`) return true
          if (organization.name === currentBusiness.name) return true

          const teamMembers = organization.teams.flatMap((team) => team.members)
          if (teamMembers.some((member) => member.businessId === currentBusiness.id)) return true
          if (teamMembers.some((member) => member.businessId && member.businessId !== currentBusiness.id)) return false

          return (ownerBusinessCounts[organization.userId] || 0) <= 1
        })
      : organizations

    return NextResponse.json({
      success: true,
      data: scopedOrganizations,
    })
  } catch (error) {
    logger.error('Error fetching organizations', {}, error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch organizations',
      },
      { status: 500 }
    )
  }
}

// POST /api/organizations - Create a new organization
export async function POST(request: NextRequest) {
  try {
    const user = await requireCoach()
    const scope = getRequestedBusinessScope(request)
    const ownerIds = await getBusinessTeamOwnerIds(user.id, scope.businessSlug)

    const body = await request.json()

    // Validate input
    const validation = createOrganizationSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validation.error.errors,
        },
        { status: 400 }
      )
    }

    const data = validation.data

    const organization = await prisma.organization.create({
      data: {
        userId: ownerIds[0] || user.id,
        name: data.name,
        description: data.description || null,
        sportType: data.sportType || null,
      },
      include: {
        teams: {
          include: {
            members: true,
          },
        },
      },
    })

    return NextResponse.json(
      {
        success: true,
        data: organization,
        message: 'Organization created successfully',
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    logger.error('Error creating organization', {}, error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create organization',
      },
      { status: 500 }
    )
  }
}

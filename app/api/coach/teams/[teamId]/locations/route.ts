import { NextRequest, NextResponse } from 'next/server'
import { requireCoach } from '@/lib/auth-utils'
import { getRequestedBusinessScope } from '@/lib/auth/current-user'
import { validateBusinessMembership } from '@/lib/business-context'
import { getAccessibleTeam } from '@/lib/coach/team-access'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

interface RouteContext {
  params: Promise<{ teamId: string }>
}
type AppLocale = 'en' | 'sv'

const createLocationSchema = z.object({
  name: z.string().min(1).max(120),
})

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const user = await requireCoach()
    const locale: AppLocale = user.language === 'sv' ? 'sv' : 'en'
    const { teamId } = await context.params
    const scope = getRequestedBusinessScope(req)

    const team = await getAccessibleTeam(user.id, teamId, scope.businessSlug)
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    const membership = scope.businessSlug
      ? await validateBusinessMembership(user.id, scope.businessSlug)
      : await prisma.businessMember.findFirst({
        where: { userId: user.id, isActive: true },
        select: { businessId: true },
      })

    const [businessLocations, teamEventLocations] = await Promise.all([
      membership
        ? prisma.location.findMany({
          where: {
            businessId: membership.businessId,
            isActive: true,
          },
          select: {
            id: true,
            name: true,
            city: true,
            address: true,
            isPrimary: true,
          },
          orderBy: [
            { isPrimary: 'desc' },
            { name: 'asc' },
          ],
        })
        : Promise.resolve([]),
      prisma.teamEvent.findMany({
        where: {
          teamId,
          location: { not: null },
        },
        distinct: ['location'],
        select: { location: true },
        orderBy: { location: 'asc' },
      }),
    ])

    const gymLocationNames = new Set(businessLocations.map((location) => location.name.trim().toLowerCase()))
    const customLocations = teamEventLocations
      .map((event) => event.location?.trim())
      .filter((location): location is string => Boolean(location))
      .filter((location) => !gymLocationNames.has(location.toLowerCase()))

    return NextResponse.json({
      locations: [
        ...businessLocations.map((location) => ({
          id: location.id,
          name: location.name,
          source: 'gym' as const,
          description: [location.address, location.city].filter(Boolean).join(', ') || null,
          isPrimary: location.isPrimary,
        })),
        ...customLocations.map((location) => ({
          id: `team:${location}`,
          name: location,
          source: 'team' as const,
          description: locale === 'sv' ? 'Tidigare använd i lagkalendern' : 'Previously used in the team calendar',
          isPrimary: false,
        })),
      ],
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error listing team calendar locations:', error)
    return NextResponse.json({ error: 'Failed to fetch locations' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const user = await requireCoach()
    const { teamId } = await context.params
    const scope = getRequestedBusinessScope(req)

    const team = await getAccessibleTeam(user.id, teamId, scope.businessSlug)
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    const membership = scope.businessSlug
      ? await validateBusinessMembership(user.id, scope.businessSlug)
      : await prisma.businessMember.findFirst({
        where: { userId: user.id, isActive: true },
        select: { businessId: true },
      })

    if (!membership) {
      return NextResponse.json({ error: 'Business membership not found' }, { status: 403 })
    }

    const parsed = createLocationSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
    }

    const name = parsed.data.name.trim()
    const existing = await prisma.location.findFirst({
      where: {
        businessId: membership.businessId,
        name: { equals: name, mode: 'insensitive' },
      },
      select: {
        id: true,
        name: true,
        city: true,
        address: true,
        isPrimary: true,
      },
    })

    if (existing) {
      return NextResponse.json({
        location: {
          id: existing.id,
          name: existing.name,
          source: 'gym',
          description: [existing.address, existing.city].filter(Boolean).join(', ') || null,
          isPrimary: existing.isPrimary,
        },
        alreadyExists: true,
      })
    }

    const location = await prisma.location.create({
      data: {
        businessId: membership.businessId,
        name,
        capabilities: [],
      },
      select: {
        id: true,
        name: true,
        city: true,
        address: true,
        isPrimary: true,
      },
    })

    return NextResponse.json({
      location: {
        id: location.id,
        name: location.name,
        source: 'gym',
        description: [location.address, location.city].filter(Boolean).join(', ') || null,
        isPrimary: location.isPrimary,
      },
    }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error creating team calendar location:', error)
    return NextResponse.json({ error: 'Failed to create location' }, { status: 500 })
  }
}

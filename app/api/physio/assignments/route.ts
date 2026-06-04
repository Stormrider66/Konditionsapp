// app/api/physio/assignments/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePhysio, getCurrentUser } from '@/lib/auth-utils'
import { z } from 'zod'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

// Validation schema for creating an assignment
const createAssignmentSchema = z.object({
  // One of these must be provided
  clientId: z.string().uuid().optional(),
  teamId: z.string().uuid().optional(),
  organizationId: z.string().uuid().optional(),
  businessId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
  // Role and permissions
  role: z.enum(['PRIMARY', 'SECONDARY', 'CONSULTANT']).default('PRIMARY'),
  canModifyPrograms: z.boolean().default(false),
  canCreateRestrictions: z.boolean().default(true),
  canViewFullHistory: z.boolean().default(true),
  // Optional fields
  notes: z.string().optional(),
  endDate: z.string().datetime().optional(),
}).refine(
  (data) => data.clientId || data.teamId || data.organizationId || data.businessId || data.locationId,
  { message: 'At least one scope (clientId, teamId, organizationId, businessId, or locationId) must be provided' }
)

/**
 * GET /api/physio/assignments
 * List all assignments for the current physio user
 */
export async function GET(request: NextRequest) {
  let locale = resolveRequestLocale(request)

  try {
    const user = await requirePhysio()
    locale = resolveRequestLocale(request, user.language)

    const assignments = await prisma.physioAssignment.findMany({
      where: {
        physioUserId: user.id,
        isActive: true,
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
            _count: {
              select: { members: true },
            },
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
        business: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        location: {
          select: {
            id: true,
            name: true,
            city: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json(assignments)
  } catch (error) {
    console.error('Error fetching physio assignments:', error)
    if (error instanceof Error && error.message.includes('Access denied')) {
      return NextResponse.json({ error: t(locale, 'Access denied', 'Åtkomst nekad') }, { status: 403 })
    }
    return NextResponse.json(
      { error: t(locale, 'Failed to fetch assignments', 'Kunde inte hämta tilldelningar') },
      { status: 500 }
    )
  }
}

/**
 * POST /api/physio/assignments
 * Create a new physio assignment
 * Only ADMIN users can create assignments (physio users receive them)
 */
export async function POST(request: NextRequest) {
  let locale = resolveRequestLocale(request)

  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    locale = resolveRequestLocale(request, user.language)

    // Only admins and business owners can create assignments
    if (user.role !== 'ADMIN') {
      // Check if user is a business owner
      const isBusinessOwner = await prisma.businessMember.findFirst({
        where: {
          userId: user.id,
          role: 'OWNER',
          isActive: true,
        },
      })
      if (!isBusinessOwner) {
        return NextResponse.json(
          { error: t(locale, 'Only administrators or business owners can create physio assignments', 'Endast administratörer eller verksamhetsägare kan skapa fysiotilldelningar') },
          { status: 403 }
        )
      }
    }

    const body = await request.json()
    const validatedData = createAssignmentSchema.parse(body)

    // Get the physio user ID from request
    const { physioUserId } = body
    if (!physioUserId) {
      return NextResponse.json(
        { error: t(locale, 'physioUserId is required', 'physioUserId krävs') },
        { status: 400 }
      )
    }

    // Allow assigning physio responsibilities to dedicated physios and coaches.
    const physioUser = await prisma.user.findUnique({
      where: { id: physioUserId },
      select: { role: true },
    })

    if (!physioUser || (physioUser.role !== 'PHYSIO' && physioUser.role !== 'COACH' && physioUser.role !== 'ADMIN')) {
      return NextResponse.json(
        { error: t(locale, 'Target user must be a physio, coach, or admin', 'Målanvändaren måste vara fysioterapeut, tränare eller administratör') },
        { status: 400 }
      )
    }

    const assignment = await prisma.physioAssignment.create({
      data: {
        physioUserId,
        clientId: validatedData.clientId,
        teamId: validatedData.teamId,
        organizationId: validatedData.organizationId,
        businessId: validatedData.businessId,
        locationId: validatedData.locationId,
        role: validatedData.role,
        canModifyPrograms: validatedData.canModifyPrograms,
        canCreateRestrictions: validatedData.canCreateRestrictions,
        canViewFullHistory: validatedData.canViewFullHistory,
        notes: validatedData.notes,
        endDate: validatedData.endDate ? new Date(validatedData.endDate) : undefined,
      },
      include: {
        physio: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        client: {
          select: {
            id: true,
            name: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return NextResponse.json(assignment, { status: 201 })
  } catch (error) {
    console.error('Error creating physio assignment:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: t(locale, 'Validation error', 'Valideringsfel'), details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: t(locale, 'Failed to create assignment', 'Kunde inte skapa tilldelningen') },
      { status: 500 }
    )
  }
}

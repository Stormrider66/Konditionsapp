// app/api/physio/screenings/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePhysio, canAccessAthleteAsPhysio } from '@/lib/auth-utils'
import { z } from 'zod'

const updateScreeningSchema = z.object({
  results: z.record(z.unknown()).optional(),
  totalScore: z.number().optional(),
  asymmetries: z.array(z.string()).optional(),
  limitations: z.array(z.string()).optional(),
  recommendations: z.array(z.string()).optional(),
  notes: z.string().optional(),
})

/**
 * GET /api/physio/screenings/[id]
 * Get a specific movement screening
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePhysio()
    const { id } = await params

    const screening = await prisma.movementScreen.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            birthDate: true,
            gender: true,
          },
        },
        conductedBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (!screening) {
      return NextResponse.json({ error: 'Screening not found' }, { status: 404 })
    }

    // Check access
    if (screening.conductedById !== user.id) {
      const hasAccess = await canAccessAthleteAsPhysio(user.id, screening.clientId)
      if (!hasAccess) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
    }

    // Get previous screenings for comparison
    const previousScreenings = await prisma.movementScreen.findMany({
      where: {
        clientId: screening.clientId,
        screeningType: screening.screeningType,
        testDate: { lt: screening.testDate },
      },
      orderBy: { testDate: 'desc' },
      take: 3,
      select: {
        id: true,
        testDate: true,
        totalScore: true,
        results: true,
      },
    })

    return NextResponse.json({
      ...screening,
      previousScreenings,
    })
  } catch (error) {
    console.error('Error fetching screening:', error)
    if (error instanceof Error && error.message.includes('Access denied')) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    return NextResponse.json(
      { error: 'Failed to fetch screening' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/physio/screenings/[id]
 * Update a movement screening
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePhysio()
    const { id } = await params
    const body = await request.json()
    const validatedData = updateScreeningSchema.parse(body)

    // Check if screening exists and user has access
    const existingScreening = await prisma.movementScreen.findUnique({
      where: { id },
    })

    if (!existingScreening) {
      return NextResponse.json({ error: 'Screening not found' }, { status: 404 })
    }

    // Only the physio who conducted the screening can update it
    if (existingScreening.conductedById !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const screening = await prisma.movementScreen.update({
      where: { id },
      data: validatedData,
      include: {
        client: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return NextResponse.json(screening)
  } catch (error) {
    console.error('Error updating screening:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    if (error instanceof Error && error.message.includes('Access denied')) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    return NextResponse.json(
      { error: 'Failed to update screening' },
      { status: 500 }
    )
  }
}

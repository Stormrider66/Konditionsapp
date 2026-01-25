// app/api/physio/screenings/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePhysio, canAccessAthleteAsPhysio } from '@/lib/auth-utils'
import { z } from 'zod'
import type { Prisma } from '@prisma/client'

const createScreeningSchema = z.object({
  clientId: z.string().uuid(),
  screenType: z.enum(['FMS', 'SFMA', 'Y_BALANCE', 'CUSTOM']),
  screenDate: z.string().datetime().optional(),
  results: z.record(z.any()), // Flexible results storage
  totalScore: z.number().optional(),
  asymmetryFlag: z.boolean().optional(),
  priorityAreas: z.array(z.string()).optional(),
  recommendations: z.array(z.string()).optional(),
  notes: z.string().optional(),
})

/**
 * GET /api/physio/screenings
 * List movement screenings
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requirePhysio()
    const { searchParams } = new URL(request.url)

    // Parse query parameters
    const clientId = searchParams.get('clientId')
    const screeningType = searchParams.get('screeningType')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build where clause
    const where: Record<string, unknown> = {
      physioUserId: user.id,
    }

    if (clientId) {
      const hasAccess = await canAccessAthleteAsPhysio(user.id, clientId)
      if (!hasAccess) {
        return NextResponse.json(
          { error: 'You do not have access to this athlete' },
          { status: 403 }
        )
      }
      where.clientId = clientId
    }

    if (screeningType) {
      where.screenType = screeningType
    }

    const [screenings, total] = await Promise.all([
      prisma.movementScreen.findMany({
        where,
        include: {
          client: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { screenDate: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.movementScreen.count({ where }),
    ])

    return NextResponse.json({
      screenings,
      total,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Error fetching screenings:', error)
    if (error instanceof Error && error.message.includes('Access denied')) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    return NextResponse.json(
      { error: 'Failed to fetch screenings' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/physio/screenings
 * Create a new movement screening
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requirePhysio()
    const body = await request.json()
    const validatedData = createScreeningSchema.parse(body)

    // Verify access to this client
    const hasAccess = await canAccessAthleteAsPhysio(user.id, validatedData.clientId)
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'You do not have access to this athlete' },
        { status: 403 }
      )
    }

    const screening = await prisma.movementScreen.create({
      data: {
        clientId: validatedData.clientId,
        physioUserId: user.id,
        screenType: validatedData.screenType,
        screenDate: validatedData.screenDate ? new Date(validatedData.screenDate) : new Date(),
        results: validatedData.results as Prisma.InputJsonValue,
        totalScore: validatedData.totalScore,
        asymmetryFlag: validatedData.asymmetryFlag ?? false,
        priorityAreas: validatedData.priorityAreas || [],
        recommendations: validatedData.recommendations || [],
        notes: validatedData.notes,
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return NextResponse.json(screening, { status: 201 })
  } catch (error) {
    console.error('Error creating screening:', error)
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
      { error: 'Failed to create screening' },
      { status: 500 }
    )
  }
}

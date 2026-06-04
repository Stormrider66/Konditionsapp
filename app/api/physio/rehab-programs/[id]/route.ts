// app/api/physio/rehab-programs/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePhysio, getCurrentUser, canAccessClient, canAccessAthleteAsPhysio } from '@/lib/auth-utils'
import { z } from 'zod'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

const updateProgramSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  currentPhase: z.enum(['ACUTE', 'SUBACUTE', 'REMODELING', 'FUNCTIONAL', 'RETURN_TO_SPORT']).optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED']).optional(),
  estimatedEndDate: z.string().datetime().optional().nullable(),
  shortTermGoals: z.array(z.string()).optional(),
  longTermGoals: z.array(z.string()).optional(),
  contraindications: z.array(z.string()).optional(),
  precautions: z.array(z.string()).optional(),
  acceptablePainDuring: z.number().int().min(0).max(10).optional(),
  acceptablePainAfter: z.number().int().min(0).max(10).optional(),
  notes: z.string().optional(),
})

/**
 * GET /api/physio/rehab-programs/[id]
 * Get a specific rehab program with exercises and milestones
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let locale = resolveRequestLocale(request)

  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    locale = resolveRequestLocale(request, user.language)

    const { id } = await params

    const program = await prisma.rehabProgram.findUnique({
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
        physio: {
          select: {
            id: true,
            name: true,
          },
        },
        injury: {
          select: {
            id: true,
            injuryType: true,
            bodyPart: true,
            painLevel: true,
            phase: true,
          },
        },
        exercises: {
          where: { isActive: true },
          include: {
            exercise: {
              select: {
                id: true,
                name: true,
                nameSv: true,
                nameEn: true,
                description: true,
                videoUrl: true,
                instructions: true,
              },
            },
          },
          orderBy: { order: 'asc' },
        },
        milestones: {
          orderBy: { order: 'asc' },
        },
        progressLogs: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            client: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    })

    if (!program) {
      return NextResponse.json({ error: t(locale, 'Rehab program not found', 'Rehabprogrammet hittades inte') }, { status: 404 })
    }

    // Check access
    let hasAccess = false
    if (user.role === 'ADMIN') {
      hasAccess = true
    } else if (program.physioUserId === user.id) {
      hasAccess = true
    } else if (user.role === 'ATHLETE') {
      hasAccess = await canAccessClient(user.id, program.clientId)
    } else {
      hasAccess = await canAccessClient(user.id, program.clientId)
    }

    if (!hasAccess) {
      return NextResponse.json({ error: t(locale, 'Access denied', 'Åtkomst nekad') }, { status: 403 })
    }

    return NextResponse.json(program)
  } catch (error) {
    console.error('Error fetching rehab program:', error)
    return NextResponse.json(
      { error: t(locale, 'Failed to fetch rehab program', 'Kunde inte hämta rehabprogrammet') },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/physio/rehab-programs/[id]
 * Update a rehab program
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let locale = resolveRequestLocale(request)

  try {
    const user = await requirePhysio()
    locale = resolveRequestLocale(request, user.language)
    const { id } = await params
    const body = await request.json()
    const validatedData = updateProgramSchema.parse(body)

    // Check if program exists and belongs to this physio
    const existingProgram = await prisma.rehabProgram.findUnique({
      where: { id },
    })

    if (!existingProgram) {
      return NextResponse.json({ error: t(locale, 'Rehab program not found', 'Rehabprogrammet hittades inte') }, { status: 404 })
    }

    const hasAccess = existingProgram.physioUserId === user.id ||
      await canAccessAthleteAsPhysio(user.id, existingProgram.clientId)

    if (!hasAccess) {
      return NextResponse.json({ error: t(locale, 'Access denied', 'Åtkomst nekad') }, { status: 403 })
    }

    const program = await prisma.rehabProgram.update({
      where: { id },
      data: {
        ...validatedData,
        estimatedEndDate: validatedData.estimatedEndDate
          ? new Date(validatedData.estimatedEndDate)
          : validatedData.estimatedEndDate === null
            ? null
            : undefined,
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
          },
        },
        injury: {
          select: {
            id: true,
            injuryType: true,
            bodyPart: true,
          },
        },
      },
    })

    return NextResponse.json(program)
  } catch (error) {
    console.error('Error updating rehab program:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: t(locale, 'Validation error', 'Valideringsfel'), details: error.errors },
        { status: 400 }
      )
    }
    if (error instanceof Error && error.message.includes('Access denied')) {
      return NextResponse.json({ error: t(locale, 'Access denied', 'Åtkomst nekad') }, { status: 403 })
    }
    return NextResponse.json(
      { error: t(locale, 'Failed to update rehab program', 'Kunde inte uppdatera rehabprogrammet') },
      { status: 500 }
    )
  }
}

// app/api/physio/treatments/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePhysio, canAccessAthleteAsPhysio } from '@/lib/auth-utils'
import { z } from 'zod'
import type { Prisma } from '@prisma/client'

// Validation schema for creating a treatment session
const createTreatmentSchema = z.object({
  clientId: z.string().uuid(),
  injuryId: z.string().uuid().optional(),
  sessionDate: z.string().datetime().optional(),
  duration: z.number().int().min(1).max(480).optional(),
  treatmentType: z.enum([
    'ASSESSMENT',
    'MANUAL_THERAPY',
    'DRY_NEEDLING',
    'EXERCISE_THERAPY',
    'ELECTROTHERAPY',
    'TAPING',
    'EDUCATION',
    'DISCHARGE',
    'OTHER',
  ]),
  // SOAP Notes
  subjective: z.string().optional(),
  objective: z.string().optional(),
  assessment: z.string().optional(),
  plan: z.string().optional(),
  // Pain tracking
  painBefore: z.number().int().min(0).max(10).optional(),
  painAfter: z.number().int().min(0).max(10).optional(),
  // ROM measurements
  romMeasurements: z.record(z.any()).optional(),
  // Modalities
  modalitiesUsed: z.array(z.string()).default([]),
  // Follow-up
  followUpRequired: z.boolean().default(false),
  followUpDate: z.string().datetime().optional(),
  followUpNotes: z.string().optional(),
  // Billing
  isBillable: z.boolean().default(true),
  billingCode: z.string().optional(),
})

/**
 * GET /api/physio/treatments
 * List treatment sessions for the current physio
 * Supports filtering by clientId, date range, treatment type
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requirePhysio()
    const { searchParams } = new URL(request.url)

    // Parse query parameters
    const clientId = searchParams.get('clientId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const treatmentType = searchParams.get('treatmentType')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build where clause
    const where: Record<string, unknown> = {
      physioUserId: user.id,
    }

    if (clientId) {
      // Verify access to this client
      const hasAccess = await canAccessAthleteAsPhysio(user.id, clientId)
      if (!hasAccess) {
        return NextResponse.json(
          { error: 'You do not have access to this athlete' },
          { status: 403 }
        )
      }
      where.clientId = clientId
    }

    if (startDate) {
      where.sessionDate = {
        ...(where.sessionDate as Record<string, unknown> || {}),
        gte: new Date(startDate),
      }
    }

    if (endDate) {
      where.sessionDate = {
        ...(where.sessionDate as Record<string, unknown> || {}),
        lte: new Date(endDate),
      }
    }

    if (treatmentType) {
      where.treatmentType = treatmentType
    }

    const [treatments, total] = await Promise.all([
      prisma.treatmentSession.findMany({
        where,
        include: {
          client: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          injury: {
            select: {
              id: true,
              injuryType: true,
              bodyPart: true,
              phase: true,
            },
          },
        },
        orderBy: {
          sessionDate: 'desc',
        },
        take: limit,
        skip: offset,
      }),
      prisma.treatmentSession.count({ where }),
    ])

    return NextResponse.json({
      treatments,
      total,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Error fetching treatment sessions:', error)
    if (error instanceof Error && error.message.includes('Access denied')) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    return NextResponse.json(
      { error: 'Failed to fetch treatment sessions' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/physio/treatments
 * Create a new treatment session
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requirePhysio()
    const body = await request.json()
    const validatedData = createTreatmentSchema.parse(body)

    // Verify access to this client
    const hasAccess = await canAccessAthleteAsPhysio(user.id, validatedData.clientId)
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'You do not have access to this athlete' },
        { status: 403 }
      )
    }

    // If injuryId is provided, verify it belongs to this client
    if (validatedData.injuryId) {
      const injury = await prisma.injuryAssessment.findFirst({
        where: {
          id: validatedData.injuryId,
          clientId: validatedData.clientId,
        },
      })
      if (!injury) {
        return NextResponse.json(
          { error: 'Injury not found or does not belong to this client' },
          { status: 404 }
        )
      }
    }

    const treatment = await prisma.treatmentSession.create({
      data: {
        physioUserId: user.id,
        clientId: validatedData.clientId,
        injuryId: validatedData.injuryId,
        sessionDate: validatedData.sessionDate ? new Date(validatedData.sessionDate) : new Date(),
        duration: validatedData.duration,
        treatmentType: validatedData.treatmentType,
        subjective: validatedData.subjective,
        objective: validatedData.objective,
        assessment: validatedData.assessment,
        plan: validatedData.plan,
        painBefore: validatedData.painBefore,
        painAfter: validatedData.painAfter,
        romMeasurements: validatedData.romMeasurements as Prisma.InputJsonValue | undefined,
        modalitiesUsed: validatedData.modalitiesUsed,
        followUpRequired: validatedData.followUpRequired,
        followUpDate: validatedData.followUpDate ? new Date(validatedData.followUpDate) : undefined,
        followUpNotes: validatedData.followUpNotes,
        isBillable: validatedData.isBillable,
        billingCode: validatedData.billingCode,
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

    return NextResponse.json(treatment, { status: 201 })
  } catch (error) {
    console.error('Error creating treatment session:', error)
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
      { error: 'Failed to create treatment session' },
      { status: 500 }
    )
  }
}

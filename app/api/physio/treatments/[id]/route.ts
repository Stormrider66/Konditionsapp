// app/api/physio/treatments/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePhysio } from '@/lib/auth-utils'
import { z } from 'zod'
import type { Prisma } from '@prisma/client'

const updateTreatmentSchema = z.object({
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
  ]).optional(),
  subjective: z.string().optional(),
  objective: z.string().optional(),
  assessment: z.string().optional(),
  plan: z.string().optional(),
  painBefore: z.number().int().min(0).max(10).optional(),
  painAfter: z.number().int().min(0).max(10).optional(),
  romMeasurements: z.record(z.any()).optional(),
  modalitiesUsed: z.array(z.string()).optional(),
  followUpRequired: z.boolean().optional(),
  followUpDate: z.string().datetime().optional(),
  followUpNotes: z.string().optional(),
})

/**
 * GET /api/physio/treatments/[id]
 * Get a specific treatment session
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePhysio()
    const { id } = await params

    const session = await prisma.treatmentSession.findUnique({
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
      },
    })

    if (!session) {
      return NextResponse.json({ error: 'Treatment session not found' }, { status: 404 })
    }

    // Check access - physio can only see their own sessions
    if (session.physioUserId !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    return NextResponse.json(session)
  } catch (error) {
    console.error('Error fetching treatment session:', error)
    if (error instanceof Error && error.message.includes('Access denied')) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    return NextResponse.json(
      { error: 'Failed to fetch treatment session' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/physio/treatments/[id]
 * Update a treatment session
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePhysio()
    const { id } = await params
    const body = await request.json()
    const validatedData = updateTreatmentSchema.parse(body)

    // Check if session exists and belongs to this physio
    const existingSession = await prisma.treatmentSession.findUnique({
      where: { id },
    })

    if (!existingSession) {
      return NextResponse.json({ error: 'Treatment session not found' }, { status: 404 })
    }

    if (existingSession.physioUserId !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const session = await prisma.treatmentSession.update({
      where: { id },
      data: {
        ...(validatedData.treatmentType && { treatmentType: validatedData.treatmentType }),
        ...(validatedData.subjective !== undefined && { subjective: validatedData.subjective }),
        ...(validatedData.objective !== undefined && { objective: validatedData.objective }),
        ...(validatedData.assessment !== undefined && { assessment: validatedData.assessment }),
        ...(validatedData.plan !== undefined && { plan: validatedData.plan }),
        ...(validatedData.painBefore !== undefined && { painBefore: validatedData.painBefore }),
        ...(validatedData.painAfter !== undefined && { painAfter: validatedData.painAfter }),
        ...(validatedData.romMeasurements && { romMeasurements: validatedData.romMeasurements as Prisma.InputJsonValue }),
        ...(validatedData.modalitiesUsed && { modalitiesUsed: validatedData.modalitiesUsed }),
        ...(validatedData.followUpRequired !== undefined && { followUpRequired: validatedData.followUpRequired }),
        ...(validatedData.followUpDate && { followUpDate: new Date(validatedData.followUpDate) }),
        ...(validatedData.followUpNotes !== undefined && { followUpNotes: validatedData.followUpNotes }),
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

    return NextResponse.json(session)
  } catch (error) {
    console.error('Error updating treatment session:', error)
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
      { error: 'Failed to update treatment session' },
      { status: 500 }
    )
  }
}

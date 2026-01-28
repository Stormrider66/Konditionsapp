import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateOutcomeSchema = z.object({
  outcomeAssessment: z.enum(['BETTER_THAN_AI', 'SAME_AS_AI', 'WORSE_THAN_AI', 'UNKNOWN']),
  outcomeNotes: z.string().optional(),
})

// PATCH: Update the outcome assessment for a coach decision
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify decision exists and belongs to user
    const existingDecision = await prisma.coachDecision.findUnique({
      where: { id },
    })

    if (!existingDecision) {
      return NextResponse.json({ error: 'Decision not found' }, { status: 404 })
    }

    if (existingDecision.coachId !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = updateOutcomeSchema.parse(body)

    const updatedDecision = await prisma.coachDecision.update({
      where: { id },
      data: {
        outcomeAssessment: validatedData.outcomeAssessment,
        outcomeNotes: validatedData.outcomeNotes,
        outcomeValidatedAt: new Date(),
        validated: true,
        updatedAt: new Date(),
      },
      include: {
        athlete: {
          select: {
            id: true,
            name: true,
          },
        },
        workout: {
          select: {
            id: true,
            name: true,
          },
        },
        program: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return NextResponse.json(updatedDecision)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 })
    }
    console.error('Error updating outcome:', error)
    return NextResponse.json({ error: 'Failed to update outcome' }, { status: 500 })
  }
}

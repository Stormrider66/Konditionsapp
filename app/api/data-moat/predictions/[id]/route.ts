import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updatePredictionSchema = z.object({
  displayedToUser: z.boolean().optional(),
  userAction: z.enum(['ACCEPTED', 'IGNORED', 'MODIFIED', 'REJECTED']).optional(),
})

// GET: Get a specific prediction
export async function GET(
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

    const prediction = await prisma.aIPrediction.findUnique({
      where: { id },
      include: {
        athlete: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        coach: {
          select: {
            id: true,
            name: true,
          },
        },
        validation: true,
      },
    })

    if (!prediction) {
      return NextResponse.json({ error: 'Prediction not found' }, { status: 404 })
    }

    // Verify access
    if (prediction.coachId !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    return NextResponse.json(prediction)
  } catch (error) {
    console.error('Error fetching prediction:', error)
    return NextResponse.json({ error: 'Failed to fetch prediction' }, { status: 500 })
  }
}

// PATCH: Update a prediction (mark as displayed, user action, etc.)
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

    // Verify prediction exists and belongs to user
    const existingPrediction = await prisma.aIPrediction.findUnique({
      where: { id },
    })

    if (!existingPrediction) {
      return NextResponse.json({ error: 'Prediction not found' }, { status: 404 })
    }

    if (existingPrediction.coachId !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = updatePredictionSchema.parse(body)

    const updatedPrediction = await prisma.aIPrediction.update({
      where: { id },
      data: validatedData,
      include: {
        athlete: {
          select: {
            id: true,
            name: true,
          },
        },
        validation: true,
      },
    })

    return NextResponse.json(updatedPrediction)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 })
    }
    console.error('Error updating prediction:', error)
    return NextResponse.json({ error: 'Failed to update prediction' }, { status: 500 })
  }
}

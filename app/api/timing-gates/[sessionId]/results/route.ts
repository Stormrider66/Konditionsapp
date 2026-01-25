// app/api/timing-gates/[sessionId]/results/route.ts
// API routes for timing gate session results

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { SportTestProtocol } from '@prisma/client'
import { z } from 'zod'

const createResultSchema = z.object({
  athleteId: z.string().uuid().optional(),
  unmatchedAthleteName: z.string().optional(),
  testProtocol: z.nativeEnum(SportTestProtocol).optional(),
  attemptNumber: z.number().int().min(1).default(1),
  splitTimes: z.array(z.number()),
  totalTime: z.number(),
  acceleration: z.number().optional(),
  maxVelocity: z.number().optional(),
  codDeficit: z.number().optional(),
  valid: z.boolean().default(true),
  invalidReason: z.string().optional(),
  notes: z.string().optional()
})

const matchAthleteSchema = z.object({
  athleteId: z.string().uuid()
})

interface RouteParams {
  params: Promise<{ sessionId: string }>
}

// GET /api/timing-gates/[sessionId]/results - List results for session
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { sessionId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const athleteId = searchParams.get('athleteId')
    const validOnly = searchParams.get('validOnly') === 'true'
    const sortBy = searchParams.get('sortBy') || 'totalTime'
    const sortOrder = searchParams.get('sortOrder') || 'asc'

    // Verify session exists and user has access
    const session = await prisma.timingGateSession.findUnique({
      where: { id: sessionId },
      select: { coachId: true }
    })

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const where: Record<string, unknown> = { sessionId }

    if (athleteId) {
      where.athleteId = athleteId
    }

    if (validOnly) {
      where.valid = true
    }

    const results = await prisma.timingGateResult.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      include: {
        athlete: {
          select: { id: true, name: true }
        }
      }
    })

    return NextResponse.json(results)
  } catch (error) {
    console.error('Error fetching timing gate results:', error)
    return NextResponse.json(
      { error: 'Failed to fetch timing gate results' },
      { status: 500 }
    )
  }
}

// POST /api/timing-gates/[sessionId]/results - Add manual result
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { sessionId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify session exists and user owns it
    const session = await prisma.timingGateSession.findUnique({
      where: { id: sessionId },
      select: { coachId: true }
    })

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    if (session.coachId !== user.id) {
      return NextResponse.json({ error: 'You can only add results to your own sessions' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = createResultSchema.parse(body)

    const result = await prisma.timingGateResult.create({
      data: {
        sessionId,
        ...validatedData
      },
      include: {
        athlete: {
          select: { id: true, name: true }
        }
      }
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error creating timing gate result:', error)
    return NextResponse.json(
      { error: 'Failed to create timing gate result' },
      { status: 500 }
    )
  }
}

// PUT /api/timing-gates/[sessionId]/results - Match athlete to unassigned result
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { sessionId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify session exists and user owns it
    const session = await prisma.timingGateSession.findUnique({
      where: { id: sessionId },
      select: { coachId: true }
    })

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    if (session.coachId !== user.id) {
      return NextResponse.json({ error: 'You can only modify your own sessions' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const resultId = searchParams.get('resultId')

    if (!resultId) {
      return NextResponse.json({ error: 'resultId is required' }, { status: 400 })
    }

    const body = await request.json()
    const { athleteId } = matchAthleteSchema.parse(body)

    // Verify athlete belongs to coach
    const athlete = await prisma.client.findFirst({
      where: {
        id: athleteId,
        userId: user.id
      },
      select: { id: true, name: true }
    })

    if (!athlete) {
      return NextResponse.json({ error: 'Athlete not found or does not belong to you' }, { status: 404 })
    }

    const result = await prisma.timingGateResult.update({
      where: { id: resultId },
      data: {
        athleteId,
        unmatchedAthleteName: null,
        unmatchedAthleteId: null
      },
      include: {
        athlete: {
          select: { id: true, name: true }
        }
      }
    })

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error matching athlete to result:', error)
    return NextResponse.json(
      { error: 'Failed to match athlete to result' },
      { status: 500 }
    )
  }
}

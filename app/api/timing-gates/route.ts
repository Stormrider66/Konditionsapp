// app/api/timing-gates/route.ts
// API routes for timing gate sessions

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { TimingGateSource } from '@prisma/client'
import { z } from 'zod'

const createSessionSchema = z.object({
  sessionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  sessionName: z.string().optional(),
  importSource: z.nativeEnum(TimingGateSource).default('MANUAL'),
  gateCount: z.number().int().min(2).optional(),
  intervalDistances: z.array(z.number()).optional().default([]),
  locationId: z.string().uuid().optional(),
  notes: z.string().optional()
})

// GET /api/timing-gates - List timing gate sessions
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const coachId = searchParams.get('coachId') || user.id
    const locationId = searchParams.get('locationId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const limit = parseInt(searchParams.get('limit') || '50')

    const where: Record<string, unknown> = { coachId }

    if (locationId) {
      where.locationId = locationId
    }

    if (startDate || endDate) {
      where.sessionDate = {}
      if (startDate) {
        (where.sessionDate as Record<string, unknown>).gte = new Date(startDate)
      }
      if (endDate) {
        (where.sessionDate as Record<string, unknown>).lte = new Date(endDate)
      }
    }

    const sessions = await prisma.timingGateSession.findMany({
      where,
      orderBy: { sessionDate: 'desc' },
      take: limit,
      include: {
        location: {
          select: { id: true, name: true, city: true }
        },
        _count: {
          select: { results: true }
        }
      }
    })

    return NextResponse.json(sessions)
  } catch (error) {
    console.error('Error fetching timing gate sessions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch timing gate sessions' },
      { status: 500 }
    )
  }
}

// POST /api/timing-gates - Create new session (manual entry)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user is a coach
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true }
    })

    if (!dbUser || (dbUser.role !== 'COACH' && dbUser.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Only coaches can create timing sessions' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = createSessionSchema.parse(body)

    const session = await prisma.timingGateSession.create({
      data: {
        coachId: user.id,
        sessionDate: new Date(validatedData.sessionDate),
        sessionName: validatedData.sessionName,
        importSource: validatedData.importSource,
        gateCount: validatedData.gateCount,
        intervalDistances: validatedData.intervalDistances,
        locationId: validatedData.locationId,
        notes: validatedData.notes
      },
      include: {
        location: {
          select: { id: true, name: true }
        }
      }
    })

    return NextResponse.json(session, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error creating timing gate session:', error)
    return NextResponse.json(
      { error: 'Failed to create timing gate session' },
      { status: 500 }
    )
  }
}

/**
 * Match Schedule API
 *
 * Manages external match schedules for team sports (hockey, football, etc.)
 * GET - List matches for the authenticated athlete
 * POST - Create a new match entry
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { z } from 'zod'

const createMatchSchema = z.object({
  externalMatchId: z.string().optional(),
  opponent: z.string().min(1, 'Opponent is required'),
  isHome: z.boolean(),
  scheduledDate: z.string().datetime(),
  venue: z.string().optional(),
  competition: z.string().optional(),
  matchday: z.number().optional(),
  externalSource: z.string().default('manual'),
})

export async function GET(request: NextRequest) {
  try {
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    const { clientId } = resolved

    const { searchParams } = new URL(request.url)
    const upcoming = searchParams.get('upcoming') === 'true'
    const limit = parseInt(searchParams.get('limit') || '20')
    const includeResults = searchParams.get('includeResults') === 'true'

    const now = new Date()

    const matches = await prisma.externalMatchSchedule.findMany({
      where: {
        clientId,
        ...(upcoming && { scheduledDate: { gte: now } }),
        ...(!includeResults && { result: null }),
      },
      orderBy: {
        scheduledDate: upcoming ? 'asc' : 'desc',
      },
      take: limit,
    })

    // Group by month for better organization
    const groupedByMonth: Record<string, typeof matches> = {}
    for (const match of matches) {
      const monthKey = match.scheduledDate.toISOString().slice(0, 7) // YYYY-MM
      if (!groupedByMonth[monthKey]) {
        groupedByMonth[monthKey] = []
      }
      groupedByMonth[monthKey].push(match)
    }

    return NextResponse.json({
      matches,
      groupedByMonth,
      total: matches.length,
    })
  } catch (error) {
    console.error('Error fetching match schedule:', error)
    return NextResponse.json(
      { error: 'Failed to fetch match schedule' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    const { clientId } = resolved

    const body = await request.json()
    const validatedData = createMatchSchema.parse(body)

    // Generate external ID if not provided
    const externalMatchId = validatedData.externalMatchId ||
      `manual_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

    const match = await prisma.externalMatchSchedule.create({
      data: {
        clientId,
        externalMatchId,
        opponent: validatedData.opponent,
        isHome: validatedData.isHome,
        scheduledDate: new Date(validatedData.scheduledDate),
        venue: validatedData.venue,
        competition: validatedData.competition,
        matchday: validatedData.matchday,
        externalSource: validatedData.externalSource,
      },
    })

    return NextResponse.json(match, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error creating match:', error)
    return NextResponse.json(
      { error: 'Failed to create match' },
      { status: 500 }
    )
  }
}

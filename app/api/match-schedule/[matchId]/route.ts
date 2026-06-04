/**
 * Individual Match Schedule API
 *
 * GET - Get a specific match
 * PATCH - Update match details or add result
 * DELETE - Remove a match
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'
import { z } from 'zod'

const updateMatchSchema = z.object({
  opponent: z.string().min(1).optional(),
  isHome: z.boolean().optional(),
  scheduledDate: z.string().datetime().optional(),
  venue: z.string().optional().nullable(),
  competition: z.string().optional().nullable(),
  matchday: z.number().optional().nullable(),
  // Post-match data
  result: z.string().optional().nullable(),
  minutesPlayed: z.number().optional().nullable(),
  goals: z.number().optional().nullable(),
  assists: z.number().optional().nullable(),
  plusMinus: z.number().optional().nullable(),
  penaltyMinutes: z.number().optional().nullable(),
  // GPS data (for football)
  distanceKm: z.number().optional().nullable(),
  sprintDistance: z.number().optional().nullable(),
  maxSpeed: z.number().optional().nullable(),
})

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const locale = resolveRequestLocale(request)
  try {
    const resolved = await resolveAthleteClientId()
    const { matchId } = await params

    if (!resolved) {
      return NextResponse.json(
        { error: t(locale, 'Unauthorized', 'Obehörig') },
        { status: 401 }
      )
    }
    const { clientId } = resolved

    const match = await prisma.externalMatchSchedule.findFirst({
      where: {
        id: matchId,
        clientId,
      },
    })

    if (!match) {
      return NextResponse.json(
        { error: t(locale, 'Match not found', 'Matchen hittades inte') },
        { status: 404 }
      )
    }

    return NextResponse.json(match)
  } catch (error) {
    console.error('Error fetching match:', error)
    return NextResponse.json(
      { error: t(locale, 'Failed to fetch match', 'Kunde inte hämta matchen') },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const locale = resolveRequestLocale(request)
  try {
    const resolved = await resolveAthleteClientId()
    const { matchId } = await params

    if (!resolved) {
      return NextResponse.json(
        { error: t(locale, 'Unauthorized', 'Obehörig') },
        { status: 401 }
      )
    }
    const { clientId } = resolved

    // Verify ownership
    const existingMatch = await prisma.externalMatchSchedule.findFirst({
      where: {
        id: matchId,
        clientId,
      },
    })

    if (!existingMatch) {
      return NextResponse.json(
        { error: t(locale, 'Match not found', 'Matchen hittades inte') },
        { status: 404 }
      )
    }

    const body = await request.json()
    const validatedData = updateMatchSchema.parse(body)

    const updateData: Record<string, unknown> = {}

    if (validatedData.opponent !== undefined) updateData.opponent = validatedData.opponent
    if (validatedData.isHome !== undefined) updateData.isHome = validatedData.isHome
    if (validatedData.scheduledDate !== undefined) updateData.scheduledDate = new Date(validatedData.scheduledDate)
    if (validatedData.venue !== undefined) updateData.venue = validatedData.venue
    if (validatedData.competition !== undefined) updateData.competition = validatedData.competition
    if (validatedData.matchday !== undefined) updateData.matchday = validatedData.matchday
    if (validatedData.result !== undefined) updateData.result = validatedData.result
    if (validatedData.minutesPlayed !== undefined) updateData.minutesPlayed = validatedData.minutesPlayed
    if (validatedData.goals !== undefined) updateData.goals = validatedData.goals
    if (validatedData.assists !== undefined) updateData.assists = validatedData.assists
    if (validatedData.plusMinus !== undefined) updateData.plusMinus = validatedData.plusMinus
    if (validatedData.penaltyMinutes !== undefined) updateData.penaltyMinutes = validatedData.penaltyMinutes
    if (validatedData.distanceKm !== undefined) updateData.distanceKm = validatedData.distanceKm
    if (validatedData.sprintDistance !== undefined) updateData.sprintDistance = validatedData.sprintDistance
    if (validatedData.maxSpeed !== undefined) updateData.maxSpeed = validatedData.maxSpeed

    const updatedMatch = await prisma.externalMatchSchedule.update({
      where: { id: matchId },
      data: updateData,
    })

    return NextResponse.json(updatedMatch)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: t(locale, 'Validation error', 'Valideringsfel'), details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error updating match:', error)
    return NextResponse.json(
      { error: t(locale, 'Failed to update match', 'Kunde inte uppdatera matchen') },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const locale = resolveRequestLocale(request)
  try {
    const resolved = await resolveAthleteClientId()
    const { matchId } = await params

    if (!resolved) {
      return NextResponse.json(
        { error: t(locale, 'Unauthorized', 'Obehörig') },
        { status: 401 }
      )
    }
    const { clientId } = resolved

    // Verify ownership
    const existingMatch = await prisma.externalMatchSchedule.findFirst({
      where: {
        id: matchId,
        clientId,
      },
    })

    if (!existingMatch) {
      return NextResponse.json(
        { error: t(locale, 'Match not found', 'Matchen hittades inte') },
        { status: 404 }
      )
    }

    await prisma.externalMatchSchedule.delete({
      where: { id: matchId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting match:', error)
    return NextResponse.json(
      { error: t(locale, 'Failed to delete match', 'Kunde inte ta bort matchen') },
      { status: 500 }
    )
  }
}

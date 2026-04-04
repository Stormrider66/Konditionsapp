/**
 * Athlete Team Calendar API
 *
 * GET - List upcoming team events for the athlete's teams
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const { clientId } = await requireAthleteOrCoachInAthleteMode()

    if (!clientId) {
      return NextResponse.json({ events: [] })
    }

    const { searchParams } = new URL(req.url)
    const from = searchParams.get('from') || new Date().toISOString()
    const days = parseInt(searchParams.get('days') || '30')
    const to = new Date(new Date(from).getTime() + days * 24 * 60 * 60 * 1000).toISOString()

    // Find all teams this athlete belongs to
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        teams: { select: { id: true, name: true } },
      },
    })

    if (!client || client.teams.length === 0) {
      return NextResponse.json({ events: [] })
    }

    const teamIds = client.teams.map((t) => t.id)

    const events = await prisma.teamEvent.findMany({
      where: {
        teamId: { in: teamIds },
        startDate: { gte: new Date(from), lte: new Date(to) },
      },
      include: {
        team: { select: { id: true, name: true } },
        createdBy: { select: { name: true } },
      },
      orderBy: { startDate: 'asc' },
    })

    return NextResponse.json({
      events: events.map((e) => ({
        id: e.id,
        teamId: e.teamId,
        teamName: e.team.name,
        title: e.title,
        description: e.description,
        type: e.type,
        location: e.location,
        startDate: e.startDate.toISOString(),
        endDate: e.endDate?.toISOString() ?? null,
        allDay: e.allDay,
        createdBy: e.createdBy.name,
      })),
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

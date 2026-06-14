/**
 * Live HR Sessions API
 *
 * GET  - List coach's sessions
 * POST - Create new session
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCoach } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { getCoachScopedIds } from '@/lib/coach/scoping'
import { getAccessibleTeamWhere } from '@/lib/coach/team-access'
import { prisma } from '@/lib/prisma'
import {
  createLiveHRSession,
  listCoachSessions,
} from '@/lib/live-hr/session-service'
import { resolveLocale, t, type AppLocale } from '@/lib/live-hr/api-locale'
import { CreateLiveHRSessionInput } from '@/lib/live-hr/types'

type CreateLiveHRSessionBody = CreateLiveHRSessionInput & {
  businessSlug?: string
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)))
}

async function resolveCreateInput(
  userId: string,
  body: CreateLiveHRSessionBody
): Promise<CreateLiveHRSessionInput | null> {
  const requestedParticipantIds = Array.isArray(body.participantIds)
    ? body.participantIds.filter((id): id is string => typeof id === 'string')
    : []
  const participantIds = [...requestedParticipantIds]
  const teamId = typeof body.teamId === 'string' ? body.teamId : undefined

  if (body.businessSlug) {
    const membership = await validateBusinessMembership(userId, body.businessSlug)
    if (!membership) return null

    const teamWhere = await getAccessibleTeamWhere(userId, body.businessSlug)
    const teams = await prisma.team.findMany({
      where: teamWhere,
      select: {
        id: true,
        members: { select: { id: true } },
      },
    })
    const selectedTeam = teamId ? teams.find((team) => team.id === teamId) : null
    if (teamId && !selectedTeam) return null
    if (selectedTeam) {
      participantIds.push(...selectedTeam.members.map((member) => member.id))
    }

    const coachIds = await getCoachScopedIds(userId, membership.businessId, membership.role)
    const teamIds = teams.map((team) => team.id)
    const uniqueParticipantIds = uniqueStrings(participantIds)
    const accessibleClients = uniqueParticipantIds.length > 0
      ? await prisma.client.findMany({
          where: {
            id: { in: uniqueParticipantIds },
            businessId: membership.businessId,
            OR: [
              { userId: { in: coachIds } },
              ...(teamIds.length > 0 ? [{ teamId: { in: teamIds } }] : []),
            ],
          },
          select: { id: true },
        })
      : []

    if (requestedParticipantIds.length > 0 && accessibleClients.length !== uniqueParticipantIds.length) {
      return null
    }

    return {
      name: body.name,
      teamId,
      participantIds: accessibleClients.map((client) => client.id),
    }
  }

  if (teamId) {
    const team = await prisma.team.findFirst({
      where: { id: teamId, userId },
      select: {
        id: true,
        members: { select: { id: true } },
      },
    })
    if (!team) return null
    participantIds.push(...team.members.map((member) => member.id))
  }

  const uniqueParticipantIds = uniqueStrings(participantIds)
  const accessibleClients = uniqueParticipantIds.length > 0
    ? await prisma.client.findMany({
        where: {
          id: { in: uniqueParticipantIds },
          userId,
        },
        select: { id: true },
      })
    : []

  if (requestedParticipantIds.length > 0 && accessibleClients.length !== uniqueParticipantIds.length) {
    return null
  }

  return {
    name: body.name,
    teamId,
    participantIds: accessibleClients.map((client) => client.id),
  }
}

export async function GET(req: NextRequest) {
  let locale: AppLocale = 'en'

  try {
    const user = await requireCoach()
    locale = resolveLocale(user.language)

    const { searchParams } = new URL(req.url)
    const includeEnded = searchParams.get('includeEnded') === 'true'

    const sessions = await listCoachSessions(user.id, includeEnded)

    return NextResponse.json({ sessions })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    console.error('Error listing live HR sessions:', error)
    return NextResponse.json(
      { error: t(locale, 'Failed to list sessions', 'Kunde inte hämta passen') },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  let locale: AppLocale = 'en'

  try {
    const user = await requireCoach()
    locale = resolveLocale(user.language)

    const body: CreateLiveHRSessionBody = await req.json()
    const input = await resolveCreateInput(user.id, body)
    if (!input) {
      return NextResponse.json(
        { error: t(locale, 'Selected participants are not available', 'Valda deltagare är inte tillgängliga') },
        { status: 400 }
      )
    }

    const session = await createLiveHRSession(user.id, input)

    return NextResponse.json({ session }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    console.error('Error creating live HR session:', error)
    return NextResponse.json(
      { error: t(locale, 'Failed to create session', 'Kunde inte skapa passet') },
      { status: 500 }
    )
  }
}

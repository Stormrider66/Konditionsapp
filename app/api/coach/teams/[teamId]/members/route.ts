/**
 * Team Members API
 *
 * GET  — list clients owned by this coach (for picking into a team)
 *        ?filter=unassigned | all   (default: all)
 * POST — attach one or more existing Client IDs to the team (sets teamId)
 *        body: { clientIds: string[] }
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCoach } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { connectTeamMemberToCoach } from '@/lib/coach/team-connection'
import {
  getBusinessSlugFromRequest,
  getPrimaryBusinessMembership,
  getWritableTeam,
} from '@/lib/coach/team-access'

interface RouteContext {
  params: Promise<{ teamId: string }>
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const user = await requireCoach()
    const { teamId } = await context.params
    const businessSlug = getBusinessSlugFromRequest(req)

    const team = await getWritableTeam(user.id, teamId, businessSlug, 'roster')
    if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 })

    const filter = req.nextUrl.searchParams.get('filter') ?? 'all'
    const membership = await getPrimaryBusinessMembership(user.id, businessSlug)

    const where =
      filter === 'unassigned'
        ? {
            teamId: null,
            OR: [
              { userId: team.userId },
              ...(membership?.businessId ? [{ businessId: membership.businessId }] : []),
            ],
          }
        : {
            OR: [
              { userId: team.userId },
              ...(membership?.businessId ? [{ businessId: membership.businessId }] : []),
            ],
          }

    const clients = await prisma.client.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        jerseyNumber: true,
        position: true,
        photoUrl: true,
        teamId: true,
        team: { select: { id: true, name: true } },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ clients })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    logger.error('GET team members failed', {}, error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const user = await requireCoach()
    const { teamId } = await context.params
    const businessSlug = getBusinessSlugFromRequest(req)

    const team = await getWritableTeam(user.id, teamId, businessSlug, 'roster')
    if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 })

    const body = await req.json().catch(() => ({}))
    const clientIds: unknown = body?.clientIds
    if (!Array.isArray(clientIds) || clientIds.length === 0) {
      return NextResponse.json({ error: 'clientIds array required' }, { status: 400 })
    }
    const ids = clientIds.filter((v): v is string => typeof v === 'string' && v.length > 0)
    if (ids.length === 0) {
      return NextResponse.json({ error: 'No valid client IDs' }, { status: 400 })
    }

    const membership = await getPrimaryBusinessMembership(user.id, businessSlug)

    // Only allow moving clients from the same coach/business workspace.
    const owned = await prisma.client.findMany({
      where: {
        id: { in: ids },
        OR: [
          { userId: team.userId },
          ...(membership?.businessId ? [{ businessId: membership.businessId }] : []),
        ],
      },
      select: { id: true },
    })
    const ownedIds = owned.map((c) => c.id)

    if (ownedIds.length === 0) {
      return NextResponse.json({ error: 'No clients found' }, { status: 404 })
    }

    await prisma.client.updateMany({
      where: { id: { in: ownedIds } },
      data: { teamId },
    })

    // Auto-connect each to the team coach (idempotent for same coach)
    for (const id of ownedIds) {
      try {
        await connectTeamMemberToCoach(id, teamId, {
          assignedByUserId: user.id,
          businessId: membership?.businessId,
        })
      } catch (err) {
        logger.warn('Team auto-connection failed during bulk attach', { clientId: id, teamId, error: err })
      }
    }

    return NextResponse.json({ attached: ownedIds.length })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    logger.error('POST team members failed', {}, error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

/**
 * Team Members API
 *
 * GET  — list clients owned by this coach (for picking into a team)
 *        ?filter=unassigned | all   (default: all)
 * POST — attach one or more existing Client IDs to the team (sets teamId)
 *        body: { clientIds: string[] }
 */

import { NextRequest, NextResponse } from 'next/server'
import { getRequestedBusinessScope, requireCoach } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { connectTeamMemberToCoach } from '@/lib/coach/team-connection'
import { getBusinessMembership, getWritableTeam } from '@/lib/coach/team-access'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

interface RouteContext {
  params: Promise<{ teamId: string }>
}

export async function GET(req: NextRequest, context: RouteContext) {
  let locale: AppLocale = 'en'

  try {
    const user = await requireCoach()
    locale = resolveRequestLocale(req, user.language)
    const { teamId } = await context.params
    const scope = getRequestedBusinessScope(req)

    const team = await getWritableTeam(user.id, teamId, scope.businessSlug, 'roster')
    if (!team) return NextResponse.json({ error: t(locale, 'teamNotFound') }, { status: 404 })

    const filter = req.nextUrl.searchParams.get('filter') ?? 'all'
    const membership = await getBusinessMembership(user.id, scope.businessSlug)

    const workspaceWhere = membership?.businessId
      ? { businessId: membership.businessId }
      : { userId: team.userId }

    const where =
      filter === 'unassigned'
        ? {
            ...workspaceWhere,
            teamId: null,
          }
        : workspaceWhere

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
      return NextResponse.json({ error: t(locale, 'unauthorized') }, { status: 401 })
    }
    logger.error('GET team members failed', {}, error)
    return NextResponse.json({ error: t(locale, 'failed') }, { status: 500 })
  }
}

export async function POST(req: NextRequest, context: RouteContext) {
  let locale: AppLocale = 'en'

  try {
    const user = await requireCoach()
    locale = resolveRequestLocale(req, user.language)
    const { teamId } = await context.params
    const scope = getRequestedBusinessScope(req)

    const team = await getWritableTeam(user.id, teamId, scope.businessSlug, 'roster')
    if (!team) return NextResponse.json({ error: t(locale, 'teamNotFound') }, { status: 404 })

    const body = await req.json().catch(() => ({}))
    const clientIds: unknown = body?.clientIds
    if (!Array.isArray(clientIds) || clientIds.length === 0) {
      return NextResponse.json({ error: t(locale, 'clientIdsRequired') }, { status: 400 })
    }
    const ids = clientIds.filter((v): v is string => typeof v === 'string' && v.length > 0)
    if (ids.length === 0) {
      return NextResponse.json({ error: t(locale, 'noValidClientIds') }, { status: 400 })
    }

    const membership = await getBusinessMembership(user.id, scope.businessSlug)

    // Only allow moving clients from the same business workspace.
    // In business-scoped routes, coach ownership alone is too broad because one coach
    // can belong to several businesses.
    const workspaceWhere = membership?.businessId
      ? { businessId: membership.businessId }
      : { userId: team.userId }

    const owned = await prisma.client.findMany({
      where: {
        ...workspaceWhere,
        id: { in: ids },
      },
      select: { id: true },
    })
    const ownedIds = owned.map((c) => c.id)

    if (ownedIds.length === 0) {
      return NextResponse.json({ error: t(locale, 'noClientsFound') }, { status: 404 })
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
      return NextResponse.json({ error: t(locale, 'unauthorized') }, { status: 401 })
    }
    logger.error('POST team members failed', {}, error)
    return NextResponse.json({ error: t(locale, 'failed') }, { status: 500 })
  }
}

function t(
  locale: AppLocale,
  key:
    | 'teamNotFound'
    | 'clientIdsRequired'
    | 'noValidClientIds'
    | 'noClientsFound'
    | 'unauthorized'
    | 'failed'
): string {
  const en = {
    teamNotFound: 'Team not found',
    clientIdsRequired: 'clientIds array required',
    noValidClientIds: 'No valid client IDs',
    noClientsFound: 'No clients found',
    unauthorized: 'Unauthorized',
    failed: 'Failed',
  }
  const sv = {
    teamNotFound: 'Laget hittades inte',
    clientIdsRequired: 'clientIds-lista krävs',
    noValidClientIds: 'Inga giltiga klient-ID:n',
    noClientsFound: 'Inga klienter hittades',
    unauthorized: 'Obehörig',
    failed: 'Misslyckades',
  }
  return locale === 'sv' ? sv[key] : en[key]
}

/**
 * Single Team Member API
 *
 * PATCH  — update roster fields (jerseyNumber, position, photoUrl)
 * DELETE — detach client from the team (nulls Client.teamId). Does NOT
 *          disconnect the coach or delete the client.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCoach } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { canAccessClientInTeam, getWritableTeam } from '@/lib/coach/team-access'

interface RouteContext {
  params: Promise<{ teamId: string; clientId: string }>
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const user = await requireCoach()
    const { teamId, clientId } = await context.params

    const team = await getWritableTeam(user.id, teamId, undefined, 'roster')
    const canAccessClient = team
      ? await canAccessClientInTeam(user.id, clientId, teamId)
      : false
    if (!team || !canAccessClient) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const body = await req.json().catch(() => ({}))
    const data: { jerseyNumber?: number | null; position?: string | null; photoUrl?: string | null } = {}

    if ('jerseyNumber' in body) {
      const n = body.jerseyNumber
      if (n === null || n === '' || typeof n === 'undefined') data.jerseyNumber = null
      else if (typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= 999) data.jerseyNumber = n
      else return NextResponse.json({ error: 'jerseyNumber must be 0-999' }, { status: 400 })
    }
    if ('position' in body) {
      const p = body.position
      if (p === null || p === '') data.position = null
      else if (typeof p === 'string' && p.length <= 40) data.position = p
      else return NextResponse.json({ error: 'position invalid' }, { status: 400 })
    }
    if ('photoUrl' in body) {
      const u = body.photoUrl
      if (u === null || u === '') data.photoUrl = null
      else if (typeof u === 'string' && u.length <= 2048) data.photoUrl = u
      else return NextResponse.json({ error: 'photoUrl invalid' }, { status: 400 })
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No valid fields' }, { status: 400 })
    }

    const updated = await prisma.client.update({
      where: { id: clientId },
      data,
      select: {
        id: true,
        name: true,
        jerseyNumber: true,
        position: true,
        photoUrl: true,
      },
    })

    return NextResponse.json({ client: updated })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    logger.error('PATCH team member failed', {}, error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const user = await requireCoach()
    const { teamId, clientId } = await context.params

    const team = await getWritableTeam(user.id, teamId, undefined, 'roster')
    const canAccessClient = team
      ? await canAccessClientInTeam(user.id, clientId, teamId)
      : false
    if (!team || !canAccessClient) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await prisma.client.update({
      where: { id: clientId },
      data: { teamId: null },
    })

    return NextResponse.json({ detached: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    logger.error('DELETE team member failed', {}, error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

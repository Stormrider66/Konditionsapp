import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getRequestedBusinessScope, requireCoach } from '@/lib/auth-utils'
import { getAccessibleTeam, getBusinessMembership } from '@/lib/coach/team-access'
import { logger } from '@/lib/logger'
import { prisma } from '@/lib/prisma'

interface RouteContext {
  params: Promise<{ teamId: string }>
}

const noteTags = ['TRAINING', 'TEST', 'MATCH', 'ROSTER', 'OTHER'] as const
const noteWriterRoles = new Set(['OWNER', 'ADMIN', 'COACH', 'ASSISTANT_COACH', 'PHYSICAL_TRAINER'])

const noteSchema = z.object({
  body: z.string().trim().min(1).max(2000),
  tag: z.enum(noteTags).default('OTHER'),
})

const teamNoteSelect = {
  id: true,
  body: true,
  tag: true,
  authorId: true,
  createdAt: true,
  updatedAt: true,
  author: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireCoach()
    const scope = getRequestedBusinessScope(request)
    const { teamId } = await context.params

    const team = await getAccessibleTeam(user.id, teamId, scope.businessSlug)
    if (!team) {
      return NextResponse.json({ success: false, error: 'Team not found' }, { status: 404 })
    }

    const notes = await prisma.teamNote.findMany({
      where: { teamId },
      select: teamNoteSelect,
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    return NextResponse.json({ success: true, notes })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    logger.error('Failed to fetch team notes', {}, error)
    return NextResponse.json({ success: false, error: 'Failed to fetch team notes' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireCoach()
    const scope = getRequestedBusinessScope(request)
    const { teamId } = await context.params

    const [team, membership] = await Promise.all([
      getAccessibleTeam(user.id, teamId, scope.businessSlug),
      getBusinessMembership(user.id, scope.businessSlug),
    ])

    if (!team) {
      return NextResponse.json({ success: false, error: 'Team not found' }, { status: 404 })
    }
    if (!membership || !noteWriterRoles.has(membership.role)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const parsed = noteSchema.safeParse(await request.json().catch(() => ({})))
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const note = await prisma.teamNote.create({
      data: {
        teamId,
        authorId: user.id,
        body: parsed.data.body,
        tag: parsed.data.tag,
      },
      select: teamNoteSelect,
    })

    return NextResponse.json({ success: true, note }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    logger.error('Failed to create team note', {}, error)
    return NextResponse.json({ success: false, error: 'Failed to create team note' }, { status: 500 })
  }
}

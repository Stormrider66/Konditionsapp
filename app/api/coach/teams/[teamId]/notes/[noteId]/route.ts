import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getRequestedBusinessScope, requireCoach } from '@/lib/auth-utils'
import { getAccessibleTeam, getBusinessMembership } from '@/lib/coach/team-access'
import { logger } from '@/lib/logger'
import { prisma } from '@/lib/prisma'

interface RouteContext {
  params: Promise<{ teamId: string; noteId: string }>
}

const noteTags = ['TRAINING', 'TEST', 'MATCH', 'ROSTER', 'OTHER'] as const
const noteAdminRoles = new Set(['OWNER', 'ADMIN', 'COACH'])

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

async function canManageNote({
  userId,
  teamId,
  noteId,
  businessSlug,
}: {
  userId: string
  teamId: string
  noteId: string
  businessSlug?: string
}) {
  const [team, membership, note] = await Promise.all([
    getAccessibleTeam(userId, teamId, businessSlug),
    getBusinessMembership(userId, businessSlug),
    prisma.teamNote.findFirst({
      where: { id: noteId, teamId },
      select: { id: true, authorId: true },
    }),
  ])

  if (!team || !note) return { allowed: false, status: 404 as const }
  if (note.authorId === userId || (membership && noteAdminRoles.has(membership.role))) {
    return { allowed: true, status: 200 as const }
  }

  return { allowed: false, status: 403 as const }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireCoach()
    const scope = getRequestedBusinessScope(request)
    const { teamId, noteId } = await context.params

    const permission = await canManageNote({
      userId: user.id,
      teamId,
      noteId,
      businessSlug: scope.businessSlug,
    })

    if (!permission.allowed) {
      return NextResponse.json(
        { success: false, error: permission.status === 404 ? 'Team note not found' : 'Forbidden' },
        { status: permission.status }
      )
    }

    const parsed = noteSchema.safeParse(await request.json().catch(() => ({})))
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const note = await prisma.teamNote.update({
      where: { id: noteId },
      data: {
        body: parsed.data.body,
        tag: parsed.data.tag,
      },
      select: teamNoteSelect,
    })

    return NextResponse.json({ success: true, note })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    logger.error('Failed to update team note', {}, error)
    return NextResponse.json({ success: false, error: 'Failed to update team note' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireCoach()
    const scope = getRequestedBusinessScope(request)
    const { teamId, noteId } = await context.params

    const permission = await canManageNote({
      userId: user.id,
      teamId,
      noteId,
      businessSlug: scope.businessSlug,
    })

    if (!permission.allowed) {
      return NextResponse.json(
        { success: false, error: permission.status === 404 ? 'Team note not found' : 'Forbidden' },
        { status: permission.status }
      )
    }

    await prisma.teamNote.delete({ where: { id: noteId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    logger.error('Failed to delete team note', {}, error)
    return NextResponse.json({ success: false, error: 'Failed to delete team note' }, { status: 500 })
  }
}

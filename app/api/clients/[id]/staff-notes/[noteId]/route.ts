import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { canAccessClient, getCurrentUser } from '@/lib/auth-utils'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'
import { logger } from '@/lib/logger'
import { prisma } from '@/lib/prisma'

interface RouteContext {
  params: Promise<{ id: string; noteId: string }>
}

const noteCategories = ['COACH', 'PHYSIO', 'TRAINING', 'PLAN', 'LOAD', 'OTHER'] as const

const updateNoteSchema = z.object({
  body: z.string().trim().min(1).max(3000).optional(),
  category: z.enum(noteCategories).optional(),
  isPinned: z.boolean().optional(),
  actionRequired: z.boolean().optional(),
  visibleToAthlete: z.boolean().optional(),
})

const staffNoteSelect = {
  id: true,
  clientId: true,
  teamId: true,
  authorId: true,
  body: true,
  category: true,
  isPinned: true,
  actionRequired: true,
  visibleToAthlete: true,
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

function t(locale: AppLocale, en: string, sv: string) {
  return locale === 'sv' ? sv : en
}

async function requireStaffAccess(request: NextRequest, clientId: string) {
  const user = await getCurrentUser()
  if (!user) {
    return { user: null, response: NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }) }
  }
  if (user.role === 'ATHLETE') {
    const locale = resolveRequestLocale(request, user.language)
    return {
      user: null,
      response: NextResponse.json({ success: false, error: t(locale, 'Staff access required', 'Personalbehörighet krävs') }, { status: 403 }),
    }
  }

  const allowed = await canAccessClient(user.id, clientId)
  if (!allowed) {
    const locale = resolveRequestLocale(request, user.language)
    return {
      user: null,
      response: NextResponse.json({ success: false, error: t(locale, 'Client not found or access denied', 'Klienten hittades inte eller åtkomst nekades') }, { status: 404 }),
    }
  }

  return { user, response: null }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  let locale: AppLocale = resolveRequestLocale(request)

  try {
    const { id: clientId, noteId } = await context.params
    const access = await requireStaffAccess(request, clientId)
    if (access.response) return access.response
    locale = resolveRequestLocale(request, access.user?.language)

    const existing = await prisma.playerStaffNote.findFirst({
      where: { id: noteId, clientId },
      select: { id: true },
    })
    if (!existing) {
      return NextResponse.json({ success: false, error: t(locale, 'Note not found', 'Anteckningen hittades inte') }, { status: 404 })
    }

    const parsed = updateNoteSchema.safeParse(await request.json().catch(() => ({})))
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: t(locale, 'Invalid input', 'Ogiltig inmatning'), details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const note = await prisma.$transaction(async (tx) => {
      if (parsed.data.isPinned === true) {
        await tx.playerStaffNote.updateMany({
          where: { clientId, isPinned: true, id: { not: noteId } },
          data: { isPinned: false },
        })
      }

      return tx.playerStaffNote.update({
        where: { id: noteId },
        data: parsed.data,
        select: staffNoteSelect,
      })
    })

    return NextResponse.json({ success: true, note })
  } catch (error) {
    logger.error('Failed to update player staff note', {}, error)
    return NextResponse.json({ success: false, error: t(locale, 'Failed to update note', 'Kunde inte uppdatera anteckningen') }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  let locale: AppLocale = resolveRequestLocale(request)

  try {
    const { id: clientId, noteId } = await context.params
    const access = await requireStaffAccess(request, clientId)
    if (access.response) return access.response
    locale = resolveRequestLocale(request, access.user?.language)

    const existing = await prisma.playerStaffNote.findFirst({
      where: { id: noteId, clientId },
      select: { id: true },
    })
    if (!existing) {
      return NextResponse.json({ success: false, error: t(locale, 'Note not found', 'Anteckningen hittades inte') }, { status: 404 })
    }

    await prisma.playerStaffNote.delete({ where: { id: noteId } })
    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Failed to delete player staff note', {}, error)
    return NextResponse.json({ success: false, error: t(locale, 'Failed to delete note', 'Kunde inte ta bort anteckningen') }, { status: 500 })
  }
}

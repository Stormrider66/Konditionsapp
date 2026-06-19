import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { canAccessClient, getCurrentUser } from '@/lib/auth-utils'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'
import { logger } from '@/lib/logger'
import { prisma } from '@/lib/prisma'

interface RouteContext {
  params: Promise<{ id: string }>
}

const noteCategories = ['COACH', 'PHYSIO', 'TRAINING', 'PLAN', 'LOAD', 'OTHER'] as const

const createNoteSchema = z.object({
  body: z.string().trim().min(1).max(3000),
  category: z.enum(noteCategories).default('OTHER'),
  isPinned: z.boolean().default(false),
  actionRequired: z.boolean().default(false),
  visibleToAthlete: z.boolean().default(false),
  teamId: z.string().trim().min(1).optional().nullable(),
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

export async function GET(request: NextRequest, context: RouteContext) {
  let locale: AppLocale = resolveRequestLocale(request)

  try {
    const { id: clientId } = await context.params
    const access = await requireStaffAccess(request, clientId)
    if (access.response) return access.response
    locale = resolveRequestLocale(request, access.user?.language)

    const limitParam = Number(new URL(request.url).searchParams.get('limit') ?? '20')
    const take = Number.isFinite(limitParam) ? Math.min(50, Math.max(1, Math.floor(limitParam))) : 20

    const notes = await prisma.playerStaffNote.findMany({
      where: { clientId },
      select: staffNoteSelect,
      orderBy: [
        { isPinned: 'desc' },
        { actionRequired: 'desc' },
        { createdAt: 'desc' },
      ],
      take,
    })

    return NextResponse.json({ success: true, notes })
  } catch (error) {
    logger.error('Failed to fetch player staff notes', {}, error)
    return NextResponse.json({ success: false, error: t(locale, 'Failed to fetch notes', 'Kunde inte hämta anteckningar') }, { status: 500 })
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  let locale: AppLocale = resolveRequestLocale(request)

  try {
    const { id: clientId } = await context.params
    const access = await requireStaffAccess(request, clientId)
    if (access.response) return access.response
    locale = resolveRequestLocale(request, access.user?.language)
    const user = access.user!

    const parsed = createNoteSchema.safeParse(await request.json().catch(() => ({})))
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: t(locale, 'Invalid input', 'Ogiltig inmatning'), details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { teamId: true },
    })
    const teamId = parsed.data.teamId && parsed.data.teamId === client?.teamId ? parsed.data.teamId : null

    const note = await prisma.$transaction(async (tx) => {
      if (parsed.data.isPinned) {
        await tx.playerStaffNote.updateMany({
          where: { clientId, isPinned: true },
          data: { isPinned: false },
        })
      }

      return tx.playerStaffNote.create({
        data: {
          clientId,
          teamId,
          authorId: user.id,
          body: parsed.data.body,
          category: parsed.data.category,
          isPinned: parsed.data.isPinned,
          actionRequired: parsed.data.actionRequired,
          visibleToAthlete: parsed.data.visibleToAthlete,
        },
        select: staffNoteSelect,
      })
    })

    return NextResponse.json({ success: true, note }, { status: 201 })
  } catch (error) {
    logger.error('Failed to create player staff note', {}, error)
    return NextResponse.json({ success: false, error: t(locale, 'Failed to create note', 'Kunde inte skapa anteckningen') }, { status: 500 })
  }
}

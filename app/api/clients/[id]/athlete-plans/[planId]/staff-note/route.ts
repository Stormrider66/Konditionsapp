import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { canAccessClient, getCurrentUser } from '@/lib/auth-utils'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'
import { logger } from '@/lib/logger'
import { prisma } from '@/lib/prisma'

interface RouteContext {
  params: Promise<{ id: string; planId: string }>
}

const updateStaffPlanNoteSchema = z.object({
  staffPlanNote: z.string().trim().max(4000).optional().nullable(),
  staffPlanNoteVisibleToAthlete: z.boolean().default(false),
})

const planSelect = {
  id: true,
  clientId: true,
  coachId: true,
  name: true,
  description: true,
  status: true,
  staffPlanNote: true,
  staffPlanNoteVisibleToAthlete: true,
  staffPlanNoteUpdatedAt: true,
  staffPlanNoteAuthorId: true,
  staffPlanNoteAuthor: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  startDate: true,
  endDate: true,
  createdAt: true,
  updatedAt: true,
  blocks: {
    orderBy: { order: 'asc' as const },
    select: {
      id: true,
      title: true,
      focus: true,
      description: true,
      order: true,
      startDate: true,
      endDate: true,
    },
  },
}

function t(locale: AppLocale, en: string, sv: string) {
  return locale === 'sv' ? sv : en
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  let locale: AppLocale = resolveRequestLocale(request)

  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    locale = resolveRequestLocale(request, user.language)
    if (user.role === 'ATHLETE') {
      return NextResponse.json({ success: false, error: t(locale, 'Staff access required', 'Personalbehörighet krävs') }, { status: 403 })
    }

    const { id: clientId, planId } = await context.params
    const allowed = await canAccessClient(user.id, clientId)
    if (!allowed) {
      return NextResponse.json({ success: false, error: t(locale, 'Client not found or access denied', 'Klienten hittades inte eller åtkomst nekades') }, { status: 404 })
    }

    const parsed = updateStaffPlanNoteSchema.safeParse(await request.json().catch(() => ({})))
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: t(locale, 'Invalid input', 'Ogiltig inmatning'), details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const existingPlan = await prisma.athletePlan.findFirst({
      where: { id: planId, clientId },
      select: { id: true },
    })
    if (!existingPlan) {
      return NextResponse.json({ success: false, error: t(locale, 'Plan not found', 'Planen hittades inte') }, { status: 404 })
    }

    const note = parsed.data.staffPlanNote?.trim() || null
    const plan = await prisma.athletePlan.update({
      where: { id: planId },
      data: {
        staffPlanNote: note,
        staffPlanNoteVisibleToAthlete: note ? parsed.data.staffPlanNoteVisibleToAthlete : false,
        staffPlanNoteUpdatedAt: note ? new Date() : null,
        staffPlanNoteAuthorId: note ? user.id : null,
      },
      select: planSelect,
    })

    return NextResponse.json({ success: true, data: plan })
  } catch (error) {
    logger.error('Failed to update athlete plan staff note', {}, error)
    return NextResponse.json({ success: false, error: t(locale, 'Failed to update plan note', 'Kunde inte uppdatera plananteckningen') }, { status: 500 })
  }
}

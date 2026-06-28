import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { canAccessClient, requireCoach } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import {
  blockPlanDescriptionWithActualWeeks,
  blockPlanNameWithActualWeeks,
  blockPlanTotalWeeks,
  hasOverlappingBlockPlanDates,
  normalizeBlockPlanDates,
} from '@/lib/block-plans/duration'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

function handlePlanApiError(error: unknown, locale: AppLocale) {
  if (error instanceof Error) {
    if (error.message === 'Unauthorized' || error.message === 'Not authenticated') {
      return NextResponse.json({ success: false, error: t(locale, 'Authentication required', 'Autentisering krävs') }, { status: 401 })
    }
    if (error.message === 'Forbidden' || error.message === 'Access denied') {
      return NextResponse.json({ success: false, error: t(locale, 'Forbidden', 'Förbjudet') }, { status: 403 })
    }
  }

  return NextResponse.json({ success: false, error: t(locale, 'Internal server error', 'Internt serverfel') }, { status: 500 })
}

const blockSchema = z.object({
  title: z.string().trim().min(1).max(120),
  focus: z.string().trim().max(160).optional().nullable(),
  description: z.string().trim().max(1200).optional().nullable(),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  order: z.number().int().min(1),
})

const updatePlanSchema = z.object({
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(2000).optional().nullable(),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  status: z.enum(['ACTIVE', 'DRAFT']).default('ACTIVE'),
  planType: z.enum(['SPECIAL_PROGRAM', 'INJURY_RECOVERY', 'RETURN_TO_PLAY', 'PERFORMANCE']).optional(),
  blocks: z.array(blockSchema).min(1).max(24),
})

function parseDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date
}

function planSelect() {
  return {
    id: true,
    clientId: true,
    coachId: true,
    name: true,
    description: true,
    status: true,
    planType: true,
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
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; planId: string }> }
) {
  let locale = resolveRequestLocale(request)

  try {
    const user = await requireCoach()
    locale = resolveRequestLocale(request, user.language)
    const { id: clientId, planId } = await params

    const hasAccess = await canAccessClient(user.id, clientId)
    if (!hasAccess) {
      return NextResponse.json({ success: false, error: t(locale, 'Client not found or access denied', 'Klienten hittades inte eller åtkomst nekades') }, { status: 404 })
    }

    const existingPlan = await prisma.athletePlan.findFirst({
      where: { id: planId, clientId },
      select: { id: true },
    })
    if (!existingPlan) {
      return NextResponse.json({ success: false, error: t(locale, 'Plan not found', 'Planen hittades inte') }, { status: 404 })
    }

    const parsed = updatePlanSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: t(locale, 'Validation failed', 'Valideringen misslyckades'), details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const startDate = parseDate(parsed.data.startDate)
    const endDate = parseDate(parsed.data.endDate)
    if (!startDate || !endDate || endDate < startDate) {
      return NextResponse.json({ success: false, error: t(locale, 'Invalid plan dates', 'Ogiltiga plandatum') }, { status: 400 })
    }

    const blocks = parsed.data.blocks.map((block) => {
      const blockStart = parseDate(block.startDate)
      const blockEnd = parseDate(block.endDate)
      if (!blockStart || !blockEnd || blockEnd < blockStart) {
        throw new Error('INVALID_BLOCK_DATES')
      }
      return {
        title: block.title,
        focus: block.focus || null,
        description: block.description || null,
        startDate: blockStart,
        endDate: blockEnd,
        order: block.order,
      }
    }).sort((a, b) => a.order - b.order)
    const finalBlocks = hasOverlappingBlockPlanDates(blocks) ? normalizeBlockPlanDates(blocks) : blocks
    const planStartDate = finalBlocks[0]?.startDate ?? startDate
    const planEndDate = finalBlocks[finalBlocks.length - 1]?.endDate ?? endDate
    const totalWeeks = blockPlanTotalWeeks(finalBlocks)

    const plan = await prisma.athletePlan.update({
      where: { id: planId },
      data: {
        name: blockPlanNameWithActualWeeks(parsed.data.name, totalWeeks),
        description: blockPlanDescriptionWithActualWeeks(parsed.data.description, finalBlocks) || null,
        status: parsed.data.status,
        ...(parsed.data.planType ? { planType: parsed.data.planType } : {}),
        startDate: planStartDate,
        endDate: planEndDate,
        blocks: {
          deleteMany: {},
          create: finalBlocks.map((block, index) => ({
            title: block.title,
            focus: block.focus,
            description: block.description,
            startDate: block.startDate,
            endDate: block.endDate,
            order: index + 1,
          })),
        },
      },
      select: planSelect(),
    })

    return NextResponse.json({ success: true, data: plan })
  } catch (error) {
    if (error instanceof Error && error.message === 'INVALID_BLOCK_DATES') {
      return NextResponse.json({ success: false, error: t(locale, 'Invalid block dates', 'Ogiltiga blockdatum') }, { status: 400 })
    }
    return handlePlanApiError(error, locale)
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { canAccessClient, canModifyProgramsAsPhysio, getCurrentUser, requireCoach } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import {
  blockPlanDescriptionWithActualWeeks,
  blockPlanNameWithActualWeeks,
  blockPlanTotalWeeks,
  hasOverlappingBlockPlanDates,
  normalizeBlockPlanDates,
} from '@/lib/block-plans/duration'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'
import { skipTeamWorkoutsForInjuryPlan } from '@/lib/coach/injury-plan-sync'
import { logger } from '@/lib/logger'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

function handlePlanApiError(error: unknown, locale: AppLocale) {
  if (error instanceof Error) {
    if (error.message === 'Unauthorized' || error.message === 'Not authenticated') {
      return NextResponse.json({ error: t(locale, 'Authentication required', 'Autentisering krävs') }, { status: 401 })
    }
    if (error.message === 'Forbidden' || error.message === 'Access denied') {
      return NextResponse.json({ error: t(locale, 'Forbidden', 'Förbjudet') }, { status: 403 })
    }
  }

  return NextResponse.json({ error: t(locale, 'Internal server error', 'Internt serverfel') }, { status: 500 })
}

const blockSchema = z.object({
  title: z.string().trim().min(1).max(120),
  focus: z.string().trim().max(160).optional().nullable(),
  description: z.string().trim().max(1200).optional().nullable(),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  order: z.number().int().min(1),
})

const createPlanSchema = z.object({
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let locale = resolveRequestLocale(request)

  try {
    const user = await requireCoach()
    locale = resolveRequestLocale(request, user.language)
    const { id: clientId } = await params

    const hasAccess = await canAccessClient(user.id, clientId)
    if (!hasAccess) {
      return NextResponse.json({ error: t(locale, 'Client not found or access denied', 'Klienten hittades inte eller åtkomst nekades') }, { status: 404 })
    }

    const activeOnly = new URL(request.url).searchParams.get('active') === 'true'
    const plans = await prisma.athletePlan.findMany({
      where: {
        clientId,
        ...(activeOnly ? { status: 'ACTIVE' } : {}),
      },
      select: planSelect(),
      orderBy: [
        { startDate: 'desc' },
        { createdAt: 'desc' },
      ],
    })

    return NextResponse.json({ success: true, data: plans })
  } catch (error) {
    return handlePlanApiError(error, locale)
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let locale = resolveRequestLocale(request)

  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: t(locale, 'Authentication required', 'Autentisering krävs') }, { status: 401 })
    }
    locale = resolveRequestLocale(request, user.language)
    const { id: clientId } = await params

    // Coaches with client access OR an assigned physio with program-modify rights
    // (so a physio can set a player on an injury-recovery plan).
    const canModify = await canModifyProgramsAsPhysio(user.id, clientId)
    if (!canModify) {
      return NextResponse.json({ error: t(locale, 'Client not found or access denied', 'Klienten hittades inte eller åtkomst nekades') }, { status: 404 })
    }

    const parsed = createPlanSchema.safeParse(await request.json())
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

    const plan = await prisma.athletePlan.create({
      data: {
        clientId,
        coachId: user.id,
        name: blockPlanNameWithActualWeeks(parsed.data.name, totalWeeks),
        description: blockPlanDescriptionWithActualWeeks(parsed.data.description, finalBlocks) || null,
        status: parsed.data.status,
        planType: parsed.data.planType ?? 'SPECIAL_PROGRAM',
        startDate: planStartDate,
        endDate: planEndDate,
        blocks: {
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

    // Injury-recovery plans: drop the player's team-broadcast workouts in the plan
    // window (marked skipped, reversible) so the plan and their sessions stay in sync.
    let teamWorkoutsSkipped = 0
    if ((parsed.data.planType ?? 'SPECIAL_PROGRAM') === 'INJURY_RECOVERY') {
      try {
        teamWorkoutsSkipped = await skipTeamWorkoutsForInjuryPlan({
          clientId,
          planStart: planStartDate,
          planEnd: planEndDate,
        })
      } catch (error) {
        logger.error('Failed to sync team workouts for injury plan', { clientId, planId: plan.id }, error)
      }
    }

    return NextResponse.json({ success: true, data: plan, teamWorkoutsSkipped }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'INVALID_BLOCK_DATES') {
      return NextResponse.json({ success: false, error: t(locale, 'Invalid block dates', 'Ogiltiga blockdatum') }, { status: 400 })
    }
    return handlePlanApiError(error, locale)
  }
}

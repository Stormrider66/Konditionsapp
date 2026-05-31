import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireCoach } from '@/lib/auth-utils'
import { getRequestedBusinessScope } from '@/lib/auth/current-user'
import { getAccessibleTeam } from '@/lib/coach/team-access'
import { prisma } from '@/lib/prisma'
import { handleApiError } from '@/lib/api/utils'
import {
  blockPlanDescriptionWithActualWeeks,
  blockPlanNameWithActualWeeks,
  blockPlanTotalWeeks,
  hasOverlappingBlockPlanDates,
  normalizeBlockPlanDates,
} from '@/lib/block-plans/duration'

interface RouteContext {
  params: Promise<{ teamId: string }>
}

type AppLocale = 'en' | 'sv'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
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
    teamId: true,
    coachId: true,
    name: true,
    description: true,
    status: true,
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

export async function GET(request: NextRequest, context: RouteContext) {
  let locale: AppLocale = 'en'

  try {
    const user = await requireCoach()
    locale = user.language === 'sv' ? 'sv' : 'en'
    const { teamId } = await context.params
    const scope = getRequestedBusinessScope(request)
    const team = await getAccessibleTeam(user.id, teamId, scope.businessSlug)

    if (!team) {
      return NextResponse.json({ success: false, error: t(locale, 'Team not found', 'Laget hittades inte') }, { status: 404 })
    }

    const activeOnly = new URL(request.url).searchParams.get('active') === 'true'
    const plans = await prisma.teamPlan.findMany({
      where: {
        teamId,
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
    if (error instanceof Error && ['Unauthorized', 'Not authenticated'].includes(error.message)) {
      return NextResponse.json({ success: false, error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    if (error instanceof Error && ['Forbidden', 'Access denied'].includes(error.message)) {
      return NextResponse.json({ success: false, error: t(locale, 'Forbidden', 'Saknar behörighet') }, { status: 403 })
    }
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  let locale: AppLocale = 'en'

  try {
    const user = await requireCoach()
    locale = user.language === 'sv' ? 'sv' : 'en'
    const { teamId } = await context.params
    const scope = getRequestedBusinessScope(request)
    const team = await getAccessibleTeam(user.id, teamId, scope.businessSlug)

    if (!team) {
      return NextResponse.json({ success: false, error: t(locale, 'Team not found', 'Laget hittades inte') }, { status: 404 })
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
        throw new Error('Invalid block dates')
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

    const plan = await prisma.teamPlan.create({
      data: {
        teamId,
        coachId: user.id,
        name: blockPlanNameWithActualWeeks(parsed.data.name, totalWeeks),
        description: blockPlanDescriptionWithActualWeeks(parsed.data.description, finalBlocks) || null,
        status: parsed.data.status,
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

    return NextResponse.json({ success: true, data: plan }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid block dates') {
      return NextResponse.json({ success: false, error: t(locale, 'Invalid block dates', 'Ogiltiga blockdatum') }, { status: 400 })
    }
    if (error instanceof Error && ['Unauthorized', 'Not authenticated'].includes(error.message)) {
      return NextResponse.json({ success: false, error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    if (error instanceof Error && ['Forbidden', 'Access denied'].includes(error.message)) {
      return NextResponse.json({ success: false, error: t(locale, 'Forbidden', 'Saknar behörighet') }, { status: 403 })
    }
    return handleApiError(error)
  }
}

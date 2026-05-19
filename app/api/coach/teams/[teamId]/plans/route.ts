import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireCoach } from '@/lib/auth-utils'
import { getRequestedBusinessScope } from '@/lib/auth/current-user'
import { getAccessibleTeam } from '@/lib/coach/team-access'
import { prisma } from '@/lib/prisma'
import { handleApiError } from '@/lib/api/utils'

interface RouteContext {
  params: Promise<{ teamId: string }>
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
  try {
    const user = await requireCoach()
    const { teamId } = await context.params
    const scope = getRequestedBusinessScope(request)
    const team = await getAccessibleTeam(user.id, teamId, scope.businessSlug)

    if (!team) {
      return NextResponse.json({ success: false, error: 'Team not found' }, { status: 404 })
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
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireCoach()
    const { teamId } = await context.params
    const scope = getRequestedBusinessScope(request)
    const team = await getAccessibleTeam(user.id, teamId, scope.businessSlug)

    if (!team) {
      return NextResponse.json({ success: false, error: 'Team not found' }, { status: 404 })
    }

    const parsed = createPlanSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const startDate = parseDate(parsed.data.startDate)
    const endDate = parseDate(parsed.data.endDate)
    if (!startDate || !endDate || endDate < startDate) {
      return NextResponse.json({ success: false, error: 'Invalid plan dates' }, { status: 400 })
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
    })

    const plan = await prisma.teamPlan.create({
      data: {
        teamId,
        coachId: user.id,
        name: parsed.data.name,
        description: parsed.data.description || null,
        status: parsed.data.status,
        startDate,
        endDate,
        blocks: {
          create: blocks,
        },
      },
      select: planSelect(),
    })

    return NextResponse.json({ success: true, data: plan }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid block dates') {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 })
    }
    return handleApiError(error)
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { canAccessClient, requireCoach } from '@/lib/auth-utils'
import { handleApiError } from '@/lib/api/utils'
import { prisma } from '@/lib/prisma'
import {
  blockPlanDescriptionWithActualWeeks,
  blockPlanNameWithActualWeeks,
  blockPlanTotalWeeks,
  hasOverlappingBlockPlanDates,
  normalizeBlockPlanDates,
} from '@/lib/block-plans/duration'

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
  try {
    const user = await requireCoach()
    const { id: clientId, planId } = await params

    const hasAccess = await canAccessClient(user.id, clientId)
    if (!hasAccess) {
      return NextResponse.json({ success: false, error: 'Client not found or access denied' }, { status: 404 })
    }

    const existingPlan = await prisma.athletePlan.findFirst({
      where: { id: planId, clientId },
      select: { id: true },
    })
    if (!existingPlan) {
      return NextResponse.json({ success: false, error: 'Plan not found' }, { status: 404 })
    }

    const parsed = updatePlanSchema.safeParse(await request.json())
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
    if (error instanceof Error && error.message === 'Invalid block dates') {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 })
    }
    return handleApiError(error)
  }
}

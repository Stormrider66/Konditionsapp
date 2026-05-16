import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { requireCoach } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { prisma } from '@/lib/prisma'
import { rateLimitJsonResponse } from '@/lib/api/rate-limit'
import { logger } from '@/lib/logger'

const blockTypeSchema = z.enum([
  'heading',
  'text',
  'checklist',
  'table',
  'insight',
  'actions',
  'metric-row',
  'risk-list',
  'trend-summary',
])

const canvasBlockSchema = z.object({
  id: z.string().optional(),
  type: blockTypeSchema,
  title: z.string().trim().max(120).optional(),
  content: z.string().trim().max(2000).optional(),
  items: z.array(z.string().trim().min(1).max(220)).max(20).optional(),
  columns: z.array(z.string().trim().min(1).max(80)).max(8).optional(),
  rows: z.array(z.array(z.string().trim().min(1).max(220)).max(8)).max(30).optional(),
  metrics: z.array(z.object({
    label: z.string().trim().min(1).max(80),
    value: z.string().trim().min(1).max(80),
    detail: z.string().trim().max(140).optional(),
    tone: z.enum(['neutral', 'positive', 'warning', 'danger']).optional(),
  })).max(8).optional(),
  risks: z.array(z.object({
    title: z.string().trim().min(1).max(120),
    description: z.string().trim().min(1).max(240),
    priority: z.enum(['low', 'medium', 'high']),
    meta: z.string().trim().max(140).optional(),
  })).max(10).optional(),
  trends: z.array(z.object({
    label: z.string().trim().min(1).max(100),
    value: z.string().trim().min(1).max(100),
    direction: z.enum(['up', 'down', 'flat']),
    detail: z.string().trim().max(180).optional(),
  })).max(10).optional(),
  tone: z.enum(['neutral', 'positive', 'warning']).optional(),
  source: z.enum(['manual', 'ai', 'template', 'analytics']).optional(),
})

const createCanvasSchema = z.object({
  businessSlug: z.string().min(1).max(80),
  title: z.string().trim().min(1).max(120),
  blocks: z.array(canvasBlockSchema).min(1).max(80),
})

function isNextRedirectError(error: unknown): boolean {
  return error instanceof Error && (
    error.message === 'NEXT_REDIRECT' ||
    'digest' in error && typeof error.digest === 'string' && error.digest.startsWith('NEXT_REDIRECT')
  )
}

function blockContentJson(block: z.infer<typeof canvasBlockSchema>): Prisma.InputJsonValue {
  const { id: _id, type: _type, source: _source, ...content } = block
  return JSON.parse(JSON.stringify(content)) as Prisma.InputJsonValue
}

function blockPayload(block: {
  id: string
  type: string
  source: string
  contentJson: Prisma.JsonValue
}) {
  const content = typeof block.contentJson === 'object' && block.contentJson !== null && !Array.isArray(block.contentJson)
    ? block.contentJson as Record<string, unknown>
    : {}

  return {
    id: block.id,
    type: block.type,
    source: block.source,
    ...content,
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireCoach()

    const rateLimited = await rateLimitJsonResponse('ai:canvas:list', user.id, {
      limit: 60,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    const { searchParams } = new URL(request.url)
    const businessSlug = searchParams.get('businessSlug')
    if (!businessSlug) {
      return NextResponse.json({ error: 'businessSlug is required' }, { status: 400 })
    }

    const membership = await validateBusinessMembership(user.id, businessSlug)
    if (!membership) {
      return NextResponse.json({ error: 'Business not found or access denied' }, { status: 404 })
    }

    const canvases = await prisma.aICanvas.findMany({
      where: {
        businessId: membership.businessId,
        ownerUserId: user.id,
        status: 'DRAFT',
      },
      select: {
        id: true,
        title: true,
        updatedAt: true,
        createdAt: true,
        _count: {
          select: { blocks: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 30,
    })

    return NextResponse.json({
      success: true,
      canvases: canvases.map((canvas) => ({
        id: canvas.id,
        title: canvas.title,
        updatedAt: canvas.updatedAt.toISOString(),
        createdAt: canvas.createdAt.toISOString(),
        blockCount: canvas._count.blocks,
      })),
    })
  } catch (error) {
    if (isNextRedirectError(error) || (error instanceof Error && error.message === 'Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    logger.error('List AI canvases failed', {}, error)
    return NextResponse.json({ error: 'Failed to list canvases' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireCoach()

    const rateLimited = await rateLimitJsonResponse('ai:canvas:create', user.id, {
      limit: 30,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    const parsed = createCanvasSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Ogiltig canvasdata.', details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const membership = await validateBusinessMembership(user.id, parsed.data.businessSlug)
    if (!membership) {
      return NextResponse.json({ error: 'Business not found or access denied' }, { status: 404 })
    }

    const canvas = await prisma.aICanvas.create({
      data: {
        businessId: membership.businessId,
        ownerUserId: user.id,
        title: parsed.data.title,
        scope: 'COACH',
        status: 'DRAFT',
        blocks: {
          create: parsed.data.blocks.map((block, index) => ({
            type: block.type,
            position: index,
            source: block.source ?? 'manual',
            contentJson: blockContentJson(block),
          })),
        },
      },
      include: {
        blocks: {
          orderBy: { position: 'asc' },
        },
      },
    })

    return NextResponse.json({
      success: true,
      canvas: {
        id: canvas.id,
        title: canvas.title,
        updatedAt: canvas.updatedAt.toISOString(),
        createdAt: canvas.createdAt.toISOString(),
        blocks: canvas.blocks.map(blockPayload),
      },
    })
  } catch (error) {
    if (isNextRedirectError(error) || (error instanceof Error && error.message === 'Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    logger.error('Create AI canvas failed', {}, error)
    return NextResponse.json({ error: 'Failed to save canvas' }, { status: 500 })
  }
}

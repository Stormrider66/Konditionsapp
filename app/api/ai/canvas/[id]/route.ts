import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { requireCoach } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { rateLimitJsonResponse } from '@/lib/api/rate-limit'
import { logger } from '@/lib/logger'

const canvasBlockSchema = z.object({
  id: z.string().optional(),
  type: z.enum(['heading', 'text', 'checklist', 'table', 'insight', 'actions', 'metric-row', 'risk-list', 'trend-summary']),
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

const updateCanvasSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  status: z.enum(['DRAFT', 'ARCHIVED']).optional(),
  blocks: z.array(canvasBlockSchema).min(1).max(80).optional(),
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

async function findOwnedCanvas(id: string, ownerUserId: string) {
  return prisma.aICanvas.findFirst({
    where: {
      id,
      ownerUserId,
    },
    include: {
      blocks: {
        orderBy: { position: 'asc' },
      },
    },
  })
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireCoach()

    const rateLimited = await rateLimitJsonResponse('ai:canvas:get', user.id, {
      limit: 80,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    const { id } = await params
    const canvas = await findOwnedCanvas(id, user.id)
    if (!canvas || canvas.status === 'ARCHIVED') {
      return NextResponse.json({ error: 'Canvas not found' }, { status: 404 })
    }

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

    logger.error('Get AI canvas failed', {}, error)
    return NextResponse.json({ error: 'Failed to load canvas' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireCoach()

    const rateLimited = await rateLimitJsonResponse('ai:canvas:update', user.id, {
      limit: 40,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    const { id } = await params
    const parsed = updateCanvasSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Ogiltig canvasdata.', details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const existing = await findOwnedCanvas(id, user.id)
    if (!existing) {
      return NextResponse.json({ error: 'Canvas not found' }, { status: 404 })
    }

    const canvas = await prisma.$transaction(async (tx) => {
      if (parsed.data.blocks) {
        await tx.aICanvasBlock.deleteMany({
          where: { canvasId: id },
        })
      }

      return tx.aICanvas.update({
        where: { id },
        data: {
          ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
          ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
          ...(parsed.data.blocks
            ? {
                blocks: {
                  create: parsed.data.blocks.map((block, index) => ({
                    type: block.type,
                    position: index,
                    source: block.source ?? 'manual',
                    contentJson: blockContentJson(block),
                  })),
                },
              }
            : {}),
        },
        include: {
          blocks: {
            orderBy: { position: 'asc' },
          },
        },
      })
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

    logger.error('Update AI canvas failed', {}, error)
    return NextResponse.json({ error: 'Failed to save canvas' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireCoach()

    const rateLimited = await rateLimitJsonResponse('ai:canvas:archive', user.id, {
      limit: 20,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    const { id } = await params
    const existing = await findOwnedCanvas(id, user.id)
    if (!existing) {
      return NextResponse.json({ error: 'Canvas not found' }, { status: 404 })
    }

    await prisma.aICanvas.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (isNextRedirectError(error) || (error instanceof Error && error.message === 'Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    logger.error('Archive AI canvas failed', {}, error)
    return NextResponse.json({ error: 'Failed to archive canvas' }, { status: 500 })
  }
}

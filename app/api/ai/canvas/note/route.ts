import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { rateLimitJsonResponse } from '@/lib/api/rate-limit'
import { canvasToMarkdown } from '@/lib/ai-canvas/markdown'
import { requireCoach } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { getCoachScopedIds } from '@/lib/coach/scoping'
import { logger } from '@/lib/logger'
import { prisma } from '@/lib/prisma'

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

const saveCanvasNoteSchema = z.object({
  businessSlug: z.string().trim().min(1).max(80),
  athleteId: z.string().uuid(),
  title: z.string().trim().min(1).max(120),
  blocks: z.array(canvasBlockSchema).min(1).max(80),
})

function isNextRedirectError(error: unknown): boolean {
  return error instanceof Error && (
    error.message === 'NEXT_REDIRECT' ||
    'digest' in error && typeof error.digest === 'string' && error.digest.startsWith('NEXT_REDIRECT')
  )
}

function buildCoachNote(title: string, blocks: z.infer<typeof canvasBlockSchema>[]): string {
  const timestamp = new Date().toLocaleString('sv-SE')
  const markdown = canvasToMarkdown(title, blocks, false).trim()
  return [`AI Canvas - ${title}`, `Sparad ${timestamp}`, '', markdown].join('\n')
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireCoach()

    const rateLimited = await rateLimitJsonResponse('ai:canvas:save-note', user.id, {
      limit: 20,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    const parsed = saveCanvasNoteSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Ogiltig anteckningsdata.', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const membership = await validateBusinessMembership(user.id, parsed.data.businessSlug)
    if (!membership) {
      return NextResponse.json({ error: 'Business not found or access denied' }, { status: 404 })
    }

    const coachIds = await getCoachScopedIds(user.id, membership.businessId, membership.role)
    const athlete = await prisma.client.findFirst({
      where: {
        id: parsed.data.athleteId,
        businessId: membership.businessId,
        userId: { in: coachIds },
      },
      select: {
        id: true,
        name: true,
        notes: true,
      },
    })

    if (!athlete) {
      return NextResponse.json({ error: 'Jag kunde inte hitta atleten i den här coachytan.' }, { status: 404 })
    }

    const note = buildCoachNote(parsed.data.title, parsed.data.blocks)
    const nextNotes = [athlete.notes?.trim(), note].filter(Boolean).join('\n\n---\n\n')

    await prisma.client.update({
      where: { id: athlete.id },
      data: { notes: nextNotes },
    })

    return NextResponse.json({
      success: true,
      athleteName: athlete.name,
    })
  } catch (error) {
    if (isNextRedirectError(error) || (error instanceof Error && error.message === 'Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    logger.error('Save AI canvas as athlete note failed', {}, error)
    return NextResponse.json({ error: 'Jag kunde inte spara canvasen som coachanteckning just nu.' }, { status: 500 })
  }
}

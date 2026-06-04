import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { rateLimitJsonResponse } from '@/lib/api/rate-limit'
import { canvasToMarkdown } from '@/lib/ai-canvas/markdown'
import { requireCoach } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { getCoachScopedIds } from '@/lib/coach/scoping'
import { logger } from '@/lib/logger'
import { prisma } from '@/lib/prisma'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

const canvasBlockSchema = z.object({
  id: z.string().optional(),
  type: z.enum(['heading', 'text', 'checklist', 'table', 'insight', 'actions', 'metric-row', 'risk-list', 'trend-summary', 'chart']),
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
  chartType: z.enum(['bar', 'line']).optional(),
  unit: z.string().trim().max(24).optional(),
  points: z.array(z.object({
    label: z.string().trim().min(1).max(40),
    value: z.number().finite(),
    detail: z.string().trim().max(120).optional(),
  })).max(12).optional(),
  tone: z.enum(['neutral', 'positive', 'warning']).optional(),
  source: z.enum(['manual', 'ai', 'template', 'analytics']).optional(),
})

const saveCanvasNoteSchema = z.object({
  businessSlug: z.string().trim().min(1).max(80),
  athleteId: z.string().uuid(),
  title: z.string().trim().min(1).max(120),
  blocks: z.array(canvasBlockSchema).min(1).max(80),
})

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

function isNextRedirectError(error: unknown): boolean {
  return error instanceof Error && (
    error.message === 'NEXT_REDIRECT' ||
    'digest' in error && typeof error.digest === 'string' && error.digest.startsWith('NEXT_REDIRECT')
  )
}

function buildCoachNote(title: string, blocks: z.infer<typeof canvasBlockSchema>[], locale: AppLocale): string {
  const timestamp = new Date().toLocaleString(locale === 'sv' ? 'sv-SE' : 'en-US')
  const savedLabel = locale === 'sv' ? 'Sparad' : 'Saved'
  const markdown = canvasToMarkdown(title, blocks, false, locale).trim()
  return [`AI Canvas - ${title}`, `${savedLabel} ${timestamp}`, '', markdown].join('\n')
}

export async function POST(request: NextRequest) {
  let locale: AppLocale = 'en'

  try {
    const user = await requireCoach()
    locale = resolveRequestLocale(request, user.language)

    const rateLimited = await rateLimitJsonResponse('ai:canvas:save-note', user.id, {
      limit: 20,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    const parsed = saveCanvasNoteSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: t(locale, 'Invalid note data.', 'Ogiltig anteckningsdata.'), details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const membership = await validateBusinessMembership(user.id, parsed.data.businessSlug)
    if (!membership) {
      return NextResponse.json(
        { error: t(locale, 'Business not found or access denied', 'Verksamheten hittades inte eller saknar behörighet') },
        { status: 404 }
      )
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
      return NextResponse.json({
        error: t(locale, 'I could not find the athlete in this coach workspace.', 'Jag kunde inte hitta atleten i den här coachytan.'),
      }, { status: 404 })
    }

    const note = buildCoachNote(parsed.data.title, parsed.data.blocks, locale)
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
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }

    logger.error('Save AI canvas as athlete note failed', {}, error)
    return NextResponse.json({
      error: t(locale, 'I could not save the canvas as a coach note right now.', 'Jag kunde inte spara canvasen som coachanteckning just nu.'),
    }, { status: 500 })
  }
}

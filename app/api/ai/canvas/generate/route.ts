import { NextRequest, NextResponse } from 'next/server'
import { generateObject } from 'ai'
import { z } from 'zod'
import { requireCoach } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { rateLimitJsonResponse } from '@/lib/api/rate-limit'
import { createModelInstance, generationTuning } from '@/lib/ai/create-model'
import { buildCanvasContextSummary } from '@/lib/ai-canvas/context-builder'
import { withAiContext } from '@/lib/ai/usage-logger'
import { getResolvedAiKeys } from '@/lib/user-api-keys'
import { resolveModel } from '@/types/ai-models'
import { logger } from '@/lib/logger'

const templateSchema = z.enum([
  'blank',
  'athlete-review',
  'weekly-briefing',
  'team-risk',
  'program-notes',
])

const requestSchema = z.object({
  businessSlug: z.string().min(1).max(80),
  prompt: z.string().trim().min(4).max(3000),
  templateId: templateSchema.default('blank'),
  contextSummary: z.string().trim().max(1200).optional(),
  contextSelection: z.object({
    scope: z.enum(['none', 'athlete', 'team']),
    athleteId: z.string().optional(),
    teamId: z.string().optional(),
    dateRange: z.enum(['last7', 'last30', 'last90', 'next30']),
    dataKeys: z.array(z.enum(['tests', 'sessions', 'programs', 'readiness', 'notes'])).max(5),
  }).optional(),
})

const canvasBlockSchema = z.object({
  type: z.enum(['heading', 'text', 'checklist', 'table', 'insight', 'actions']),
  title: z.string().trim().min(1).max(120).optional(),
  content: z.string().trim().max(1400).optional(),
  items: z.array(z.string().trim().min(1).max(180)).max(8).optional(),
  columns: z.array(z.string().trim().min(1).max(60)).max(5).optional(),
  rows: z.array(z.array(z.string().trim().min(1).max(180)).max(5)).max(8).optional(),
  tone: z.enum(['neutral', 'positive', 'warning']).optional(),
})

const canvasResponseSchema = z.object({
  title: z.string().trim().min(1).max(120),
  assistantMessage: z.string().trim().min(1).max(400),
  blocks: z.array(canvasBlockSchema).min(2).max(7),
})

const TEMPLATE_GUIDANCE: Record<z.infer<typeof templateSchema>, string> = {
  blank: 'Create the most useful canvas structure for the coach request.',
  'athlete-review': 'Create an athlete review with current state, interpretation, risks or data gaps, and next steps.',
  'weekly-briefing': 'Create a weekly coach briefing with priorities, follow-ups, and decisions.',
  'team-risk': 'Create a team risk scan with signals, likely causes, and safe follow-up actions.',
  'program-notes': 'Create program planning notes with goals, block structure, key sessions, and checkpoints.',
}

const SYSTEM_PROMPT = `You are AI Canvas inside an elite training platform.

Return structured Swedish coach-facing canvas blocks only. The blocks must help a coach produce work: reports, analytics summaries, planning notes, checklists, and follow-up actions.

Rules:
- Do not claim you used live athlete, team, test, readiness, or program data unless it is included in the prompt.
- If the selected canvas context says it includes live read-only data, you may use those facts. Otherwise treat it as preferences only.
- If data is missing, make that explicit in the content.
- Keep recommendations coach-assistive, practical, and non-medical.
- Do not say that you changed, saved, messaged, scheduled, or updated anything.
- Always include a short assistantMessage explaining what you created or why the request is limited.
- Prefer clear Swedish.`

function isNextRedirectError(error: unknown): boolean {
  return error instanceof Error && (
    error.message === 'NEXT_REDIRECT' ||
    'digest' in error && typeof error.digest === 'string' && error.digest.startsWith('NEXT_REDIRECT')
  )
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireCoach()

    const rateLimited = await rateLimitJsonResponse('ai:canvas:generate', user.id, {
      limit: 12,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    const parsed = requestSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Ogiltig canvasförfrågan.',
          details: parsed.error.flatten(),
        },
        { status: 400 },
      )
    }

    const { businessSlug, prompt, templateId, contextSummary, contextSelection } = parsed.data
    const membership = await validateBusinessMembership(user.id, businessSlug)
    if (!membership) {
      return NextResponse.json({ error: 'Business not found or access denied' }, { status: 404 })
    }

    const keys = await getResolvedAiKeys(user.id, { businessId: membership.businessId })
    const resolved = resolveModel(keys, 'balanced')
    if (!resolved) {
      return NextResponse.json(
        {
          error: 'Ingen AI-nyckel är konfigurerad ännu. Lägg till en AI-nyckel i inställningarna och försök igen.',
        },
        { status: 400 },
      )
    }

    const liveContextSummary = await buildCanvasContextSummary({
      userId: user.id,
      businessSlug,
      businessId: membership.businessId,
      role: membership.role,
      selection: contextSelection,
    })
    const resolvedContextSummary = liveContextSummary || contextSummary

    const model = createModelInstance(resolved)
    const result = await withAiContext(
      { userId: user.id, category: 'coach_ai_canvas_generation' },
      () => generateObject({
        model,
        schema: canvasResponseSchema,
        system: SYSTEM_PROMPT,
        prompt: [
          `Template: ${templateId}`,
          `Template guidance: ${TEMPLATE_GUIDANCE[templateId]}`,
          '',
          resolvedContextSummary ? `Selected canvas context:\n${resolvedContextSummary}\n` : '',
          liveContextSummary
            ? 'Important: this context includes live read-only platform data. Use the numbers carefully and say when data is missing.'
            : contextSummary
              ? 'Important: this context identifies what the coach selected. It does not include live metrics yet.'
              : '',
          '',
          'Coach request:',
          prompt,
          '',
          'Create blocks that are ready to render in the canvas.',
        ].join('\n'),
        ...generationTuning(resolved.modelId, { temperature: 0.2 }),
      }),
    )

    const validated = canvasResponseSchema.parse(result.object)

    return NextResponse.json({
      success: true,
      title: validated.title,
      assistantMessage: validated.assistantMessage,
      blocks: validated.blocks,
      model: {
        provider: resolved.provider,
        modelId: resolved.modelId,
        displayName: resolved.displayName,
      },
    })
  } catch (error) {
    if (isNextRedirectError(error) || (error instanceof Error && error.message === 'Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    logger.error('AI canvas generation failed', {}, error)

    return NextResponse.json(
      {
        error: 'Jag kunde inte skapa canvasblock just nu. Försök igen om en liten stund.',
      },
      { status: 500 },
    )
  }
}

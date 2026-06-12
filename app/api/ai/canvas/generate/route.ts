import { NextRequest, NextResponse } from 'next/server'
import { generateObject } from 'ai'
import { z } from 'zod'
import { requireCoach } from '@/lib/auth-utils'
import { requireCoachAiBudget } from '@/lib/ai/billing/coach-budget'
import { validateBusinessMembership } from '@/lib/business-context'
import { rateLimitJsonResponse } from '@/lib/api/rate-limit'
import { createModelInstance, generationTuning } from '@/lib/ai/create-model'
import { buildCanvasAnalyticsBlocks, buildCanvasContextSummary } from '@/lib/ai-canvas/context-builder'
import { canvasBlockSchema } from '@/lib/ai-canvas/block-schema'
import { withAiContext } from '@/lib/ai/usage-logger'
import { getResolvedAiKeys } from '@/lib/user-api-keys'
import { resolveModel } from '@/types/ai-models'
import { resolveCanvasSkillContext } from '@/lib/ai-canvas/skill-context'
import { canvasTemplateIdSchema, TEMPLATE_GUIDANCE } from '@/lib/ai-canvas/template-guidance'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'
import { logger } from '@/lib/logger'

const templateSchema = canvasTemplateIdSchema

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
  selectedSkillIds: z.array(z.string().uuid()).max(5).optional(),
})

const canvasResponseSchema = z.object({
  title: z.string().trim().min(1).max(120),
  assistantMessage: z.string().trim().min(1).max(400),
  blocks: z.array(canvasBlockSchema).min(2).max(7),
})

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

function buildSystemPrompt(locale: AppLocale): string {
  if (locale === 'sv') {
    return `You are AI Canvas inside an elite training platform.

Return structured Swedish coach-facing canvas blocks only. The blocks must help a coach produce work: reports, analytics summaries, planning notes, checklists, and follow-up actions.

Rules:
- Do not claim you used live athlete, team, test, readiness, or program data unless it is included in the prompt.
- If the selected canvas context says it includes live read-only data, you may use those facts. Otherwise treat it as preferences only.
- If data is missing, make that explicit in the content.
- Keep recommendations coach-assistive, practical, and non-medical.
- Do not say that you changed, saved, messaged, scheduled, or updated anything.
- Always include a short assistantMessage explaining what you created or why the request is limited.
- For report templates, create polished deliverable-style sections with clear headings, evidence, recommendations, and next steps.
- Use chart blocks only for simple numeric series. A chart block must include chartType, points with numeric value, and a short content summary. Do not invent numeric chart values.
- Prefer clear Swedish.`
  }

  return `You are AI Canvas inside an elite training platform.

Return structured English coach-facing canvas blocks only. The blocks must help a coach produce work: reports, analytics summaries, planning notes, checklists, and follow-up actions.

Rules:
- Do not claim you used live athlete, team, test, readiness, or program data unless it is included in the prompt.
- If the selected canvas context says it includes live read-only data, you may use those facts. Otherwise treat it as preferences only.
- If data is missing, make that explicit in the content.
- Keep recommendations coach-assistive, practical, and non-medical.
- Do not say that you changed, saved, messaged, scheduled, or updated anything.
- Always include a short assistantMessage explaining what you created or why the request is limited.
- For report templates, create polished deliverable-style sections with clear headings, evidence, recommendations, and next steps.
- Use chart blocks only for simple numeric series. A chart block must include chartType, points with numeric value, and a short content summary. Do not invent numeric chart values.
- Prefer clear English.`
}

function isNextRedirectError(error: unknown): boolean {
  return error instanceof Error && (
    error.message === 'NEXT_REDIRECT' ||
    'digest' in error && typeof error.digest === 'string' && error.digest.startsWith('NEXT_REDIRECT')
  )
}

export async function POST(request: NextRequest) {
  let locale: AppLocale = resolveRequestLocale(request)

  try {
    const user = await requireCoach()
    locale = resolveRequestLocale(request, user.language)

    const budgetDenied = await requireCoachAiBudget(user.id)
    if (budgetDenied) return budgetDenied

    const rateLimited = await rateLimitJsonResponse('ai:canvas:generate', user.id, {
      limit: 12,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    const parsed = requestSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: t(locale, 'Invalid canvas request.', 'Ogiltig canvasförfrågan.'),
          details: parsed.error.flatten(),
        },
        { status: 400 },
      )
    }

    const {
      businessSlug,
      prompt,
      templateId,
      contextSummary,
      contextSelection,
      selectedSkillIds = [],
    } = parsed.data
    const membership = await validateBusinessMembership(user.id, businessSlug)
    if (!membership) {
      return NextResponse.json(
        { error: t(locale, 'Business not found or access denied', 'Verksamheten hittades inte eller saknar behörighet') },
        { status: 404 }
      )
    }

    const keys = await getResolvedAiKeys(user.id, { businessId: membership.businessId })
    const resolved = resolveModel(keys, 'balanced')
    if (!resolved) {
      return NextResponse.json(
        {
          error: t(
            locale,
            'No AI key is configured yet. Add an AI key in settings and try again.',
            'Ingen AI-nyckel är konfigurerad ännu. Lägg till en AI-nyckel i inställningarna och försök igen.'
          ),
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
      locale,
    })
    const analyticsBlocks = await buildCanvasAnalyticsBlocks({
      userId: user.id,
      businessSlug,
      businessId: membership.businessId,
      role: membership.role,
      selection: contextSelection,
      locale,
    })
    const resolvedContextSummary = liveContextSummary || contextSummary
    const { skillContext, skillsUsed, missingSelectedSkillIds } = await resolveCanvasSkillContext({
      prompt,
      selectedSkillIds,
      embeddingKeys: {
        googleKey: keys.googleKey,
        openaiKey: keys.openaiKey,
      },
      locale,
    })

    const model = createModelInstance(resolved)
    const result = await withAiContext(
      { userId: user.id, category: 'coach_ai_canvas_generation' },
      () => generateObject({
        model,
        schema: canvasResponseSchema,
        system: buildSystemPrompt(locale),
        prompt: [
          `Template: ${templateId}`,
          `Template guidance: ${TEMPLATE_GUIDANCE[templateId]}`,
          '',
          resolvedContextSummary ? `${t(locale, 'Selected canvas context:', 'Vald canvaskontext:')}\n${resolvedContextSummary}\n` : '',
          liveContextSummary
            ? t(
                locale,
                'Important: this context includes live read-only platform data. Use the numbers carefully and say when data is missing.',
                'Viktigt: den här kontexten innehåller live-data från plattformen i skrivskyddat läge. Använd siffrorna varsamt och säg när data saknas.'
              )
            : contextSummary
              ? t(
                  locale,
                  'Important: this context identifies what the coach selected. It does not include live metrics yet.',
                  'Viktigt: den här kontexten beskriver vad coachen valde. Den innehåller ännu inga live-mätvärden.'
                )
              : '',
          skillContext ? `${t(locale, 'Relevant expert knowledge:', 'Relevant expertkunskap:')}\n${skillContext}\n` : '',
          skillContext
            ? t(
                locale,
                'Important: the expert knowledge is supporting reference material. Use it when relevant, but do not pretend it contains live athlete data.',
                'Viktigt: expertkunskapen är stödjande referensmaterial. Använd den när den är relevant, men påstå inte att den innehåller live-data om atleter.'
              )
            : '',
          '',
          t(locale, 'Coach request:', 'Coachens fråga:'),
          prompt,
          '',
          t(locale, 'Create blocks that are ready to render in the canvas.', 'Skapa block som är redo att renderas i canvasen.'),
        ].join('\n'),
        ...generationTuning(resolved.modelId, { temperature: 0.2 }),
      }),
    )

    const validated = canvasResponseSchema.parse(result.object)
    const blocks = [
      ...analyticsBlocks,
      ...validated.blocks,
    ].slice(0, 10)
    const assistantMessageAdditions = [
      analyticsBlocks.length > 0
        ? t(locale, `I also added ${analyticsBlocks.length} data-driven analytics block${analyticsBlocks.length === 1 ? '' : 's'}.`, `Jag lade även till ${analyticsBlocks.length} datadrivna analysblock.`)
        : '',
      skillsUsed.length > 0
        ? t(locale, `I also used ${skillsUsed.length} relevant knowledge skill${skillsUsed.length === 1 ? '' : 's'}.`, `Jag använde även ${skillsUsed.length} relevanta kunskapsskill${skillsUsed.length === 1 ? '' : 's'}.`)
        : '',
      missingSelectedSkillIds.length > 0
        ? t(locale, `I could not use ${missingSelectedSkillIds.length} selected skill${missingSelectedSkillIds.length === 1 ? '' : 's'}.`, `Jag kunde inte använda ${missingSelectedSkillIds.length} vald${missingSelectedSkillIds.length === 1 ? '' : 'a'} skill${missingSelectedSkillIds.length === 1 ? '' : 's'}.`)
        : '',
    ].filter(Boolean)

    return NextResponse.json({
      success: true,
      title: validated.title,
      assistantMessage: [validated.assistantMessage, ...assistantMessageAdditions].join(' '),
      blocks,
      skillsUsed,
      missingSelectedSkillIds,
      model: {
        provider: resolved.provider,
        modelId: resolved.modelId,
        displayName: resolved.displayName,
      },
    })
  } catch (error) {
    if (isNextRedirectError(error) || (error instanceof Error && error.message === 'Unauthorized')) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }

    logger.error('AI canvas generation failed', {}, error)

    return NextResponse.json(
      {
        error: t(locale, 'I could not create canvas blocks right now. Try again in a moment.', 'Jag kunde inte skapa canvasblock just nu. Försök igen om en liten stund.'),
      },
      { status: 500 },
    )
  }
}

/**
 * AI Canvas Agent API
 *
 * POST /api/ai/canvas/agent — agentic canvas generation. Unlike the one-shot
 * /api/ai/canvas/generate endpoint, this runs a multi-step tool loop: the
 * model resolves athletes/teams itself, pulls the data it needs through
 * coach-scoped read tools, inserts deterministic analytics blocks, and writes
 * the document progressively via addCanvasBlocks. Streamed to the client as
 * a UI message stream; the client extracts blocks from tool-result parts.
 */

import { NextRequest } from 'next/server'
import { streamText, stepCountIs, type LanguageModel } from 'ai'
import { z } from 'zod'
import { requireCoach } from '@/lib/auth-utils'
import { requireCoachAiBudget } from '@/lib/ai/billing/coach-budget'
import { validateBusinessMembership } from '@/lib/business-context'
import { rateLimitJsonResponse } from '@/lib/api/rate-limit'
import { createModelInstance, generationTuning } from '@/lib/ai/create-model'
import { withAiContext } from '@/lib/ai/usage-logger'
import { getResolvedAiKeys } from '@/lib/user-api-keys'
import { resolveModel } from '@/types/ai-models'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'
import { createCanvasAgentTools } from '@/lib/ai-canvas/agent-tools'
import { resolveCanvasSkillContext } from '@/lib/ai-canvas/skill-context'
import { canvasTemplateIdSchema, TEMPLATE_GUIDANCE } from '@/lib/ai-canvas/template-guidance'
import { convertToCoreMessages, getMessageContent } from '@/lib/ai/chat/message-format'
import type { ChatRequestMessage } from '@/lib/ai/chat/types'
import { logger } from '@/lib/logger'

// Tool loop with several DB reads per step needs more headroom than plain chat.
export const maxDuration = 120

const MAX_AGENT_STEPS = 16

const messageSchema = z.object({
  id: z.string().optional(),
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().optional(),
  parts: z.array(z.object({ type: z.string(), text: z.string().optional() }).passthrough()).optional(),
})

const requestSchema = z.object({
  businessSlug: z.string().min(1).max(80),
  messages: z.array(messageSchema).min(1).max(40),
  templateId: canvasTemplateIdSchema.default('blank'),
  contextSelection: z.object({
    scope: z.enum(['none', 'athlete', 'team']),
    athleteId: z.string().optional(),
    teamId: z.string().optional(),
    dateRange: z.enum(['last7', 'last30', 'last90', 'next30']),
    dataKeys: z.array(z.enum(['tests', 'sessions', 'programs', 'readiness', 'notes'])).max(5),
  }).optional(),
  selectedSkillIds: z.array(z.string().uuid()).max(5).optional(),
  canvasSummary: z.string().trim().max(2000).optional(),
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

function jsonError(status: number, payload: Record<string, unknown>): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function buildScopeHint(selection: z.infer<typeof requestSchema>['contextSelection']): string {
  if (!selection || selection.scope === 'none') return ''
  const parts = [
    `scope=${selection.scope}`,
    selection.athleteId ? `athleteId=${selection.athleteId}` : null,
    selection.teamId ? `teamId=${selection.teamId}` : null,
    `dateRange=${selection.dateRange}`,
    selection.dataKeys.length > 0 ? `dataKeys=${selection.dataKeys.join(',')}` : null,
  ].filter(Boolean)
  return [
    '## COACH-SELECTED SCOPE',
    `The coach pre-selected this scope in the context picker: ${parts.join(', ')}.`,
    'Treat it as the default subject and window for data fetching and addAnalyticsBlocks, but follow the request if it clearly asks about something else.',
  ].join('\n')
}

function buildSystemPrompt({
  locale,
  templateGuidance,
  scopeHint,
  canvasSummary,
  skillContext,
}: {
  locale: AppLocale
  templateGuidance: string
  scopeHint: string
  canvasSummary?: string
  skillContext: string
}): string {
  return [
    `You are AI Canvas, an agentic work surface inside an elite training platform. A coach asks for a deliverable (report, analysis, plan, briefing) and you BUILD it as structured canvas blocks using tools.

## WORKFLOW
1. If the request names athletes or teams, resolve them with listAthletes/listTeams first — never guess ids.
2. Fetch the data the request needs (getTestData, getSessionData, getReadinessData, getProgramData, getCoachNotes). Fetch only what is relevant.
3. Call setCanvasTitle once, early, with a short specific title.
4. Build the document progressively with addCanvasBlocks — several calls of 1-5 blocks each, in reading order. Start with a heading block.
5. When live numbers should appear as metrics, charts, risk lists, or trends, call addAnalyticsBlocks — the platform computes those blocks deterministically from real data. Interpret them in your own text/insight blocks; do not retype their numbers into hand-made metric or chart blocks.
6. Finish with a short plain-text message to the coach (not a block): what you created, which data you used, and what was missing.

## RULES
- Every number in your blocks must come from a tool result in this conversation. If data is missing, say so in the content — never invent values, thresholds, dates, or names.
- Recommendations are coach-assistive and non-medical. Advise professional medical input when pain, illness, or red flags are involved.
- You only create canvas content. Do not claim you saved, sent, scheduled, or changed anything.
- If the request is not about the coach's athletes or data (general knowledge), you may write content blocks directly without data tools.
- On follow-up requests, extend or revise the document — do not repeat blocks that are already on the canvas.`,
    templateGuidance ? `## TEMPLATE GUIDANCE\n${templateGuidance}` : '',
    scopeHint,
    canvasSummary ? `## CURRENT CANVAS\nThe canvas already contains these blocks:\n${canvasSummary}` : '',
    skillContext ? `## EXPERT KNOWLEDGE\nSupporting reference material — use when relevant, but it contains no live athlete data:\n${skillContext}` : '',
    `## OUTPUT LANGUAGE\n${t(locale, 'Write all canvas content and messages in clear English.', 'Skriv allt canvasinnehåll och alla meddelanden på tydlig svenska.')}`,
  ].filter(Boolean).join('\n\n')
}

export async function POST(request: NextRequest) {
  let locale: AppLocale = resolveRequestLocale(request)

  try {
    const user = await requireCoach()
    locale = resolveRequestLocale(request, user.language)

    const budgetDenied = await requireCoachAiBudget(user.id)
    if (budgetDenied) return budgetDenied

    const rateLimited = await rateLimitJsonResponse('ai:canvas:agent', user.id, {
      limit: 8,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    const parsed = requestSchema.safeParse(await request.json())
    if (!parsed.success) {
      return jsonError(400, {
        error: t(locale, 'Invalid canvas request.', 'Ogiltig canvasförfrågan.'),
        details: parsed.error.flatten(),
      })
    }

    const { businessSlug, messages, templateId, contextSelection, selectedSkillIds = [], canvasSummary } = parsed.data
    const membership = await validateBusinessMembership(user.id, businessSlug)
    if (!membership) {
      return jsonError(404, {
        error: t(locale, 'Business not found or access denied', 'Verksamheten hittades inte eller saknar behörighet'),
      })
    }

    const keys = await getResolvedAiKeys(user.id, { businessId: membership.businessId })
    const resolved = resolveModel(keys, 'balanced')
    if (!resolved) {
      return jsonError(400, {
        error: t(
          locale,
          'No AI key is configured yet. Add an AI key in settings and try again.',
          'Ingen AI-nyckel är konfigurerad ännu. Lägg till en AI-nyckel i inställningarna och försök igen.'
        ),
      })
    }

    const aiUsageContext = {
      userId: user.id,
      clientId: null,
      category: 'coach_ai_canvas_agent',
      conversationId: null,
    }

    const latestUserMessage = [...messages].reverse().find((message) => message.role === 'user')
    const { skillContext, skillsUsed } = await withAiContext(aiUsageContext, () =>
      resolveCanvasSkillContext({
        prompt: latestUserMessage ? getMessageContent(latestUserMessage as ChatRequestMessage) : '',
        selectedSkillIds,
        embeddingKeys: {
          googleKey: keys.googleKey,
          openaiKey: keys.openaiKey,
        },
        locale,
      })
    )

    const tools = createCanvasAgentTools({
      userId: user.id,
      businessId: membership.businessId,
      businessSlug,
      role: membership.role,
      locale,
    })

    const model = createModelInstance(resolved)
    const result = await withAiContext(aiUsageContext, async () => streamText({
      model: model as LanguageModel,
      system: buildSystemPrompt({
        locale,
        templateGuidance: TEMPLATE_GUIDANCE[templateId],
        scopeHint: buildScopeHint(contextSelection),
        canvasSummary,
        skillContext,
      }),
      messages: convertToCoreMessages(messages as ChatRequestMessage[]),
      tools,
      stopWhen: stepCountIs(MAX_AGENT_STEPS),
      experimental_telemetry: { isEnabled: false },
      onError: (error) => {
        logger.error('Canvas agent stream error', {}, error)
      },
      ...generationTuning(resolved.modelId, { temperature: 0.3 }),
    }))

    return result.toUIMessageStreamResponse({
      messageMetadata: ({ part }) => {
        if (part.type === 'start') {
          return {
            model: {
              provider: resolved.provider,
              modelId: resolved.modelId,
              displayName: resolved.displayName,
            },
            skillsUsed,
          }
        }
        return undefined
      },
    })
  } catch (error) {
    if (isNextRedirectError(error) || (error instanceof Error && error.message === 'Unauthorized')) {
      return jsonError(401, { error: t(locale, 'Unauthorized', 'Obehörig') })
    }

    logger.error('Canvas agent request failed', {}, error)
    return jsonError(500, {
      error: t(
        locale,
        'I could not start the canvas agent right now. Try again in a moment.',
        'Jag kunde inte starta canvasagenten just nu. Försök igen om en liten stund.'
      ),
    })
  }
}

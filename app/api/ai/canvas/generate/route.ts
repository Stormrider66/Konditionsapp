import { NextRequest, NextResponse } from 'next/server'
import { generateObject } from 'ai'
import { z } from 'zod'
import { requireCoach } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { rateLimitJsonResponse } from '@/lib/api/rate-limit'
import { createModelInstance, generationTuning } from '@/lib/ai/create-model'
import { buildCanvasAnalyticsBlocks, buildCanvasContextSummary } from '@/lib/ai-canvas/context-builder'
import { withAiContext } from '@/lib/ai/usage-logger'
import { getResolvedAiKeys } from '@/lib/user-api-keys'
import { resolveModel } from '@/types/ai-models'
import { hasEmbeddingKeys } from '@/lib/ai/embeddings'
import {
  fetchSkillContext,
  hasExplicitKnowledgeSkillRequest,
  matchKnowledgeSkills,
  resolveKnowledgeSkillsByIds,
  resolveRequestedKnowledgeSkills,
} from '@/lib/ai/knowledge-skills'
import { logger } from '@/lib/logger'

const templateSchema = z.enum([
  'blank',
  'athlete-review',
  'weekly-briefing',
  'team-risk',
  'program-notes',
  'athlete-progress-report',
  'team-monthly-report',
  'program-audit',
  'test-interpretation-report',
  'return-to-training-plan',
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
  selectedSkillIds: z.array(z.string().uuid()).max(5).optional(),
})

const canvasBlockSchema = z.object({
  type: z.enum(['heading', 'text', 'checklist', 'table', 'insight', 'actions', 'metric-row', 'risk-list', 'trend-summary', 'chart']),
  title: z.string().trim().min(1).max(120).optional(),
  content: z.string().trim().max(1400).optional(),
  items: z.array(z.string().trim().min(1).max(180)).max(8).optional(),
  columns: z.array(z.string().trim().min(1).max(60)).max(5).optional(),
  rows: z.array(z.array(z.string().trim().min(1).max(180)).max(5)).max(8).optional(),
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
  'athlete-progress-report': [
    'Create a polished athlete progress report.',
    'Use a report structure: executive summary, evidence snapshot, development signals, risks/data gaps, recommendations, next steps.',
    'Write as a coach-facing deliverable that can later be exported or shared after coach review.',
  ].join(' '),
  'team-monthly-report': [
    'Create a polished team monthly report.',
    'Use a report structure: executive summary, team status, testing/data coverage, training completion/readiness signals, risks, next-month priorities.',
    'Keep it concise and decision-oriented for coaches or staff.',
  ].join(' '),
  'program-audit': [
    'Create a program audit.',
    'Use a report structure: program purpose, fit against current data, load/risk review, missing context, recommended changes, coach decisions.',
    'Do not rewrite the full program unless asked; focus on audit findings and actionable adjustments.',
  ].join(' '),
  'test-interpretation-report': [
    'Create a test interpretation report.',
    'Use a report structure: test overview, physiological interpretation, training implications, limitations/missing data, next testing/training decisions.',
    'Do not invent thresholds or values that are not in the context.',
  ].join(' '),
  'return-to-training-plan': [
    'Create a cautious return-to-training plan.',
    'Use a report structure: current status, constraints, phased progression, monitoring checkpoints, warning signs, coach actions.',
    'Stay non-medical and advise professional medical input when pain/illness/red flags are unclear.',
  ].join(' '),
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
- For report templates, create polished deliverable-style sections with clear headings, evidence, recommendations, and next steps.
- Use chart blocks only for simple numeric series. A chart block must include chartType, points with numeric value, and a short content summary. Do not invent numeric chart values.
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
    const analyticsBlocks = await buildCanvasAnalyticsBlocks({
      userId: user.id,
      businessSlug,
      businessId: membership.businessId,
      role: membership.role,
      selection: contextSelection,
    })
    const resolvedContextSummary = liveContextSummary || contextSummary
    const embeddingKeys = {
      googleKey: keys.googleKey,
      openaiKey: keys.openaiKey,
    }
    let skillContext = ''
    let skillsUsed: string[] = []
    let missingSelectedSkillIds: string[] = []
    if (hasEmbeddingKeys(embeddingKeys)) {
      try {
        const selectedSkills = selectedSkillIds.length > 0
          ? await resolveKnowledgeSkillsByIds(selectedSkillIds, { maxSkills: 5 })
          : { matched: [], missingIds: [] }
        missingSelectedSkillIds = selectedSkills.missingIds
        const requestedSkills = selectedSkills.matched.length === 0 && hasExplicitKnowledgeSkillRequest(prompt)
          ? await resolveRequestedKnowledgeSkills(prompt, { maxSkills: 5 })
          : []
        const matchedSkills = selectedSkills.matched.length > 0
          ? selectedSkills.matched
          : requestedSkills.length > 0
            ? requestedSkills
            : await matchKnowledgeSkills(prompt, embeddingKeys, { maxSkills: 3 })
        if (matchedSkills.length > 0) {
          const result = await fetchSkillContext(prompt, matchedSkills, embeddingKeys)
          const selectedIntro = selectedSkills.matched.length > 0
            ? `\n## SELECTED KNOWLEDGE SKILLS\n${selectedSkills.matched.map((skill) => `- ${skill.name}`).join('\n')}\n`
            : ''
          const requestedIntro = selectedSkills.matched.length === 0 && requestedSkills.length > 0
            ? `\n## REQUESTED KNOWLEDGE SKILLS\n${requestedSkills.map((skill) => `- ${skill.name}`).join('\n')}\n`
            : ''
          const missingIntro = missingSelectedSkillIds.length > 0
            ? `\n## SELECTED KNOWLEDGE SKILLS THAT COULD NOT BE USED\n${missingSelectedSkillIds.map((id) => `- ${id}`).join('\n')}\nMention this visibly if relevant.\n`
            : ''
          skillContext = `${selectedIntro}${requestedIntro}${missingIntro}${result.context}`
          skillsUsed = result.skillsUsed.length > 0
            ? result.skillsUsed
            : matchedSkills.map((skill) => skill.name)
        } else if (missingSelectedSkillIds.length > 0) {
          skillContext = `\n## SELECTED KNOWLEDGE SKILLS THAT COULD NOT BE USED\n${missingSelectedSkillIds.map((id) => `- ${id}`).join('\n')}\nMention this visibly.\n`
        }
      } catch (error) {
        logger.warn('AI canvas skill retrieval failed', {}, error)
      }
    }

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
          skillContext ? `Relevant expert knowledge:\n${skillContext}\n` : '',
          skillContext
            ? 'Important: the expert knowledge is supporting reference material. Use it when relevant, but do not pretend it contains live athlete data.'
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
    const blocks = [
      ...analyticsBlocks,
      ...validated.blocks,
    ].slice(0, 10)
    const assistantMessageAdditions = [
      analyticsBlocks.length > 0
        ? `Jag lade även till ${analyticsBlocks.length} datadrivna analysblock.`
        : '',
      skillsUsed.length > 0
        ? `Jag använde även ${skillsUsed.length} relevanta kunskapsskill${skillsUsed.length === 1 ? '' : 's'}.`
        : '',
      missingSelectedSkillIds.length > 0
        ? `Jag kunde inte använda ${missingSelectedSkillIds.length} vald${missingSelectedSkillIds.length === 1 ? '' : 'a'} skill${missingSelectedSkillIds.length === 1 ? '' : 's'}.`
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

// Types, starter templates, and pure helpers for the AI canvas.

import {
  BarChart3,
  ClipboardList,
  FileText,
  ListChecks,
  Plus,
  Sparkles,
} from 'lucide-react'

export type CanvasBlockType =
  | 'heading'
  | 'text'
  | 'checklist'
  | 'table'
  | 'insight'
  | 'actions'
  | 'metric-row'
  | 'risk-list'
  | 'trend-summary'
  | 'chart'

export type CanvasTemplateId = 'blank' | 'athlete-review' | 'weekly-briefing' | 'team-risk' | 'program-notes'
  | 'athlete-progress-report'
  | 'team-monthly-report'
  | 'program-audit'
  | 'test-interpretation-report'
  | 'return-to-training-plan'

export interface CanvasBlock {
  id: string
  type: CanvasBlockType
  title?: string
  content?: string
  items?: string[]
  columns?: string[]
  rows?: string[][]
  tone?: 'neutral' | 'positive' | 'warning'
  metrics?: Array<{
    label: string
    value: string
    detail?: string
    tone?: 'neutral' | 'positive' | 'warning' | 'danger'
  }>
  risks?: Array<{
    title: string
    description: string
    priority: 'low' | 'medium' | 'high'
    meta?: string
  }>
  trends?: Array<{
    label: string
    value: string
    direction: 'up' | 'down' | 'flat'
    detail?: string
  }>
  chartType?: 'bar' | 'line'
  unit?: string
  points?: Array<{
    label: string
    value: number
    detail?: string
  }>
  source?: 'manual' | 'ai' | 'template' | 'analytics'
}

export interface GenerateCanvasResponse {
  success?: boolean
  title?: string
  assistantMessage?: string
  blocks?: Omit<CanvasBlock, 'id'>[]
  skillsUsed?: string[]
  missingSelectedSkillIds?: string[]
  model?: {
    provider: string
    modelId: string
    displayName: string
  }
  error?: string
}

export interface SavedCanvasSummary {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  blockCount: number
}

export interface SavedCanvasPayload extends SavedCanvasSummary {
  blocks: CanvasBlock[]
}

export interface CanvasSaveResponse {
  success?: boolean
  canvas?: SavedCanvasPayload
  error?: string
}

export interface CanvasNoteResponse {
  success?: boolean
  athleteName?: string
  error?: string
}

export interface AthleteMessageDraft {
  athleteId: string
  athleteName: string
  content: string
  createdAt: string
  sentAt?: string
}

export interface CanvasTaskResponse {
  success?: boolean
  task?: {
    id: string
    title: string
  }
  error?: string
}

export interface CanvasSendMessageResponse {
  success?: boolean
  message?: string
  error?: string
  needsClarification?: boolean
}

export interface CanvasAthleteOption {
  id: string
  name: string
  teamId: string | null
  primarySport: string | null
}

export interface CanvasTeamOption {
  id: string
  name: string
  sportType: string | null
  athleteCount: number
}

export type CanvasContextDataKey = 'tests' | 'sessions' | 'programs' | 'readiness' | 'notes'

export interface CanvasContextSelection {
  scope: 'none' | 'athlete' | 'team'
  athleteId: string
  teamId: string
  dateRange: 'last7' | 'last30' | 'last90' | 'next30'
  dataKeys: CanvasContextDataKey[]
}

export interface CanvasTemplate {
  id: CanvasTemplateId
  name: string
  description: string
  prompt: string
  icon: typeof FileText
  group: 'workspace' | 'report'
}

export type AppLocale = 'en' | 'sv'

export const starterTemplatesByLocale: Record<AppLocale, CanvasTemplate[]> = {
  en: [
    {
      id: 'blank',
      name: 'Blank canvas',
      description: 'Start freely with your own question or idea.',
      prompt: '',
      icon: Plus,
      group: 'workspace',
    },
    {
      id: 'athlete-review',
      name: 'Athlete review',
      description: 'Create a clear status report for an athlete.',
      prompt: 'Create an athlete review with current status, key observations, risks, and next steps.',
      icon: FileText,
      group: 'workspace',
    },
    {
      id: 'weekly-briefing',
      name: 'Coach briefing',
      description: 'Summarize the week and what the coach should prioritize.',
      prompt: 'Create a weekly coach briefing with priorities, follow-ups, and decisions.',
      icon: ClipboardList,
      group: 'workspace',
    },
    {
      id: 'team-risk',
      name: 'Team risk scan',
      description: 'Identify follow-ups, testing needs, and risks.',
      prompt: 'Create a team risk scan with athletes to follow up, data gaps, and recommended actions.',
      icon: BarChart3,
      group: 'workspace',
    },
    {
      id: 'program-notes',
      name: 'Program plan',
      description: 'Build a workspace for program ideas and training blocks.',
      prompt: 'Create program planning notes for a four-week block with goals, key sessions, and checkpoints.',
      icon: ListChecks,
      group: 'workspace',
    },
    {
      id: 'athlete-progress-report',
      name: 'Athlete progress report',
      description: 'Polished report for athlete development, current status, and next decisions.',
      prompt:
        'Create a professional athlete progress report with executive summary, data-driven observations, development, risks, recommendations, and next steps.',
      icon: FileText,
      group: 'report',
    },
    {
      id: 'team-monthly-report',
      name: 'Team monthly report',
      description: 'Monthly report for team status, risks, trends, and priorities.',
      prompt:
        'Create a professional team monthly report with summary, team status, testing status, training completion, readiness, risks, and priorities for next month.',
      icon: BarChart3,
      group: 'report',
    },
    {
      id: 'program-audit',
      name: 'Program audit',
      description: 'Review a program or block and identify adjustments.',
      prompt:
        'Create a program audit with purpose, program status, load risks, missing data, suggested adjustments, and coach decisions.',
      icon: ClipboardList,
      group: 'report',
    },
    {
      id: 'test-interpretation-report',
      name: 'Test interpretation',
      description: 'Interpret test data and translate it into practical training decisions.',
      prompt:
        'Create a test interpretation report with test overview, key physiological signals, training implications, data gaps, and recommended next steps.',
      icon: Sparkles,
      group: 'report',
    },
    {
      id: 'return-to-training-plan',
      name: 'Return-to-training plan',
      description: 'Structured plan for a cautious return to training.',
      prompt:
        'Create a return-to-training plan with current status, limitations, progression, checkpoints, warning signs, and clear coach actions. Keep it cautious and non-medical.',
      icon: ListChecks,
      group: 'report',
    },
  ],
  sv: [
    {
      id: 'blank',
      name: 'Tom canvas',
      description: 'Börja fritt med en egen fråga eller idé.',
      prompt: '',
      icon: Plus,
      group: 'workspace',
    },
    {
      id: 'athlete-review',
      name: 'Athlete review',
      description: 'Skapa en tydlig statusrapport för en atlet.',
      prompt: 'Skapa en athlete review med nuläge, viktigaste observationer, risker och nästa steg.',
      icon: FileText,
      group: 'workspace',
    },
    {
      id: 'weekly-briefing',
      name: 'Coach briefing',
      description: 'Sammanfatta veckan och vad coachen bör prioritera.',
      prompt: 'Skapa en weekly coach briefing med prioriteringar, uppföljningar och beslut.',
      icon: ClipboardList,
      group: 'workspace',
    },
    {
      id: 'team-risk',
      name: 'Team risk scan',
      description: 'Identifiera uppföljningar, testbehov och risker.',
      prompt: 'Skapa en team risk scan med atleter att följa upp, dataluckor och rekommenderade åtgärder.',
      icon: BarChart3,
      group: 'workspace',
    },
    {
      id: 'program-notes',
      name: 'Programplan',
      description: 'Bygg en arbetsyta för programidéer och träningsblock.',
      prompt: 'Skapa program planning notes för ett fyra veckors block med mål, nyckelpass och kontrollpunkter.',
      icon: ListChecks,
      group: 'workspace',
    },
    {
      id: 'athlete-progress-report',
      name: 'Athlete progress report',
      description: 'Polerad rapport för atletens utveckling, nuläge och nästa beslut.',
      prompt:
        'Skapa en professionell athlete progress report med executive summary, datadrivna observationer, utveckling, risker, rekommendationer och nästa steg.',
      icon: FileText,
      group: 'report',
    },
    {
      id: 'team-monthly-report',
      name: 'Team monthly report',
      description: 'Månadsrapport för lagstatus, risker, trender och prioriteringar.',
      prompt:
        'Skapa en professionell team monthly report med sammanfattning, lagstatus, testläge, träningsgenomförande, readiness, risker och prioriteringar för nästa månad.',
      icon: BarChart3,
      group: 'report',
    },
    {
      id: 'program-audit',
      name: 'Program audit',
      description: 'Granska ett program eller block och hitta justeringar.',
      prompt:
        'Skapa en program audit med syfte, programstatus, belastningsrisker, saknad data, föreslagna justeringar och coachbeslut.',
      icon: ClipboardList,
      group: 'report',
    },
    {
      id: 'test-interpretation-report',
      name: 'Test interpretation',
      description: 'Tolka testdata och översätt den till praktiska träningsbeslut.',
      prompt:
        'Skapa en test interpretation report med testöversikt, viktigaste fysiologiska signaler, träningsimplikationer, dataluckor och rekommenderade nästa steg.',
      icon: Sparkles,
      group: 'report',
    },
    {
      id: 'return-to-training-plan',
      name: 'Return-to-training plan',
      description: 'Strukturerad plan för försiktig återgång till träning.',
      prompt:
        'Skapa en return-to-training plan med nuläge, begränsningar, progression, kontrollpunkter, varningssignaler och tydliga coachåtgärder. Var försiktig och icke-medicinsk.',
      icon: ListChecks,
      group: 'report',
    },
  ],
}

export function getInitialBlocks(locale: AppLocale): CanvasBlock[] {
  if (locale === 'sv') {
    return [
      {
        id: 'welcome-heading',
        type: 'heading',
        title: 'AI Canvas',
        content: 'En arbetsyta för rapporter, analyser, planer och coachbeslut.',
        source: 'template',
      },
      {
        id: 'welcome-insight',
        type: 'insight',
        title: 'Första versionen',
        content:
          'Den här versionen fokuserar på känslan i arbetsytan: mallar, prompt, block och tydliga svar. Nästa steg blir att koppla in riktig atlet- och teamdata.',
        tone: 'positive',
        source: 'template',
      },
      {
        id: 'welcome-actions',
        type: 'actions',
        title: 'Bra första tester',
        items: [
          'Skapa en athlete review för en atlet',
          'Bygg en weekly coach briefing',
          'Sammanfatta risker inför kommande vecka',
        ],
        source: 'template',
      },
    ]
  }

  return [
    {
      id: 'welcome-heading',
      type: 'heading',
      title: 'AI Canvas',
      content: 'A workspace for reports, analyses, plans, and coach decisions.',
      source: 'template',
    },
    {
      id: 'welcome-insight',
      type: 'insight',
      title: 'First version',
      content:
        'This version focuses on the workspace feel: templates, prompts, blocks, and clear responses. Next step is connecting real athlete and team data.',
      tone: 'positive',
      source: 'template',
    },
    {
      id: 'welcome-actions',
      type: 'actions',
      title: 'Good first tests',
      items: [
        'Create an athlete review for an athlete',
        'Build a weekly coach briefing',
        'Summarize risks for the coming week',
      ],
      source: 'template',
    },
  ]
}

export function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function getAssistantMessage(prompt: string, blockCount: number, locale: AppLocale): string {
  if (!prompt.trim()) {
    return locale === 'sv'
      ? 'Jag behöver en fråga eller mall för att skapa nya block. Välj gärna en mall eller skriv vad du vill bygga.'
      : 'I need a question or template to create new blocks. Choose a template or write what you want to build.'
  }

  return locale === 'sv'
    ? `Jag skapade ${blockCount} canvasblock som ett första arbetsutkast.`
    : `I created ${blockCount} canvas blocks as a first working draft.`
}

export function cleanDraftText(value: string): string {
  return value
    .replace(/\*\*/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function truncateSentence(value: string, maxLength = 170): string {
  const clean = cleanDraftText(value)
  if (clean.length <= maxLength) return clean
  return `${clean.slice(0, maxLength - 1).trim()}...`
}

export function buildAthleteMessageDraft(athleteName: string, canvasTitle: string, blocks: CanvasBlock[], locale: AppLocale): string {
  const insights: string[] = []
  const nextSteps: string[] = []

  for (const block of blocks) {
    if ((block.type === 'insight' || block.type === 'text') && block.content) {
      insights.push(truncateSentence(block.content))
    }

    if (block.type === 'metric-row') {
      for (const metric of block.metrics || []) {
        insights.push(`${metric.label}: ${metric.value}${metric.detail ? ` (${metric.detail})` : ''}`)
      }
    }

    if (block.type === 'risk-list') {
      for (const risk of block.risks || []) {
        if (risk.priority === 'high' || risk.priority === 'medium') {
          insights.push(
            locale === 'sv'
              ? `Vi följer upp ${risk.title.toLowerCase()}: ${truncateSentence(risk.description, 120)}`
              : `We are following up on ${risk.title.toLowerCase()}: ${truncateSentence(risk.description, 120)}`
          )
        }
      }
    }

    if (block.type === 'actions' || block.type === 'checklist') {
      nextSteps.push(...(block.items || []).map((item) => truncateSentence(item, 120)))
    }
  }

  const uniqueInsights = Array.from(new Set(insights.filter(Boolean))).slice(0, 3)
  const uniqueNextSteps = Array.from(new Set(nextSteps.filter(Boolean))).slice(0, 3)
  const titleLine = canvasTitle.trim() && canvasTitle !== 'Untitled coach canvas'
    ? locale === 'sv'
      ? `Jag har gått igenom ${canvasTitle.trim().toLowerCase()}`
      : `I have reviewed ${canvasTitle.trim().toLowerCase()}`
    : locale === 'sv'
      ? 'Jag har gått igenom din senaste status'
      : 'I have reviewed your latest status'
  const messageLines = locale === 'sv'
    ? [
        `Hej ${athleteName.split(' ')[0]}!`,
        '',
        `${titleLine} och ville dela en kort sammanfattning.`,
        '',
        ...(uniqueInsights.length > 0 ? ['Viktigast just nu:', ...uniqueInsights.map((item) => `- ${item}`), ''] : []),
        ...(uniqueNextSteps.length > 0
          ? ['Nästa steg:', ...uniqueNextSteps.map((item) => `- ${item}`), '']
          : ['Nästa steg är att vi stämmer av hur kroppen svarar och justerar planen vid behov.', '']),
        'Svara gärna om något känns oklart eller om dagsformen har ändrats.',
      ]
    : [
        `Hi ${athleteName.split(' ')[0]}!`,
        '',
        `${titleLine} and wanted to share a short summary.`,
        '',
        ...(uniqueInsights.length > 0 ? ['Most important right now:', ...uniqueInsights.map((item) => `- ${item}`), ''] : []),
        ...(uniqueNextSteps.length > 0
          ? ['Next steps:', ...uniqueNextSteps.map((item) => `- ${item}`), '']
          : ['Next step is checking how your body responds and adjusting the plan if needed.', '']),
        'Reply if anything feels unclear or if your daily status has changed.',
      ]

  return messageLines.join('\n').slice(0, 1000)
}

export function buildFollowUpTaskTitle(
  title: string,
  locale: AppLocale,
  subject?: { type: 'athlete' | 'team'; name: string }
): string {
  const prefix = subject
    ? locale === 'sv'
      ? `Följ upp ${subject.name}`
      : `Follow up ${subject.name}`
    : locale === 'sv' ? 'Följ upp AI Canvas' : 'Follow up AI Canvas'

  if (!title.trim() || title === 'Untitled coach canvas') return prefix
  return `${prefix}: ${title.trim()}`.slice(0, 160)
}

export function buildFollowUpTaskDescription(
  title: string,
  blocks: CanvasBlock[],
  locale: AppLocale,
  subject?: { type: 'athlete' | 'team'; name: string }
): string {
  const actionItems = blocks
    .filter((block) => block.type === 'actions' || block.type === 'checklist')
    .flatMap((block) => block.items || [])
    .slice(0, 6)
  const riskItems = blocks
    .filter((block) => block.type === 'risk-list')
    .flatMap((block) => block.risks || [])
    .filter((risk) => risk.priority === 'high' || risk.priority === 'medium')
    .slice(0, 4)
  const lines = [
    locale === 'sv'
      ? `Skapad från AI Canvas: ${title.trim() || 'Untitled coach canvas'}`
      : `Created from AI Canvas: ${title.trim() || 'Untitled coach canvas'}`,
    subject ? `${locale === 'sv' ? 'Kontext' : 'Context'}: ${subject.name}` : null,
    actionItems.length > 0 ? `${locale === 'sv' ? 'Nästa steg' : 'Next steps'}:\n${actionItems.map((item) => `- ${item}`).join('\n')}` : null,
    riskItems.length > 0
      ? `${locale === 'sv' ? 'Risker att följa upp' : 'Risks to follow up'}:\n${riskItems.map((risk) => `- ${risk.title}: ${risk.description}`).join('\n')}`
      : null,
  ].filter(Boolean)

  return lines.join('\n\n').slice(0, 1200)
}

export function buildProgramDraftPrompt(title: string, blocks: CanvasBlock[], locale: AppLocale): string {
  const actionItems = blocks
    .filter((block) => block.type === 'actions' || block.type === 'checklist')
    .flatMap((block) => block.items || [])
    .slice(0, 5)
  const insights = blocks
    .filter((block) => block.content)
    .map((block) => `${block.title || block.type}: ${truncateSentence(block.content || '', 140)}`)
    .slice(0, 5)
  const risks = blocks
    .flatMap((block) => block.risks || [])
    .map((risk) => `${risk.title}: ${risk.description}`)
    .slice(0, 4)

  return locale === 'sv'
    ? [
        `Skapa ett träningsprogramutkast baserat på AI Canvas: ${title}`,
        insights.length > 0 ? `Insikter:\n${insights.map((item) => `- ${item}`).join('\n')}` : null,
        risks.length > 0 ? `Risker att respektera:\n${risks.map((item) => `- ${item}`).join('\n')}` : null,
        actionItems.length > 0 ? `Önskade åtgärder:\n${actionItems.map((item) => `- ${item}`).join('\n')}` : null,
        'Gör utkastet coachgranskningsbart och säkert. Skapa inget automatiskt utan coachens godkännande.',
      ].filter(Boolean).join('\n\n').slice(0, 1200)
    : [
        `Create a training program draft based on AI Canvas: ${title}`,
        insights.length > 0 ? `Insights:\n${insights.map((item) => `- ${item}`).join('\n')}` : null,
        risks.length > 0 ? `Risks to respect:\n${risks.map((item) => `- ${item}`).join('\n')}` : null,
        actionItems.length > 0 ? `Requested actions:\n${actionItems.map((item) => `- ${item}`).join('\n')}` : null,
        'Make the draft coach-reviewable and safe. Do not create anything automatically without coach approval.',
      ].filter(Boolean).join('\n\n').slice(0, 1200)
}

export function looksLikeTestAction(value: string): boolean {
  return /test|retest|lt1|lt2|laktat|vo2|threshold|tröskel|fält/i.test(value)
}

export function describeCanvasBlock(block: CanvasBlock, locale: AppLocale): string {
  const parts = [
    `${locale === 'sv' ? 'Typ' : 'Type'}: ${block.type}`,
    block.title ? `${locale === 'sv' ? 'Titel' : 'Title'}: ${block.title}` : null,
    block.content ? `${locale === 'sv' ? 'Innehåll' : 'Content'}: ${block.content}` : null,
    block.items?.length ? `${locale === 'sv' ? 'Punkter' : 'Items'}: ${block.items.join('; ')}` : null,
    block.metrics?.length
      ? `${locale === 'sv' ? 'Mätvärden' : 'Metrics'}: ${block.metrics.map((metric) => `${metric.label} ${metric.value}`).join('; ')}`
      : null,
    block.risks?.length
      ? `${locale === 'sv' ? 'Risker' : 'Risks'}: ${block.risks.map((risk) => `${risk.title} (${risk.priority}): ${risk.description}`).join('; ')}`
      : null,
    block.trends?.length
      ? `${locale === 'sv' ? 'Trender' : 'Trends'}: ${block.trends.map((trend) => `${trend.label}: ${trend.value}`).join('; ')}`
      : null,
    block.points?.length
      ? `${locale === 'sv' ? 'Diagram' : 'Chart'}: ${block.points.map((point) => `${point.label} ${point.value}`).join('; ')}`
      : null,
    block.columns?.length ? `${locale === 'sv' ? 'Kolumner' : 'Columns'}: ${block.columns.join(', ')}` : null,
  ].filter(Boolean)

  return parts.join('\n').slice(0, 3000)
}

/**
 * Compact inventory of the current canvas for the agent's system prompt,
 * so follow-up requests extend the document instead of repeating it.
 */
export function buildCanvasBlocksSummary(blocks: CanvasBlock[]): string {
  return blocks
    .filter((block) => block.source !== 'template')
    .map((block) => `- [${block.type}] ${block.title || cleanDraftText(block.content || '').slice(0, 60)}`.trimEnd())
    .join('\n')
    .slice(0, 2000)
}

export function getCanvasModelLabel(
  model: GenerateCanvasResponse['model'] | undefined,
  skillsUsed: string[] | undefined,
  fallback: string | null,
): string | null {
  if (!model?.displayName) return fallback
  return skillsUsed?.length
    ? `${model.displayName} | ${skillsUsed.length} skills`
    : model.displayName
}

export interface AICanvasClientProps {
  businessSlug: string
  initialCanvases: SavedCanvasSummary[]
  athletes: CanvasAthleteOption[]
  teams: CanvasTeamOption[]
  coachTier: 'FREE' | 'BASIC' | 'PRO' | 'ENTERPRISE'
  subscriptionStatus: 'ACTIVE' | 'CANCELLED' | 'EXPIRED' | 'TRIAL'
}

export type ActionStatus = 'success' | 'warning' | 'error' | 'info'

export interface CanvasActionReceipt {
  id: string
  status: ActionStatus
  title: string
  detail: string
  createdAt: string
}

export interface CanvasSnapshot {
  id: string
  label: string
  title: string
  blocks: CanvasBlock[]
  createdAt: string
}

export const contextDataOptionsByLocale: Record<AppLocale, Array<{ key: CanvasContextDataKey; label: string }>> = {
  en: [
    { key: 'tests', label: 'Tests' },
    { key: 'sessions', label: 'Training sessions' },
    { key: 'programs', label: 'Programs' },
    { key: 'readiness', label: 'Readiness' },
    { key: 'notes', label: 'Notes' },
  ],
  sv: [
    { key: 'tests', label: 'Tester' },
    { key: 'sessions', label: 'Träningspass' },
    { key: 'programs', label: 'Program' },
    { key: 'readiness', label: 'Readiness' },
    { key: 'notes', label: 'Anteckningar' },
  ],
}

export const dateRangeLabelsByLocale: Record<AppLocale, Record<CanvasContextSelection['dateRange'], string>> = {
  en: {
    last7: 'Last 7 days',
    last30: 'Last 30 days',
    last90: 'Last 90 days',
    next30: 'Next 30 days',
  },
  sv: {
    last7: 'Senaste 7 dagarna',
    last30: 'Senaste 30 dagarna',
    last90: 'Senaste 90 dagarna',
    next30: 'Kommande 30 dagarna',
  },
}

export function buildContextSummary(
  selection: CanvasContextSelection,
  locale: AppLocale,
  athlete?: CanvasAthleteOption,
  team?: CanvasTeamOption
): string {
  if (selection.scope === 'none') return ''

  const subject =
    selection.scope === 'athlete'
      ? athlete
        ? `${locale === 'sv' ? 'Atlet' : 'Athlete'}: ${athlete.name}${athlete.primarySport ? ` (${athlete.primarySport})` : ''}`
        : locale === 'sv' ? 'Atlet: ingen atlet vald' : 'Athlete: no athlete selected'
      : team
        ? `${locale === 'sv' ? 'Lag' : 'Team'}: ${team.name}${team.sportType ? ` (${team.sportType})` : ''}, ${team.athleteCount} ${locale === 'sv' ? 'atleter' : 'athletes'}`
        : locale === 'sv' ? 'Lag: inget lag valt' : 'Team: no team selected'

  const contextDataOptions = contextDataOptionsByLocale[locale]
  const dataLabels = contextDataOptions
    .filter((option) => selection.dataKeys.includes(option.key))
    .map((option) => option.label)

  return [
    subject,
    `${locale === 'sv' ? 'Period' : 'Period'}: ${dateRangeLabelsByLocale[locale][selection.dateRange]}`,
    locale === 'sv'
      ? `Valda dataområden: ${dataLabels.length > 0 ? dataLabels.join(', ') : 'inga'}`
      : `Selected data areas: ${dataLabels.length > 0 ? dataLabels.join(', ') : 'none'}`,
    locale === 'sv'
      ? 'Live-data hämtas vid generering och används för datadrivna analysblock.'
      : 'Live data is fetched during generation and used for data-driven analysis blocks.',
  ].join('\n')
}

export function getCoachTierCanvasGuardrails(tier: AICanvasClientProps['coachTier'], locale: AppLocale) {
  if (locale === 'en') {
    const config = {
      FREE: {
        label: 'Free / trial',
        message: 'AI Canvas can be tested with light usage. Keep reports short and use export/notes for manual work.',
        calls: 'Low volume',
        level: 'warning' as const,
      },
      BASIC: {
        label: 'Basic',
        message: 'Fits individual athlete reports, notes, tasks, and message drafts. Keep team reports short.',
        calls: 'Normal volume',
        level: 'info' as const,
      },
      PRO: {
        label: 'Pro',
        message: 'Recommended level for team reports, block improvements, and multiple workflows per coach day.',
        calls: 'Higher volume',
        level: 'success' as const,
      },
      ENTERPRISE: {
        label: 'Enterprise',
        message: 'Full workflow for coach teams: team reports, multiple canvases, export, tasks, and follow-ups with broader usage.',
        calls: 'Extended volume',
        level: 'success' as const,
      },
    }

    return config[tier]
  }

  const config = {
    FREE: {
      label: 'Free / trial',
      message: 'AI Canvas kan testas med sparsam användning. Håll rapporter korta och använd export/anteckningar för manuellt arbete.',
      calls: 'Låg volym',
      level: 'warning' as const,
    },
    BASIC: {
      label: 'Basic',
      message: 'Passar för enskilda atletrapporter, anteckningar, uppgifter och meddelandeutkast. Teamrapporter bör hållas korta.',
      calls: 'Normal volym',
      level: 'info' as const,
    },
    PRO: {
      label: 'Pro',
      message: 'Rekommenderad nivå för teamrapporter, blockförbättringar och flera arbetsflöden per coachdag.',
      calls: 'Högre volym',
      level: 'success' as const,
    },
    ENTERPRISE: {
      label: 'Enterprise',
      message: 'Fullt arbetsflöde för coachteam: teamrapporter, flera canvases, export, uppgifter och uppföljningar med bredare användning.',
      calls: 'Utökad volym',
      level: 'success' as const,
    },
  }

  return config[tier]
}

export function createTeamPolishBlocks(team: CanvasTeamOption, locale: AppLocale): CanvasBlock[] {
  if (locale === 'en') {
    return [
      {
        id: createId('team-priority'),
        type: 'metric-row',
        title: 'Team overview',
        metrics: [
          {
            label: 'Team',
            value: team.name,
            detail: team.sportType ? `Sport: ${team.sportType}` : 'Sport missing',
            tone: 'neutral',
          },
          {
            label: 'Athletes',
            value: String(team.athleteCount),
            detail: team.athleteCount > 20 ? 'Use risk groups and batch follow-up.' : 'Suitable for quick individual review.',
            tone: team.athleteCount > 20 ? 'warning' : 'positive',
          },
        ],
        source: 'analytics',
      },
      {
        id: createId('team-actions'),
        type: 'actions',
        title: 'Team follow-up',
        items: [
          'Group athletes by testing needs, readiness, and latest completed sessions.',
          'Create a task for the 3 most important follow-ups before the next team brief.',
          'Book retests for athletes whose test data is older than the current training phase.',
        ],
        source: 'analytics',
      },
    ]
  }

  return [
    {
      id: createId('team-priority'),
      type: 'metric-row',
      title: 'Teamöversikt',
      metrics: [
        {
          label: 'Lag',
          value: team.name,
          detail: team.sportType ? `Sport: ${team.sportType}` : 'Sport saknas',
          tone: 'neutral',
        },
        {
          label: 'Atleter',
          value: String(team.athleteCount),
          detail: team.athleteCount > 20 ? 'Använd riskgrupper och batchuppföljning.' : 'Lämpligt för snabb individuell genomgång.',
          tone: team.athleteCount > 20 ? 'warning' : 'positive',
        },
      ],
      source: 'analytics',
    },
    {
      id: createId('team-actions'),
      type: 'actions',
      title: 'Teamuppföljning',
      items: [
        'Gruppera atleter efter testbehov, readiness och senaste genomförda pass.',
        'Skapa en uppgift för de 3 viktigaste uppföljningarna innan nästa teambrief.',
        'Boka retest för atleter där testdata är äldre än aktuell träningsfas.',
      ],
      source: 'analytics',
    },
  ]
}

export function nextWeekIsoDate(): string {
  const date = new Date()
  date.setDate(date.getDate() + 7)
  date.setHours(9, 0, 0, 0)
  return date.toISOString()
}

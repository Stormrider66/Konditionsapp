'use client'

import { useMemo, useState } from 'react'
import {
  AlertCircle,
  Archive,
  BarChart3,
  CalendarPlus,
  CheckCircle2,
  ClipboardList,
  Copy,
  Download,
  ExternalLink,
  FileText,
  FilePlus2,
  FolderOpen,
  Lightbulb,
  ListChecks,
  MessageSquareText,
  Plus,
  Printer,
  RotateCcw,
  Save,
  Send,
  ShieldCheck,
  Sparkles,
  Table2,
  TrendingDown,
  TrendingUp,
  Undo2,
  Wand2,
} from 'lucide-react'
import {
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { AISkillPicker } from '@/components/ai/AISkillPicker'
import { canvasToMarkdown, slugifyCanvasFilename } from '@/lib/ai-canvas/markdown'
import { cn } from '@/lib/utils'
import { useLocale } from '@/i18n/client'

type CanvasBlockType =
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

type CanvasTemplateId = 'blank' | 'athlete-review' | 'weekly-briefing' | 'team-risk' | 'program-notes'
  | 'athlete-progress-report'
  | 'team-monthly-report'
  | 'program-audit'
  | 'test-interpretation-report'
  | 'return-to-training-plan'

interface CanvasBlock {
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

interface GenerateCanvasResponse {
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

interface SavedCanvasSummary {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  blockCount: number
}

interface SavedCanvasPayload extends SavedCanvasSummary {
  blocks: CanvasBlock[]
}

interface CanvasSaveResponse {
  success?: boolean
  canvas?: SavedCanvasPayload
  error?: string
}

interface CanvasNoteResponse {
  success?: boolean
  athleteName?: string
  error?: string
}

interface AthleteMessageDraft {
  athleteId: string
  athleteName: string
  content: string
  createdAt: string
  sentAt?: string
}

interface CanvasTaskResponse {
  success?: boolean
  task?: {
    id: string
    title: string
  }
  error?: string
}

interface CanvasSendMessageResponse {
  success?: boolean
  message?: string
  error?: string
  needsClarification?: boolean
}

interface CanvasAthleteOption {
  id: string
  name: string
  teamId: string | null
  primarySport: string | null
}

interface CanvasTeamOption {
  id: string
  name: string
  sportType: string | null
  athleteCount: number
}

type CanvasContextDataKey = 'tests' | 'sessions' | 'programs' | 'readiness' | 'notes'

interface CanvasContextSelection {
  scope: 'none' | 'athlete' | 'team'
  athleteId: string
  teamId: string
  dateRange: 'last7' | 'last30' | 'last90' | 'next30'
  dataKeys: CanvasContextDataKey[]
}

interface CanvasTemplate {
  id: CanvasTemplateId
  name: string
  description: string
  prompt: string
  icon: typeof FileText
  group: 'workspace' | 'report'
}

type AppLocale = 'en' | 'sv'

const starterTemplatesByLocale: Record<AppLocale, CanvasTemplate[]> = {
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

function getInitialBlocks(locale: AppLocale): CanvasBlock[] {
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

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function getAssistantMessage(prompt: string, blockCount: number, locale: AppLocale): string {
  if (!prompt.trim()) {
    return locale === 'sv'
      ? 'Jag behöver en fråga eller mall för att skapa nya block. Välj gärna en mall eller skriv vad du vill bygga.'
      : 'I need a question or template to create new blocks. Choose a template or write what you want to build.'
  }

  return locale === 'sv'
    ? `Jag skapade ${blockCount} canvasblock som ett första arbetsutkast.`
    : `I created ${blockCount} canvas blocks as a first working draft.`
}

function cleanDraftText(value: string): string {
  return value
    .replace(/\*\*/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function truncateSentence(value: string, maxLength = 170): string {
  const clean = cleanDraftText(value)
  if (clean.length <= maxLength) return clean
  return `${clean.slice(0, maxLength - 1).trim()}...`
}

function buildAthleteMessageDraft(athleteName: string, canvasTitle: string, blocks: CanvasBlock[], locale: AppLocale): string {
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

function buildFollowUpTaskTitle(
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

function buildFollowUpTaskDescription(
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

function buildProgramDraftPrompt(title: string, blocks: CanvasBlock[], locale: AppLocale): string {
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

function looksLikeTestAction(value: string): boolean {
  return /test|retest|lt1|lt2|laktat|vo2|threshold|tröskel|fält/i.test(value)
}

function describeCanvasBlock(block: CanvasBlock, locale: AppLocale): string {
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

function getCanvasModelLabel(
  model: GenerateCanvasResponse['model'] | undefined,
  skillsUsed: string[] | undefined,
  fallback: string | null,
): string | null {
  if (!model?.displayName) return fallback
  return skillsUsed?.length
    ? `${model.displayName} | ${skillsUsed.length} skills`
    : model.displayName
}

interface AICanvasClientProps {
  businessSlug: string
  initialCanvases: SavedCanvasSummary[]
  athletes: CanvasAthleteOption[]
  teams: CanvasTeamOption[]
  coachTier: 'FREE' | 'BASIC' | 'PRO' | 'ENTERPRISE'
  subscriptionStatus: 'ACTIVE' | 'CANCELLED' | 'EXPIRED' | 'TRIAL'
}

type ActionStatus = 'success' | 'warning' | 'error' | 'info'

interface CanvasActionReceipt {
  id: string
  status: ActionStatus
  title: string
  detail: string
  createdAt: string
}

interface CanvasSnapshot {
  id: string
  label: string
  title: string
  blocks: CanvasBlock[]
  createdAt: string
}

const contextDataOptionsByLocale: Record<AppLocale, Array<{ key: CanvasContextDataKey; label: string }>> = {
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

const dateRangeLabelsByLocale: Record<AppLocale, Record<CanvasContextSelection['dateRange'], string>> = {
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

function buildContextSummary(
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

function getCoachTierCanvasGuardrails(tier: AICanvasClientProps['coachTier'], locale: AppLocale) {
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

function createTeamPolishBlocks(team: CanvasTeamOption, locale: AppLocale): CanvasBlock[] {
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

function nextWeekIsoDate(): string {
  const date = new Date()
  date.setDate(date.getDate() + 7)
  date.setHours(9, 0, 0, 0)
  return date.toISOString()
}

export function AICanvasClient({
  businessSlug,
  initialCanvases,
  athletes,
  teams,
  coachTier,
  subscriptionStatus,
}: AICanvasClientProps) {
  const locale = useLocale() === 'sv' ? 'sv' : 'en'
  const dateLocale = locale === 'sv' ? 'sv-SE' : 'en-US'
  const timeFormatOptions: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' }
  const starterTemplates = starterTemplatesByLocale[locale]
  const workspaceTemplates = starterTemplates.filter((template) => template.group === 'workspace')
  const reportTemplates = starterTemplates.filter((template) => template.group === 'report')
  const contextDataOptions = contextDataOptionsByLocale[locale]
  const dateRangeLabels = dateRangeLabelsByLocale[locale]
  const [canvasId, setCanvasId] = useState<string | null>(null)
  const [savedCanvases, setSavedCanvases] = useState<SavedCanvasSummary[]>(initialCanvases)
  const [title, setTitle] = useState('Untitled coach canvas')
  const [prompt, setPrompt] = useState('')
  const [selectedTemplateId, setSelectedTemplateId] = useState<CanvasTemplateId>('blank')
  const [blocks, setBlocks] = useState<CanvasBlock[]>(() => getInitialBlocks(locale))
  const [assistantMessage, setAssistantMessage] = useState(
    locale === 'sv'
      ? 'Canvasen är redo. Välj en mall eller skriv vad du vill skapa.'
      : 'The canvas is ready. Choose a template or write what you want to create.'
  )
  const [lastUpdated, setLastUpdated] = useState(locale === 'sv' ? 'Inte sparad än' : 'Not saved yet')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isSavingNote, setIsSavingNote] = useState(false)
  const [isCreatingTask, setIsCreatingTask] = useState(false)
  const [loadingCanvasId, setLoadingCanvasId] = useState<string | null>(null)
  const [modelLabel, setModelLabel] = useState<string | null>(null)
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([])
  const [canvasSkillsUsed, setCanvasSkillsUsed] = useState<string[]>([])
  const [isExporting, setIsExporting] = useState(false)
  const [athleteMessageDraft, setAthleteMessageDraft] = useState<AthleteMessageDraft | null>(null)
  const [regeneratingBlockId, setRegeneratingBlockId] = useState<string | null>(null)
  const [isSendingDraft, setIsSendingDraft] = useState(false)
  const [actionReceipts, setActionReceipts] = useState<CanvasActionReceipt[]>([])
  const [history, setHistory] = useState<CanvasSnapshot[]>([])
  const [contextSelection, setContextSelection] = useState<CanvasContextSelection>({
    scope: 'none',
    athleteId: '',
    teamId: '',
    dateRange: 'last30',
    dataKeys: ['tests', 'sessions', 'programs'],
  })

  const selectedTemplate = useMemo(
    () => starterTemplates.find((template) => template.id === selectedTemplateId) ?? starterTemplates[0],
    [selectedTemplateId, starterTemplates]
  )

  const selectedAthlete = athletes.find((athlete) => athlete.id === contextSelection.athleteId)
  const selectedTeam = teams.find((team) => team.id === contextSelection.teamId)
  const contextSummary = buildContextSummary(contextSelection, locale, selectedAthlete, selectedTeam)
  const tierGuardrails = getCoachTierCanvasGuardrails(coachTier, locale)

  const addActionReceipt = (status: ActionStatus, titleText: string, detail: string) => {
    const receipt: CanvasActionReceipt = {
      id: createId('receipt'),
      status,
      title: titleText,
      detail,
      createdAt: new Date().toLocaleTimeString(dateLocale, timeFormatOptions),
    }
    setActionReceipts((current) => [receipt, ...current].slice(0, 6))
    setAssistantMessage(detail)
  }

  const rememberSnapshot = (label: string) => {
    setHistory((current) => [
      {
        id: createId('snapshot'),
        label,
        title,
        blocks,
        createdAt: new Date().toLocaleTimeString(dateLocale, timeFormatOptions),
      },
      ...current,
    ].slice(0, 5))
  }

  const handleUndoLastCanvasChange = () => {
    const [latest, ...rest] = history
    if (!latest) {
      addActionReceipt(
        'warning',
        locale === 'sv' ? 'Ingen version att återställa' : 'No version to restore',
        locale === 'sv' ? 'Det finns ingen tidigare canvasversion att återställa ännu.' : 'There is no previous canvas version to restore yet.'
      )
      return
    }

    setTitle(latest.title)
    setBlocks(latest.blocks)
    setHistory(rest)
    setLastUpdated(new Date().toLocaleTimeString(dateLocale, timeFormatOptions))
    addActionReceipt(
      'success',
      locale === 'sv' ? 'Version återställd' : 'Version restored',
      locale === 'sv'
        ? `Jag återställde canvasen till versionen före "${latest.label}".`
        : `I restored the canvas to the version before "${latest.label}".`
    )
  }

  const handleSelectTemplate = (template: CanvasTemplate) => {
    setSelectedTemplateId(template.id)
    setPrompt(template.prompt)
    setAssistantMessage(
      template.id === 'blank'
        ? locale === 'sv'
          ? 'Tom canvas vald. Skriv vad du vill skapa så bygger jag ett första utkast.'
          : 'Blank canvas selected. Write what you want to create and I will build a first draft.'
        : locale === 'sv'
          ? `Mallen ${template.name} är vald. Du kan ändra prompten innan du skapar block.`
          : `The ${template.name} template is selected. You can edit the prompt before creating blocks.`
    )
  }

  const handleGenerate = async () => {
    const requestPrompt = (prompt || selectedTemplate.prompt).trim()
    if (!requestPrompt) {
      setAssistantMessage(getAssistantMessage('', 0, locale))
      return
    }

    setIsGenerating(true)
    setAssistantMessage(locale === 'sv' ? 'Jag skapar strukturerade canvasblock...' : 'I am creating structured canvas blocks...')
    rememberSnapshot(locale === 'sv' ? 'ny generering' : 'new generation')

    try {
      const response = await fetch('/api/ai/canvas/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessSlug,
          prompt: requestPrompt,
          templateId: selectedTemplate.id,
          contextSummary,
          contextSelection,
          selectedSkillIds,
        }),
      })

      const payload = (await response.json()) as GenerateCanvasResponse

      if (!response.ok || !payload.success || !payload.blocks) {
        addActionReceipt(
          'error',
          locale === 'sv' ? 'Canvas kunde inte skapas' : 'Canvas could not be created',
          payload.error || (locale === 'sv' ? 'Jag kunde inte skapa canvasblock just nu.' : 'I could not create canvas blocks right now.')
        )
        return
      }

      const generatedBlocks = payload.blocks.map((block) => ({
        id: createId(block.type),
        source: 'ai' as const,
        ...block,
      }))
      const nextBlocks = contextSelection.scope === 'team' && selectedTeam
        ? [...createTeamPolishBlocks(selectedTeam, locale), ...generatedBlocks].slice(0, 12)
        : generatedBlocks

      setBlocks(nextBlocks)
      setTitle(payload.title || title)
      addActionReceipt(
        'success',
        locale === 'sv' ? 'Canvas skapad' : 'Canvas created',
        payload.assistantMessage || getAssistantMessage(requestPrompt, nextBlocks.length, locale)
      )
      setModelLabel(getCanvasModelLabel(payload.model, payload.skillsUsed, null))
      setCanvasSkillsUsed(payload.skillsUsed || [])
      setLastUpdated(new Date().toLocaleTimeString(dateLocale, timeFormatOptions))
    } catch {
      addActionReceipt(
        'error',
        locale === 'sv' ? 'Canvas kunde inte skapas' : 'Canvas could not be created',
        locale === 'sv'
          ? 'Jag kunde inte nå AI Canvas just nu. Kontrollera anslutningen och försök igen.'
          : 'I could not reach AI Canvas right now. Check the connection and try again.'
      )
    } finally {
      setIsGenerating(false)
    }
  }

  const handleRegenerateBlock = async (block: CanvasBlock) => {
    setRegeneratingBlockId(block.id)
    setAssistantMessage(
      locale === 'sv'
        ? `Jag förbättrar blocket "${block.title || block.type}"...`
        : `I am improving the block "${block.title || block.type}"...`
    )
    rememberSnapshot(locale === 'sv' ? `förbättring av ${block.title || block.type}` : `improvement of ${block.title || block.type}`)

    try {
      const response = await fetch('/api/ai/canvas/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessSlug,
          prompt: [
            locale === 'sv' ? 'Förbättra endast detta canvasblock.' : 'Improve only this canvas block.',
            locale === 'sv'
              ? 'Behåll samma ungefärliga syfte, men gör det tydligare, mer användbart och mer coachvänligt.'
              : 'Keep roughly the same purpose, but make it clearer, more useful, and more coach-friendly.',
            locale === 'sv' ? 'Returnera ett enda block om möjligt.' : 'Return a single block if possible.',
            '',
            describeCanvasBlock(block, locale),
          ].join('\n'),
          templateId: selectedTemplate.id,
          contextSummary,
          contextSelection,
          selectedSkillIds,
        }),
      })
      const payload = (await response.json()) as GenerateCanvasResponse

      if (!response.ok || !payload.success || !payload.blocks?.length) {
        addActionReceipt(
          'error',
          locale === 'sv' ? 'Block kunde inte förbättras' : 'Block could not be improved',
          payload.error || (locale === 'sv' ? 'Jag kunde inte förbättra blocket just nu.' : 'I could not improve the block right now.')
        )
        return
      }

      const improvedBlock = {
        id: createId(payload.blocks[0].type),
        source: 'ai' as const,
        ...payload.blocks[0],
      }
      setBlocks((current) => current.map((item) => item.id === block.id ? improvedBlock : item))
      setModelLabel(getCanvasModelLabel(payload.model, payload.skillsUsed, modelLabel))
      setCanvasSkillsUsed(payload.skillsUsed || [])
      setLastUpdated(new Date().toLocaleTimeString(dateLocale, timeFormatOptions))
      addActionReceipt(
        'success',
        locale === 'sv' ? 'Block förbättrat' : 'Block improved',
        locale === 'sv'
          ? `Jag förbättrade blocket "${improvedBlock.title || block.title || block.type}".`
          : `I improved the block "${improvedBlock.title || block.title || block.type}".`
      )
    } catch {
      addActionReceipt(
        'error',
        locale === 'sv' ? 'Block kunde inte förbättras' : 'Block could not be improved',
        locale === 'sv'
          ? 'Jag kunde inte nå AI Canvas för att förbättra blocket just nu.'
          : 'I could not reach AI Canvas to improve the block right now.'
      )
    } finally {
      setRegeneratingBlockId(null)
    }
  }

  const handleReset = () => {
    rememberSnapshot(locale === 'sv' ? 'återställning' : 'reset')
    setCanvasId(null)
    setBlocks(getInitialBlocks(locale))
    setTitle('Untitled coach canvas')
    setPrompt('')
    setSelectedTemplateId('blank')
    setSelectedSkillIds([])
    setCanvasSkillsUsed([])
    addActionReceipt(
      'success',
      locale === 'sv' ? 'Canvas återställd' : 'Canvas reset',
      locale === 'sv' ? 'Jag återställde canvasen till startläget.' : 'I reset the canvas to its starting state.'
    )
    setLastUpdated(locale === 'sv' ? 'Återställd' : 'Reset')
    setModelLabel(null)
    setAthleteMessageDraft(null)
  }

  const updateContextDataKey = (key: CanvasContextDataKey, enabled: boolean) => {
    setContextSelection((current) => ({
      ...current,
      dataKeys: enabled
        ? Array.from(new Set([...current.dataKeys, key]))
        : current.dataKeys.filter((item) => item !== key),
    }))
  }

  const upsertSavedCanvas = (canvas: SavedCanvasPayload) => {
    setSavedCanvases((current) => {
      const nextSummary: SavedCanvasSummary = {
        id: canvas.id,
        title: canvas.title,
        createdAt: canvas.createdAt,
        updatedAt: canvas.updatedAt,
        blockCount: canvas.blocks.length,
      }
      const withoutCurrent = current.filter((item) => item.id !== canvas.id)
      return [nextSummary, ...withoutCurrent].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )
    })
  }

  const handleSave = async () => {
    setIsSaving(true)
    setAssistantMessage(locale === 'sv' ? 'Jag sparar canvasen...' : 'I am saving the canvas...')

    try {
      const response = await fetch(canvasId ? `/api/ai/canvas/${canvasId}` : '/api/ai/canvas', {
        method: canvasId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(canvasId ? {} : { businessSlug }),
          title,
          blocks,
        }),
      })
      const payload = (await response.json()) as CanvasSaveResponse

      if (!response.ok || !payload.success || !payload.canvas) {
        addActionReceipt(
          'error',
          locale === 'sv' ? 'Canvas kunde inte sparas' : 'Canvas could not be saved',
          payload.error || (locale === 'sv' ? 'Jag kunde inte spara canvasen just nu.' : 'I could not save the canvas right now.')
        )
        return
      }

      setCanvasId(payload.canvas.id)
      setTitle(payload.canvas.title)
      setBlocks(payload.canvas.blocks)
      setLastUpdated(new Date(payload.canvas.updatedAt).toLocaleTimeString(dateLocale, timeFormatOptions))
      upsertSavedCanvas(payload.canvas)
      addActionReceipt('success', locale === 'sv' ? 'Canvas sparad' : 'Canvas saved', locale === 'sv' ? 'Jag sparade canvasen.' : 'I saved the canvas.')
    } catch {
      addActionReceipt(
        'error',
        locale === 'sv' ? 'Canvas kunde inte sparas' : 'Canvas could not be saved',
        locale === 'sv' ? 'Jag kunde inte nå sparfunktionen just nu. Försök igen om en stund.' : 'I could not reach the save function right now. Try again in a moment.'
      )
    } finally {
      setIsSaving(false)
    }
  }

  const handleLoadCanvas = async (id: string) => {
    setLoadingCanvasId(id)
    setAssistantMessage(locale === 'sv' ? 'Jag laddar canvasen...' : 'I am loading the canvas...')

    try {
      const response = await fetch(`/api/ai/canvas/${id}`)
      const payload = (await response.json()) as CanvasSaveResponse

      if (!response.ok || !payload.success || !payload.canvas) {
        addActionReceipt(
          'error',
          locale === 'sv' ? 'Canvas kunde inte laddas' : 'Canvas could not be loaded',
          payload.error || (locale === 'sv' ? 'Jag kunde inte ladda canvasen.' : 'I could not load the canvas.')
        )
        return
      }

      setCanvasId(payload.canvas.id)
      setTitle(payload.canvas.title)
      setBlocks(payload.canvas.blocks)
      setLastUpdated(new Date(payload.canvas.updatedAt).toLocaleTimeString(dateLocale, timeFormatOptions))
      setModelLabel(null)
      setCanvasSkillsUsed([])
      upsertSavedCanvas(payload.canvas)
      addActionReceipt('success', locale === 'sv' ? 'Canvas laddad' : 'Canvas loaded', locale === 'sv' ? 'Jag laddade canvasen.' : 'I loaded the canvas.')
    } catch {
      addActionReceipt(
        'error',
        locale === 'sv' ? 'Canvas kunde inte laddas' : 'Canvas could not be loaded',
        locale === 'sv' ? 'Jag kunde inte nå sparade canvases just nu.' : 'I could not reach saved canvases right now.'
      )
    } finally {
      setLoadingCanvasId(null)
    }
  }

  const handleArchiveCurrent = async () => {
    if (!canvasId) {
      addActionReceipt(
        'warning',
        locale === 'sv' ? 'Inget att arkivera' : 'Nothing to archive',
        locale === 'sv' ? 'Det finns ingen sparad canvas att arkivera ännu.' : 'There is no saved canvas to archive yet.'
      )
      return
    }

    setIsSaving(true)
    setAssistantMessage(locale === 'sv' ? 'Jag arkiverar canvasen...' : 'I am archiving the canvas...')

    try {
      const response = await fetch(`/api/ai/canvas/${canvasId}`, {
        method: 'DELETE',
      })
      const payload = (await response.json()) as { success?: boolean; error?: string }

      if (!response.ok || !payload.success) {
        addActionReceipt(
          'error',
          locale === 'sv' ? 'Canvas kunde inte arkiveras' : 'Canvas could not be archived',
          payload.error || (locale === 'sv' ? 'Jag kunde inte arkivera canvasen.' : 'I could not archive the canvas.')
        )
        return
      }

      setSavedCanvases((current) => current.filter((canvas) => canvas.id !== canvasId))
      handleReset()
      addActionReceipt(
        'success',
        locale === 'sv' ? 'Canvas arkiverad' : 'Canvas archived',
        locale === 'sv' ? 'Jag arkiverade canvasen och öppnade en ny arbetsyta.' : 'I archived the canvas and opened a new workspace.'
      )
    } catch {
      addActionReceipt(
        'error',
        locale === 'sv' ? 'Canvas kunde inte arkiveras' : 'Canvas could not be archived',
        locale === 'sv' ? 'Jag kunde inte nå arkiveringen just nu.' : 'I could not reach archiving right now.'
      )
    } finally {
      setIsSaving(false)
    }
  }

  const handleCopyMarkdown = async () => {
    const markdown = canvasToMarkdown(title, blocks, true, locale)
    try {
      await navigator.clipboard.writeText(markdown)
      addActionReceipt('success', locale === 'sv' ? 'Canvas kopierad' : 'Canvas copied', locale === 'sv' ? 'Jag kopierade canvasen som text.' : 'I copied the canvas as text.')
    } catch {
      addActionReceipt(
        'error',
        locale === 'sv' ? 'Kopiering misslyckades' : 'Copy failed',
        locale === 'sv' ? 'Jag kunde inte kopiera automatiskt. Markera texten och kopiera manuellt.' : 'I could not copy automatically. Select the text and copy it manually.'
      )
    }
  }

  const handleDownloadMarkdown = () => {
    setIsExporting(true)
    try {
      const markdown = canvasToMarkdown(title, blocks, true, locale)
      const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `${slugifyCanvasFilename(title || 'ai-canvas')}.md`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
      addActionReceipt('success', locale === 'sv' ? 'Markdown exporterad' : 'Markdown exported', locale === 'sv' ? 'Jag exporterade canvasen som markdown.' : 'I exported the canvas as Markdown.')
    } finally {
      setIsExporting(false)
    }
  }

  const handlePrintPdf = () => {
    addActionReceipt(
      'info',
      locale === 'sv' ? 'PDF-export startad' : 'PDF export started',
      locale === 'sv' ? 'Jag öppnar utskrift. Välj Spara som PDF i dialogen.' : 'I am opening print. Choose Save as PDF in the dialog.'
    )
    window.setTimeout(() => window.print(), 50)
  }

  const handleSaveAthleteNote = async () => {
    if (contextSelection.scope !== 'athlete' || !selectedAthlete) {
      addActionReceipt(
        'warning',
        locale === 'sv' ? 'Atlet saknas' : 'Athlete missing',
        locale === 'sv' ? 'Välj en atlet i kontextpanelen först, så kan jag spara canvasen som en intern coachanteckning.' : 'Select an athlete in the context panel first, then I can save the canvas as an internal coach note.'
      )
      return
    }

    setIsSavingNote(true)
    setAssistantMessage(locale === 'sv' ? `Jag sparar canvasen som intern anteckning för ${selectedAthlete.name}...` : `I am saving the canvas as an internal note for ${selectedAthlete.name}...`)

    try {
      const response = await fetch('/api/ai/canvas/note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessSlug,
          athleteId: selectedAthlete.id,
          title,
          blocks,
        }),
      })
      const payload = (await response.json()) as CanvasNoteResponse

      if (!response.ok || !payload.success) {
        addActionReceipt(
          'error',
          locale === 'sv' ? 'Anteckning kunde inte sparas' : 'Note could not be saved',
          payload.error || (locale === 'sv' ? 'Jag kunde inte spara canvasen som coachanteckning.' : 'I could not save the canvas as a coach note.')
        )
        return
      }

      addActionReceipt(
        'success',
        locale === 'sv' ? 'Anteckning sparad' : 'Note saved',
        locale === 'sv'
          ? `Jag sparade canvasen som intern coachanteckning för ${payload.athleteName || selectedAthlete.name}.`
          : `I saved the canvas as an internal coach note for ${payload.athleteName || selectedAthlete.name}.`
      )
    } catch {
      addActionReceipt(
        'error',
        locale === 'sv' ? 'Anteckning kunde inte sparas' : 'Note could not be saved',
        locale === 'sv' ? 'Jag kunde inte nå anteckningsfunktionen just nu. Försök igen om en stund.' : 'I could not reach the note function right now. Try again in a moment.'
      )
    } finally {
      setIsSavingNote(false)
    }
  }

  const handlePrepareAthleteMessage = () => {
    if (contextSelection.scope !== 'athlete' || !selectedAthlete) {
      addActionReceipt(
        'warning',
        locale === 'sv' ? 'Atlet saknas' : 'Athlete missing',
        locale === 'sv' ? 'Välj en atlet i kontextpanelen först, så kan jag förbereda ett meddelande för granskning.' : 'Select an athlete in the context panel first, then I can prepare a message for review.'
      )
      return
    }

    const content = buildAthleteMessageDraft(selectedAthlete.name, title, blocks, locale)
    setAthleteMessageDraft({
      athleteId: selectedAthlete.id,
      athleteName: selectedAthlete.name,
      content,
      createdAt: new Date().toLocaleTimeString(dateLocale, timeFormatOptions),
    })
    addActionReceipt(
      'success',
      locale === 'sv' ? 'Meddelande förberett' : 'Message prepared',
      locale === 'sv' ? `Jag förberedde ett meddelande till ${selectedAthlete.name}. Inget har skickats.` : `I prepared a message for ${selectedAthlete.name}. Nothing has been sent.`
    )
  }

  const handleCopyAthleteMessage = async () => {
    if (!athleteMessageDraft) {
      addActionReceipt(
        'warning',
        locale === 'sv' ? 'Inget meddelandeutkast' : 'No message draft',
        locale === 'sv' ? 'Det finns inget förberett meddelande att kopiera ännu.' : 'There is no prepared message to copy yet.'
      )
      return
    }

    try {
      await navigator.clipboard.writeText(athleteMessageDraft.content)
      addActionReceipt(
        'success',
        locale === 'sv' ? 'Meddelande kopierat' : 'Message copied',
        locale === 'sv'
          ? `Jag kopierade meddelandet till ${athleteMessageDraft.athleteName}. Det är fortfarande inte skickat.`
          : `I copied the message for ${athleteMessageDraft.athleteName}. It still has not been sent.`
      )
    } catch {
      addActionReceipt(
        'error',
        locale === 'sv' ? 'Kopiering misslyckades' : 'Copy failed',
        locale === 'sv' ? 'Jag kunde inte kopiera meddelandet automatiskt. Markera texten och kopiera manuellt.' : 'I could not copy the message automatically. Select the text and copy it manually.'
      )
    }
  }

  const handleSendAthleteMessage = async () => {
    if (!athleteMessageDraft) {
      addActionReceipt('warning', locale === 'sv' ? 'Inget meddelandeutkast' : 'No message draft', locale === 'sv' ? 'Det finns inget meddelandeutkast att skicka ännu.' : 'There is no message draft to send yet.')
      return
    }

    if (athleteMessageDraft.sentAt) {
      addActionReceipt(
        'warning',
        locale === 'sv' ? 'Meddelande redan skickat' : 'Message already sent',
        locale === 'sv' ? `Meddelandet till ${athleteMessageDraft.athleteName} är redan skickat.` : `The message to ${athleteMessageDraft.athleteName} has already been sent.`
      )
      return
    }

    const confirmed = window.confirm(locale === 'sv' ? `Skicka meddelandet till ${athleteMessageDraft.athleteName}?` : `Send the message to ${athleteMessageDraft.athleteName}?`)
    if (!confirmed) {
      addActionReceipt(
        'info',
        locale === 'sv' ? 'Skick avbrutet' : 'Send cancelled',
        locale === 'sv' ? `Jag skickade inte meddelandet till ${athleteMessageDraft.athleteName}.` : `I did not send the message to ${athleteMessageDraft.athleteName}.`
      )
      return
    }

    setIsSendingDraft(true)
    setAssistantMessage(locale === 'sv' ? `Jag skickar meddelandet till ${athleteMessageDraft.athleteName}...` : `I am sending the message to ${athleteMessageDraft.athleteName}...`)

    try {
      const response = await fetch('/api/ai/chat/actions/coach-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionType: 'sendCoachMessage',
          businessSlug,
          draft: {
            recipientType: 'ATHLETE',
            clientId: athleteMessageDraft.athleteId,
            content: athleteMessageDraft.content,
            subject: title === 'Untitled coach canvas' ? undefined : title,
            teamTarget: 'ALL',
          },
        }),
      })
      const payload = (await response.json()) as CanvasSendMessageResponse

      if (!response.ok || !payload.success) {
        addActionReceipt(
          'error',
          locale === 'sv' ? 'Meddelande kunde inte skickas' : 'Message could not be sent',
          payload.error || (locale === 'sv' ? 'Jag kunde inte skicka meddelandet.' : 'I could not send the message.')
        )
        return
      }

      const sentAt = new Date().toLocaleTimeString(dateLocale, timeFormatOptions)
      setAthleteMessageDraft((current) => current ? { ...current, sentAt } : current)
      addActionReceipt(
        'success',
        locale === 'sv' ? 'Meddelande skickat' : 'Message sent',
        payload.message || (locale === 'sv' ? `Meddelandet skickades till ${athleteMessageDraft.athleteName}.` : `The message was sent to ${athleteMessageDraft.athleteName}.`)
      )
    } catch {
      addActionReceipt(
        'error',
        locale === 'sv' ? 'Meddelande kunde inte skickas' : 'Message could not be sent',
        locale === 'sv' ? 'Jag kunde inte nå meddelandefunktionen just nu. Försök igen om en stund.' : 'I could not reach the message function right now. Try again in a moment.'
      )
    } finally {
      setIsSendingDraft(false)
    }
  }

  const handleOpenContext = () => {
    if (contextSelection.scope === 'athlete' && selectedAthlete) {
      window.open(`/${businessSlug}/coach/clients/${selectedAthlete.id}`, '_blank', 'noopener,noreferrer')
      addActionReceipt(
        'success',
        locale === 'sv' ? 'Profil öppnad' : 'Profile opened',
        locale === 'sv' ? `Jag öppnade profilen för ${selectedAthlete.name} i en ny flik.` : `I opened the profile for ${selectedAthlete.name} in a new tab.`
      )
      return
    }

    if (contextSelection.scope === 'team' && selectedTeam) {
      window.open(`/${businessSlug}/coach/teams/${selectedTeam.id}`, '_blank', 'noopener,noreferrer')
      addActionReceipt(
        'success',
        locale === 'sv' ? 'Lag öppnat' : 'Team opened',
        locale === 'sv' ? `Jag öppnade lagsidan för ${selectedTeam.name} i en ny flik.` : `I opened the team page for ${selectedTeam.name} in a new tab.`
      )
      return
    }

    addActionReceipt(
      'warning',
      locale === 'sv' ? 'Kontext saknas' : 'Context missing',
      locale === 'sv' ? 'Välj en atlet eller ett lag i kontextpanelen först, så kan jag öppna rätt sida.' : 'Select an athlete or team in the context panel first, then I can open the right page.'
    )
  }

  const handleCreateFollowUpTask = async (override?: {
    title?: string
    description?: string
    priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
    dueDate?: string
  }) => {
    const subject =
      contextSelection.scope === 'athlete' && selectedAthlete
        ? { type: 'athlete' as const, name: selectedAthlete.name }
        : contextSelection.scope === 'team' && selectedTeam
          ? { type: 'team' as const, name: selectedTeam.name }
          : undefined

    setIsCreatingTask(true)
    setAssistantMessage(locale === 'sv' ? 'Jag skapar en uppgift från canvasen...' : 'I am creating a task from the canvas...')

    try {
      const response = await fetch('/api/ai/canvas/task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessSlug,
          title: override?.title || buildFollowUpTaskTitle(title, locale, subject),
          description: override?.description || buildFollowUpTaskDescription(title, blocks, locale, subject),
          priority: override?.priority || (blocks.some((block) => block.risks?.some((risk) => risk.priority === 'high')) ? 'HIGH' : 'NORMAL'),
          dueDate: override?.dueDate,
        }),
      })
      const payload = (await response.json()) as CanvasTaskResponse

      if (!response.ok || !payload.success || !payload.task) {
        addActionReceipt(
          'error',
          locale === 'sv' ? 'Uppgift kunde inte skapas' : 'Task could not be created',
          payload.error || (locale === 'sv' ? 'Jag kunde inte skapa uppgiften.' : 'I could not create the task.')
        )
        return
      }

      addActionReceipt(
        'success',
        locale === 'sv' ? 'Uppgift skapad' : 'Task created',
        locale === 'sv' ? `Jag skapade uppgiften "${payload.task.title}".` : `I created the task "${payload.task.title}".`
      )
    } catch {
      addActionReceipt(
        'error',
        locale === 'sv' ? 'Uppgift kunde inte skapas' : 'Task could not be created',
        locale === 'sv' ? 'Jag kunde inte nå uppgiftsfunktionen just nu. Försök igen om en stund.' : 'I could not reach the task function right now. Try again in a moment.'
      )
    } finally {
      setIsCreatingTask(false)
    }
  }

  const handleScheduleTestAction = (sourceLabel?: string) => {
    if (contextSelection.scope !== 'athlete' || !selectedAthlete) {
      addActionReceipt(
        'warning',
        locale === 'sv' ? 'Atlet saknas' : 'Athlete missing',
        locale === 'sv' ? 'Välj en atlet i kontextpanelen först, så kan jag öppna testbokningen med rätt sammanhang.' : 'Select an athlete in the context panel first, then I can open the test booking with the right context.'
      )
      return
    }

    const params = new URLSearchParams({
      clientId: selectedAthlete.id,
      source: sourceLabel || 'AI Canvas',
    })
    window.open(`/${businessSlug}/coach/field-tests/schedule?${params.toString()}`, '_blank', 'noopener,noreferrer')
    addActionReceipt(
      'info',
      locale === 'sv' ? 'Testbokning öppnad' : 'Test booking opened',
      sourceLabel
        ? locale === 'sv'
          ? `Jag öppnade testbokningen för uppföljningen "${sourceLabel}". Ingen bokning har skapats ännu.`
          : `I opened test booking for the follow-up "${sourceLabel}". No booking has been created yet.`
        : locale === 'sv'
          ? `Jag öppnade testbokningen för ${selectedAthlete.name}. Ingen bokning har skapats ännu.`
          : `I opened test booking for ${selectedAthlete.name}. No booking has been created yet.`
    )
  }

  const handleCreateReassessmentReminder = () => {
    void handleCreateFollowUpTask({
      title: contextSelection.scope === 'athlete' && selectedAthlete
        ? `Reassess ${selectedAthlete.name}`
        : contextSelection.scope === 'team' && selectedTeam
          ? `Team reassessment: ${selectedTeam.name}`
          : `Reassess AI Canvas: ${title}`.slice(0, 160),
      description: locale === 'sv'
        ? `Påminnelse skapad från AI Canvas.\n\n${buildFollowUpTaskDescription(title, blocks, locale)}`
        : `Reminder created from AI Canvas.\n\n${buildFollowUpTaskDescription(title, blocks, locale)}`,
      priority: 'NORMAL',
      dueDate: nextWeekIsoDate(),
    })
  }

  const handleOpenProgramDraft = () => {
    const params = new URLSearchParams()
    if (contextSelection.scope === 'athlete' && selectedAthlete) {
      params.set('clientId', selectedAthlete.id)
    }
    params.set('source', 'AI Canvas')
    params.set('prompt', buildProgramDraftPrompt(title, blocks, locale))
    window.open(`/${businessSlug}/coach/programs/generate?${params.toString()}`, '_blank', 'noopener,noreferrer')
    addActionReceipt(
      'info',
      locale === 'sv' ? 'Programutkast öppnat' : 'Program draft opened',
      locale === 'sv' ? 'Jag öppnade programgeneratorn med canvasens sammanhang. Inget program har skapats ännu.' : 'I opened the program generator with the canvas context. No program has been created yet.'
    )
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="border-b border-slate-200 bg-white print:border-none">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                  Phase 4A
                </Badge>
                <Badge variant="outline" className="border-cyan-200 bg-cyan-50 text-cyan-700">
                  Coach workspace
                </Badge>
              </div>
              <div>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="w-full bg-transparent text-3xl font-bold text-slate-950 outline-none sm:text-4xl"
                  aria-label="Canvas title"
                />
                <p className="mt-2 max-w-2xl text-sm text-slate-600">
                  {locale === 'sv'
                    ? 'Skapa rapporter, analyser, planer och coachbriefs som strukturerade block.'
                    : 'Create reports, analyses, plans, and coach briefs as structured blocks.'}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>{locale === 'sv' ? 'Senast uppdaterad' : 'Last updated'}: {lastUpdated}</span>
              {modelLabel && (
                <>
                  <span className="text-slate-300">|</span>
                  <span>{modelLabel}</span>
                </>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 print:hidden">
            <Button variant="outline" size="sm" onClick={handleReset} className="gap-2">
              <FilePlus2 className="h-4 w-4" />
              {locale === 'sv' ? 'Ny canvas' : 'New canvas'}
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isSaving} className="gap-2">
              <Save className="h-4 w-4" />
              {isSaving
                ? locale === 'sv' ? 'Sparar...' : 'Saving...'
                : canvasId
                  ? locale === 'sv' ? 'Spara ändringar' : 'Save changes'
                  : locale === 'sv' ? 'Spara canvas' : 'Save canvas'}
            </Button>
            <Button variant="outline" size="sm" onClick={handleArchiveCurrent} disabled={isSaving || !canvasId} className="gap-2">
              <Archive className="h-4 w-4" />
              {locale === 'sv' ? 'Arkivera' : 'Archive'}
            </Button>
            <Button variant="outline" size="sm" onClick={handleUndoLastCanvasChange} disabled={history.length === 0} className="gap-2">
              <Undo2 className="h-4 w-4" />
              {locale === 'sv' ? 'Ångra AI-ändring' : 'Undo AI change'}
            </Button>
            <Button variant="outline" size="sm" onClick={handleCopyMarkdown} className="gap-2">
              <Copy className="h-4 w-4" />
              {locale === 'sv' ? 'Kopiera' : 'Copy'}
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownloadMarkdown} disabled={isExporting} className="gap-2">
              <Download className="h-4 w-4" />
              Markdown
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrintPdf} className="gap-2">
              <Printer className="h-4 w-4" />
              PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveAthleteNote}
              disabled={isSavingNote}
              className="gap-2"
            >
              <ClipboardList className="h-4 w-4" />
              {locale === 'sv' ? 'Spara anteckning' : 'Save note'}
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrepareAthleteMessage} className="gap-2">
              <MessageSquareText className="h-4 w-4" />
              {locale === 'sv' ? 'Förbered meddelande' : 'Prepare message'}
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[280px_minmax(0,1fr)_320px] lg:px-8 print:block print:max-w-none print:px-0 print:py-0">
        <aside className="space-y-3 print:hidden">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-700" />
              <h2 className="text-sm font-semibold text-slate-900">{locale === 'sv' ? 'Nästa åtgärder' : 'Next actions'}</h2>
            </div>
            <div className="grid gap-2">
              <Button variant="outline" size="sm" onClick={handleOpenContext} className="justify-start gap-2">
                <ExternalLink className="h-4 w-4" />
                {locale === 'sv' ? 'Öppna kontext' : 'Open context'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { void handleCreateFollowUpTask() }}
                disabled={isCreatingTask}
                className="justify-start gap-2"
              >
                <ClipboardList className="h-4 w-4" />
                {isCreatingTask ? (locale === 'sv' ? 'Skapar uppgift...' : 'Creating task...') : (locale === 'sv' ? 'Skapa uppgift' : 'Create task')}
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrepareAthleteMessage} className="justify-start gap-2">
                <MessageSquareText className="h-4 w-4" />
                {locale === 'sv' ? 'Förbered meddelande' : 'Prepare message'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveAthleteNote}
                disabled={isSavingNote}
                className="justify-start gap-2"
              >
                <ClipboardList className="h-4 w-4" />
                {locale === 'sv' ? 'Spara intern anteckning' : 'Save internal note'}
              </Button>
              <Button variant="outline" size="sm" onClick={handleOpenProgramDraft} className="justify-start gap-2">
                <ListChecks className="h-4 w-4" />
                {locale === 'sv' ? 'Öppna programutkast' : 'Open program draft'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCreateReassessmentReminder}
                disabled={isCreatingTask}
                className="justify-start gap-2"
              >
                <CalendarPlus className="h-4 w-4" />
                {locale === 'sv' ? 'Påminn om reassessment' : 'Remind about reassessment'}
              </Button>
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-500">
              {locale === 'sv'
                ? 'Åtgärder kräver klick och AI Canvas berättar alltid vad som hände. Meddelanden skickas bara från granskningspanelen.'
                : 'Actions require a click and AI Canvas always reports what happened. Messages are only sent from the review panel.'}
            </p>
          </div>

          <div className={cn(
            'rounded-lg border bg-white p-4 shadow-sm',
            tierGuardrails.level === 'warning' ? 'border-amber-200' : 'border-slate-200'
          )}>
            <div className="mb-2 flex items-center gap-2">
              <ShieldCheck className={cn(
                'h-4 w-4',
                tierGuardrails.level === 'warning' ? 'text-amber-600' : 'text-emerald-600'
              )} />
              <h2 className="text-sm font-semibold text-slate-900">{locale === 'sv' ? 'AI-kostnad & tier' : 'AI cost & tier'}</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{tierGuardrails.label}</Badge>
              <Badge variant="outline">{subscriptionStatus.toLowerCase()}</Badge>
              <Badge variant="outline">{tierGuardrails.calls}</Badge>
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-600">{tierGuardrails.message}</p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-600" />
              <h2 className="text-sm font-semibold text-slate-900">{locale === 'sv' ? 'Startmallar' : 'Starter templates'}</h2>
            </div>
            <div className="space-y-2">
              {workspaceTemplates.map((template) => {
                const Icon = template.icon
                const isSelected = selectedTemplateId === template.id
                return (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => handleSelectTemplate(template)}
                    className={cn(
                      'w-full rounded-md border p-3 text-left transition hover:border-slate-300 hover:bg-slate-50',
                      isSelected ? 'border-slate-900 bg-slate-50' : 'border-slate-200 bg-white'
                    )}
                  >
                    <span className="flex items-center gap-2 text-sm font-medium text-slate-900">
                      <Icon className="h-4 w-4 text-slate-600" />
                      {template.name}
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-slate-500">{template.description}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4 text-indigo-700" />
              <h2 className="text-sm font-semibold text-slate-900">{locale === 'sv' ? 'Rapportmallar' : 'Report templates'}</h2>
            </div>
            <div className="space-y-2">
              {reportTemplates.map((template) => {
                const Icon = template.icon
                const isSelected = selectedTemplateId === template.id
                return (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => handleSelectTemplate(template)}
                    className={cn(
                      'w-full rounded-md border p-3 text-left transition hover:border-slate-300 hover:bg-slate-50',
                      isSelected ? 'border-slate-900 bg-slate-50' : 'border-slate-200 bg-white'
                    )}
                  >
                    <span className="flex items-center gap-2 text-sm font-medium text-slate-900">
                      <Icon className="h-4 w-4 text-slate-600" />
                      {template.name}
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-slate-500">{template.description}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-cyan-700" />
              <h2 className="text-sm font-semibold text-slate-900">{locale === 'sv' ? 'Kontext' : 'Context'}</h2>
            </div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">{locale === 'sv' ? 'Fokus' : 'Focus'}</label>
                <Select
                  value={contextSelection.scope}
                  onValueChange={(value) => {
                    const nextScope = value as CanvasContextSelection['scope']
                    setContextSelection((current) => ({
                      ...current,
                      scope: nextScope,
                      athleteId: nextScope === 'athlete' ? current.athleteId : '',
                      teamId: nextScope === 'team' ? current.teamId : '',
                    }))
                  }}
                >
                  <SelectTrigger className="h-9 border-slate-200">
                    <SelectValue placeholder={locale === 'sv' ? 'Välj fokus' : 'Select focus'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{locale === 'sv' ? 'Ingen specifik' : 'None specific'}</SelectItem>
                    <SelectItem value="athlete">{locale === 'sv' ? 'Atlet' : 'Athlete'}</SelectItem>
                    <SelectItem value="team">{locale === 'sv' ? 'Lag' : 'Team'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {contextSelection.scope === 'athlete' && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">{locale === 'sv' ? 'Atlet' : 'Athlete'}</label>
                  <Select
                    value={contextSelection.athleteId || 'none'}
                    onValueChange={(value) => {
                      setContextSelection((current) => ({
                        ...current,
                        athleteId: value === 'none' ? '' : value,
                      }))
                    }}
                  >
                    <SelectTrigger className="h-9 border-slate-200">
                      <SelectValue placeholder={locale === 'sv' ? 'Välj atlet' : 'Select athlete'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{locale === 'sv' ? 'Välj atlet' : 'Select athlete'}</SelectItem>
                      {athletes.map((athlete) => (
                        <SelectItem key={athlete.id} value={athlete.id}>
                          {athlete.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {contextSelection.scope === 'team' && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">{locale === 'sv' ? 'Lag' : 'Team'}</label>
                  <Select
                    value={contextSelection.teamId || 'none'}
                    onValueChange={(value) => {
                      setContextSelection((current) => ({
                        ...current,
                        teamId: value === 'none' ? '' : value,
                      }))
                    }}
                  >
                    <SelectTrigger className="h-9 border-slate-200">
                      <SelectValue placeholder={locale === 'sv' ? 'Välj lag' : 'Select team'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{locale === 'sv' ? 'Välj lag' : 'Select team'}</SelectItem>
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">{locale === 'sv' ? 'Period' : 'Period'}</label>
                <Select
                  value={contextSelection.dateRange}
                  onValueChange={(value) => {
                    setContextSelection((current) => ({
                      ...current,
                      dateRange: value as CanvasContextSelection['dateRange'],
                    }))
                  }}
                >
                  <SelectTrigger className="h-9 border-slate-200">
                    <SelectValue placeholder={locale === 'sv' ? 'Välj period' : 'Select period'} />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(dateRangeLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <p className="mb-2 text-xs font-medium text-slate-600">{locale === 'sv' ? 'Data att förbereda' : 'Data to prepare'}</p>
                <div className="space-y-2">
                  {contextDataOptions.map((option) => (
                    <label key={option.key} className="flex items-center gap-2 text-sm text-slate-700">
                      <Checkbox
                        checked={contextSelection.dataKeys.includes(option.key)}
                        onCheckedChange={(checked) => updateContextDataKey(option.key, checked === true)}
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="rounded-md border border-cyan-100 bg-cyan-50 p-3">
                <p className="text-xs leading-5 text-cyan-900">
                  {contextSummary || (locale === 'sv' ? 'Ingen specifik kontext vald ännu.' : 'No specific context selected yet.')}
                </p>
                {contextSummary && (
                  <p className="mt-2 text-[11px] leading-4 text-cyan-800">
                    {locale === 'sv'
                      ? 'När du skapar block hämtar AI Canvas en live-sammanfattning av de valda dataområdena.'
                      : 'When you create blocks, AI Canvas fetches a live summary of the selected data areas.'}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-slate-700" />
              <h2 className="text-sm font-semibold text-slate-900">{locale === 'sv' ? 'Sparade canvases' : 'Saved canvases'}</h2>
            </div>
            {savedCanvases.length === 0 ? (
              <p className="text-xs leading-5 text-slate-500">
                {locale === 'sv'
                  ? 'Inga sparade canvases ännu. Skapa ett utkast och tryck Spara canvas.'
                  : 'No saved canvases yet. Create a draft and press Save canvas.'}
              </p>
            ) : (
              <div className="space-y-2">
                {savedCanvases.map((canvas) => {
                  const isActive = canvas.id === canvasId
                  return (
                    <button
                      key={canvas.id}
                      type="button"
                      onClick={() => { void handleLoadCanvas(canvas.id) }}
                      disabled={loadingCanvasId === canvas.id}
                      className={cn(
                        'w-full rounded-md border p-3 text-left transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-wait disabled:opacity-70',
                        isActive ? 'border-slate-900 bg-slate-50' : 'border-slate-200 bg-white'
                      )}
                    >
                      <span className="block truncate text-sm font-medium text-slate-900">{canvas.title}</span>
                      <span className="mt-1 block text-xs text-slate-500">
                        {canvas.blockCount} {locale === 'sv' ? 'block' : 'blocks'} · {new Date(canvas.updatedAt).toLocaleDateString(dateLocale)}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-sky-600" />
              <h2 className="text-sm font-semibold text-slate-900">{locale === 'sv' ? 'Datakoppling' : 'Data connection'}</h2>
            </div>
            <p className="text-xs leading-5 text-slate-600">
              {locale === 'sv'
                ? 'Atlet, team, datumintervall, tester, pass, program, readiness och anteckningar kan användas som valbar livekontext.'
                : 'Athlete, team, date range, tests, sessions, programs, readiness, and notes can be used as selectable live context.'}
            </p>
          </div>
        </aside>

        <div className="space-y-4 print:space-y-0">
          <div className="rounded-lg border border-slate-200 bg-white shadow-sm print:rounded-none print:border-none print:shadow-none">
            <div className="border-b border-slate-200 p-4 print:hidden">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Canvas</h2>
                  <p className="text-xs text-slate-500">
                    {blocks.length} {locale === 'sv' ? 'block i arbetsytan' : 'blocks in the workspace'}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={handleReset} className="gap-2">
                  <RotateCcw className="h-4 w-4" />
                  {locale === 'sv' ? 'Återställ' : 'Reset'}
                </Button>
              </div>
            </div>
            <div className="space-y-3 p-4">
              {blocks.map((block) => (
                <CanvasBlockView
                  key={block.id}
                  block={block}
                  onRegenerate={() => { void handleRegenerateBlock(block) }}
                  onCreateTask={(task) => { void handleCreateFollowUpTask(task) }}
                  onScheduleTest={handleScheduleTestAction}
                  isCreatingTask={isCreatingTask}
                  isRegenerating={regeneratingBlockId === block.id}
                />
              ))}
            </div>
          </div>
        </div>

        <aside className="space-y-3 print:hidden">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <Wand2 className="h-4 w-4 text-violet-600" />
              <h2 className="text-sm font-semibold text-slate-900">{locale === 'sv' ? 'Skapa block' : 'Create blocks'}</h2>
            </div>
            <Textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder={locale === 'sv'
                ? 'Ex: Skapa en progress report för David med nuläge, risker och nästa steg...'
                : 'Example: Create a progress report for David with current status, risks, and next steps...'}
              className="min-h-[130px] resize-none rounded-md border-slate-200 text-sm"
            />
            <AISkillPicker
              selectedSkillIds={selectedSkillIds}
              onSelectedSkillIdsChange={setSelectedSkillIds}
              disabled={isGenerating || regeneratingBlockId !== null}
              side="bottom"
              align="start"
              triggerClassName="mt-3 h-8 text-xs"
              chipsClassName="max-w-full"
            />
            <div className="mt-3 flex gap-2">
              <Button onClick={handleGenerate} disabled={isGenerating} className="flex-1 gap-2">
                {isGenerating ? <Wand2 className="h-4 w-4 animate-pulse" /> : <Send className="h-4 w-4" />}
                {isGenerating ? (locale === 'sv' ? 'Skapar...' : 'Creating...') : (locale === 'sv' ? 'Skapa' : 'Create')}
              </Button>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-600" />
              <h2 className="text-sm font-semibold text-slate-900">{locale === 'sv' ? 'AI svar' : 'AI response'}</h2>
            </div>
            <p className="text-sm leading-6 text-slate-700">{assistantMessage}</p>
            {canvasSkillsUsed.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-violet-600" />
                {canvasSkillsUsed.map((skill) => (
                  <Badge key={skill} variant="secondary" className="text-[11px] font-normal">
                    {skill}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <h2 className="text-sm font-semibold text-slate-900">{locale === 'sv' ? 'Åtgärdslogg' : 'Action log'}</h2>
            </div>
            {actionReceipts.length === 0 ? (
              <p className="text-xs leading-5 text-slate-500">
                {locale === 'sv'
                  ? 'När något sparas, skickas, öppnas eller misslyckas visas svaret här.'
                  : 'When something is saved, sent, opened, or fails, the response appears here.'}
              </p>
            ) : (
              <div className="space-y-2">
                {actionReceipts.map((receipt) => (
                  <div
                    key={receipt.id}
                    className={cn(
                      'rounded-md border p-3',
                      receipt.status === 'success' && 'border-emerald-200 bg-emerald-50',
                      receipt.status === 'warning' && 'border-amber-200 bg-amber-50',
                      receipt.status === 'error' && 'border-red-200 bg-red-50',
                      receipt.status === 'info' && 'border-sky-200 bg-sky-50'
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-slate-900">{receipt.title}</p>
                      <span className="text-[11px] text-slate-500">{receipt.createdAt}</span>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-slate-700">{receipt.detail}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Undo2 className="h-4 w-4 text-slate-600" />
                <h2 className="text-sm font-semibold text-slate-900">{locale === 'sv' ? 'Versioner' : 'Versions'}</h2>
              </div>
              <Button variant="outline" size="sm" onClick={handleUndoLastCanvasChange} disabled={history.length === 0}>
                {locale === 'sv' ? 'Ångra' : 'Undo'}
              </Button>
            </div>
            {history.length === 0 ? (
              <p className="text-xs leading-5 text-slate-500">
                {locale === 'sv'
                  ? 'AI-genereringar och blockförbättringar sparar en kort lokal version så coachen kan ångra.'
                  : 'AI generations and block improvements save a short local version so the coach can undo.'}
              </p>
            ) : (
              <div className="space-y-2">
                {history.map((snapshot) => (
                  <div key={snapshot.id} className="rounded-md border border-slate-200 p-3">
                    <p className="truncate text-xs font-semibold text-slate-900">
                      {locale === 'sv' ? 'Före' : 'Before'} {snapshot.label}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      {snapshot.blocks.length} {locale === 'sv' ? 'block' : 'blocks'} · {snapshot.createdAt}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {athleteMessageDraft && (
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <MessageSquareText className="h-4 w-4 text-blue-700" />
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900">{locale === 'sv' ? 'Meddelandeutkast' : 'Message draft'}</h2>
                    <p className="text-xs text-slate-500">
                      {athleteMessageDraft.athleteName} · {athleteMessageDraft.createdAt}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
                  {athleteMessageDraft.sentAt ? (locale === 'sv' ? 'Skickat' : 'Sent') : (locale === 'sv' ? 'Ej skickat' : 'Not sent')}
                </Badge>
              </div>
              <Textarea
                value={athleteMessageDraft.content}
                onChange={(event) => {
                  const nextContent = event.target.value.slice(0, 1000)
                  setAthleteMessageDraft((current) => current ? { ...current, content: nextContent } : current)
                }}
                className="min-h-[230px] resize-none rounded-md border-slate-200 text-sm leading-6"
                aria-label={locale === 'sv' ? 'Meddelandeutkast' : 'Message draft'}
              />
              <div className="mt-2 flex items-center justify-between gap-2 text-xs text-slate-500">
                <span>
                  {athleteMessageDraft.content.length}/1000 {locale === 'sv' ? 'tecken' : 'characters'}
                  {athleteMessageDraft.sentAt ? ` · ${locale === 'sv' ? 'skickat' : 'sent'} ${athleteMessageDraft.sentAt}` : ''}
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleCopyAthleteMessage} className="gap-2">
                    <Copy className="h-4 w-4" />
                    {locale === 'sv' ? 'Kopiera' : 'Copy'}
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSendAthleteMessage}
                    disabled={isSendingDraft || Boolean(athleteMessageDraft.sentAt)}
                    className="gap-2"
                  >
                    <Send className="h-4 w-4" />
                    {isSendingDraft
                      ? locale === 'sv' ? 'Skickar...' : 'Sending...'
                      : athleteMessageDraft.sentAt
                        ? locale === 'sv' ? 'Skickat' : 'Sent'
                        : locale === 'sv' ? 'Skicka' : 'Send'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </aside>
      </section>
    </main>
  )
}

function CanvasBlockView({
  block,
  onRegenerate,
  onCreateTask,
  onScheduleTest,
  isCreatingTask,
  isRegenerating,
}: {
  block: CanvasBlock
  onRegenerate: () => void
  onCreateTask: (task: { title: string; description?: string; priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT' }) => void
  onScheduleTest: (sourceLabel?: string) => void
  isCreatingTask: boolean
  isRegenerating: boolean
}) {
  if (block.type === 'chart') {
    return (
      <article className="rounded-lg border border-slate-200 bg-white p-4">
        <BlockHeader icon={BarChart3} title={block.title ?? 'Diagram'} compact onRegenerate={onRegenerate} isRegenerating={isRegenerating} />
        {block.content && <p className="mt-2 text-sm leading-6 text-slate-600">{block.content}</p>}
        <div className="mt-4 h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {block.chartType === 'line' ? (
              <LineChart data={block.points || []} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} width={42} />
                <Tooltip formatter={(value) => [`${value}${block.unit ? ` ${block.unit}` : ''}`, 'Värde']} />
                <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            ) : (
              <RechartsBarChart data={block.points || []} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} width={42} />
                <Tooltip formatter={(value) => [`${value}${block.unit ? ` ${block.unit}` : ''}`, 'Värde']} />
                <Bar dataKey="value" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </RechartsBarChart>
            )}
          </ResponsiveContainer>
        </div>
      </article>
    )
  }

  if (block.type === 'metric-row') {
    return (
      <article className="rounded-lg border border-slate-200 bg-white p-4">
        <BlockHeader icon={BarChart3} title={block.title ?? 'Mätvärden'} compact onRegenerate={onRegenerate} isRegenerating={isRegenerating} />
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {block.metrics?.map((metric) => (
            <div key={`${metric.label}-${metric.value}`} className={cn(
              'rounded-md border p-3',
              metric.tone === 'positive' && 'border-emerald-200 bg-emerald-50',
              metric.tone === 'warning' && 'border-amber-200 bg-amber-50',
              metric.tone === 'danger' && 'border-red-200 bg-red-50',
              (!metric.tone || metric.tone === 'neutral') && 'border-slate-200 bg-slate-50'
            )}>
              <p className="text-xs font-medium text-slate-500">{metric.label}</p>
              <p className="mt-1 text-2xl font-semibold text-slate-950">{metric.value}</p>
              {metric.detail && <p className="mt-1 text-xs leading-5 text-slate-600">{metric.detail}</p>}
            </div>
          ))}
        </div>
      </article>
    )
  }

  if (block.type === 'risk-list') {
    return (
      <article className="rounded-lg border border-slate-200 bg-white p-4">
        <BlockHeader icon={AlertCircle} title={block.title ?? 'Risker'} compact onRegenerate={onRegenerate} isRegenerating={isRegenerating} />
        <div className="mt-3 space-y-2">
          {block.risks?.map((risk) => (
            <div key={`${risk.title}-${risk.description}`} className="rounded-md border border-slate-200 p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-950">{risk.title}</p>
                  <p className="mt-1 text-sm leading-5 text-slate-700">{risk.description}</p>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    risk.priority === 'high' && 'border-red-200 bg-red-50 text-red-700',
                    risk.priority === 'medium' && 'border-amber-200 bg-amber-50 text-amber-700',
                    risk.priority === 'low' && 'border-slate-200 bg-slate-50 text-slate-600'
                  )}
                >
                  {risk.priority}
                </Badge>
              </div>
              {risk.meta && <p className="mt-2 text-xs text-slate-500">{risk.meta}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onCreateTask({
                    title: `Följ upp: ${risk.title}`.slice(0, 160),
                    description: `${risk.description}${risk.meta ? `\n\n${risk.meta}` : ''}`,
                    priority: risk.priority === 'high' ? 'HIGH' : risk.priority === 'medium' ? 'NORMAL' : 'LOW',
                  })}
                  disabled={isCreatingTask}
                  className="gap-2"
                >
                  <ClipboardList className="h-4 w-4" />
                  Skapa uppgift
                </Button>
                {looksLikeTestAction(`${risk.title} ${risk.description} ${risk.meta || ''}`) && (
                  <Button variant="outline" size="sm" onClick={() => onScheduleTest(risk.title)} className="gap-2">
                    <CalendarPlus className="h-4 w-4" />
                    Boka test
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </article>
    )
  }

  if (block.type === 'trend-summary') {
    return (
      <article className="rounded-lg border border-slate-200 bg-white p-4">
        <BlockHeader icon={TrendingUp} title={block.title ?? 'Trend'} compact onRegenerate={onRegenerate} isRegenerating={isRegenerating} />
        <div className="mt-3 space-y-2">
          {block.trends?.map((trend) => {
            const TrendIcon = trend.direction === 'down' ? TrendingDown : trend.direction === 'up' ? TrendingUp : BarChart3
            return (
              <div key={`${trend.label}-${trend.value}`} className="flex gap-3 rounded-md border border-slate-200 p-3">
                <TrendIcon className={cn(
                  'mt-0.5 h-4 w-4 shrink-0',
                  trend.direction === 'up' && 'text-emerald-600',
                  trend.direction === 'down' && 'text-red-600',
                  trend.direction === 'flat' && 'text-slate-500'
                )} />
                <div>
                  <p className="text-sm font-semibold text-slate-950">{trend.label}: {trend.value}</p>
                  {trend.detail && <p className="mt-1 text-sm leading-5 text-slate-600">{trend.detail}</p>}
                </div>
              </div>
            )
          })}
        </div>
      </article>
    )
  }

  if (block.type === 'heading') {
    return (
      <article className="rounded-lg border border-slate-200 bg-slate-950 p-5 text-white">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-2xl font-semibold">{block.title}</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={onRegenerate}
            disabled={isRegenerating}
            className="shrink-0 border-slate-700 bg-slate-900 text-white hover:bg-slate-800"
          >
            {isRegenerating ? 'Förbättrar...' : 'Förbättra'}
          </Button>
        </div>
        {block.content && <p className="mt-2 text-sm leading-6 text-slate-300">{block.content}</p>}
      </article>
    )
  }

  if (block.type === 'table') {
    return (
      <article className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <BlockHeader icon={Table2} title={block.title ?? 'Tabell'} onRegenerate={onRegenerate} isRegenerating={isRegenerating} />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                {block.columns?.map((column) => (
                  <th key={column} className="px-4 py-3 font-semibold">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {block.rows?.map((row) => (
                <tr key={row.join('-')} className="text-slate-700">
                  {row.map((cell) => (
                    <td key={cell} className="px-4 py-3 align-top">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    )
  }

  if (block.type === 'checklist' || block.type === 'actions') {
    const Icon = block.type === 'actions' ? ClipboardList : ListChecks
    return (
      <article className="rounded-lg border border-slate-200 bg-white p-4">
        <BlockHeader icon={Icon} title={block.title ?? 'Lista'} compact onRegenerate={onRegenerate} isRegenerating={isRegenerating} />
        <ul className="mt-3 space-y-2">
          {block.items?.map((item) => (
            <li key={item} className="rounded-md border border-slate-200 p-3">
              <div className="flex gap-2 text-sm leading-6 text-slate-700">
                <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-600" />
                <span>{item}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 pl-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onCreateTask({
                    title: item.slice(0, 160),
                    description: block.title ? `Från canvasblocket "${block.title}".` : 'Från AI Canvas.',
                  })}
                  disabled={isCreatingTask}
                  className="gap-2"
                >
                  <ClipboardList className="h-4 w-4" />
                  Skapa uppgift
                </Button>
                {looksLikeTestAction(item) && (
                  <Button variant="outline" size="sm" onClick={() => onScheduleTest(item)} className="gap-2">
                    <CalendarPlus className="h-4 w-4" />
                    Boka test
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </article>
    )
  }

  if (block.type === 'insight') {
    const toneClass =
      block.tone === 'positive'
        ? 'border-emerald-200 bg-emerald-50 text-emerald-950'
        : block.tone === 'warning'
          ? 'border-amber-200 bg-amber-50 text-amber-950'
          : 'border-sky-200 bg-sky-50 text-sky-950'

    return (
      <article className={cn('rounded-lg border p-4', toneClass)}>
        <BlockHeader icon={Lightbulb} title={block.title ?? 'Insikt'} compact onRegenerate={onRegenerate} isRegenerating={isRegenerating} />
        {block.content && <p className="mt-2 text-sm leading-6">{block.content}</p>}
      </article>
    )
  }

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4">
      <BlockHeader icon={FileText} title={block.title ?? 'Text'} compact onRegenerate={onRegenerate} isRegenerating={isRegenerating} />
      {block.content && <p className="mt-2 text-sm leading-6 text-slate-700">{block.content}</p>}
    </article>
  )
}

function BlockHeader({
  icon: Icon,
  title,
  compact = false,
  onRegenerate,
  isRegenerating = false,
}: {
  icon: typeof FileText
  title: string
  compact?: boolean
  onRegenerate?: () => void
  isRegenerating?: boolean
}) {
  return (
    <div className={cn('flex items-center justify-between gap-3', compact ? 'text-sm' : 'px-4 py-3')}>
      <div className="flex min-w-0 items-center gap-2">
        <Icon className="h-4 w-4 shrink-0 text-slate-500" />
        <h3 className="truncate font-semibold text-slate-900">{title}</h3>
      </div>
      {onRegenerate && (
        <Button variant="outline" size="sm" onClick={onRegenerate} disabled={isRegenerating} className="shrink-0">
          {isRegenerating ? 'Förbättrar...' : 'Förbättra'}
        </Button>
      )}
    </div>
  )
}

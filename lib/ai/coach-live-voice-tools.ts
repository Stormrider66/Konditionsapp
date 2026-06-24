import { z } from 'zod'
import {
  prepareCoachMessageDraftInputSchema,
  type PrepareCoachMessageDraftInput,
} from '@/lib/ai/coach-message-actions'

export const GET_COACH_READINESS_OVERVIEW_TOOL_NAME = 'getCoachReadinessOverview'
export const GET_COACH_ATHLETE_CARDIO_SUMMARY_TOOL_NAME = 'getCoachAthleteCardioSummary'
export const SUGGEST_COACH_NAVIGATION_TOOL_NAME = 'suggestCoachNavigation'
export const PREPARE_COACH_MESSAGE_DRAFT_TOOL_NAME = 'prepareCoachMessageDraft'

export const COACH_LIVE_VOICE_DIRECT_TOOL_NAMES = [
  GET_COACH_READINESS_OVERVIEW_TOOL_NAME,
  GET_COACH_ATHLETE_CARDIO_SUMMARY_TOOL_NAME,
  SUGGEST_COACH_NAVIGATION_TOOL_NAME,
] as const

export const COACH_LIVE_VOICE_ACTION_DRAFT_TOOL_NAMES = [
  PREPARE_COACH_MESSAGE_DRAFT_TOOL_NAME,
] as const

export type CoachLiveVoiceDirectToolName = typeof COACH_LIVE_VOICE_DIRECT_TOOL_NAMES[number]
export type CoachLiveVoiceActionDraftToolName = typeof COACH_LIVE_VOICE_ACTION_DRAFT_TOOL_NAMES[number]
export type CoachLiveVoiceToolName = CoachLiveVoiceDirectToolName | CoachLiveVoiceActionDraftToolName

type AppLocale = 'en' | 'sv'

interface RealtimeFunctionTool {
  type: 'function'
  name: string
  description: string
  parameters: Record<string, unknown>
}

export const coachReadinessOverviewInputSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  teamId: z.string().uuid().optional(),
  teamName: z.string().min(2).max(120).optional(),
  limit: z.number().int().min(1).max(15).optional(),
})

export const coachAthleteCardioSummaryInputSchema = z.object({
  clientId: z.string().uuid().optional(),
  athleteName: z.string().min(2).max(120).optional(),
  days: z.number().int().min(1).max(90).optional(),
}).superRefine((value, ctx) => {
  if (!value.clientId && !value.athleteName) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['athleteName'],
      message: 'Provide clientId or athleteName.',
    })
  }
})

export const coachNavigationDestinations = [
  'dashboard',
  'calendar',
  'athletes',
  'programs',
  'programBuilder',
  'aiStudio',
  'strength',
  'cardio',
  'hybrid',
  'agility',
  'monitoring',
  'liveHr',
  'testOverview',
  'newTest',
  'videoAnalysis',
  'messages',
  'teams',
  'settings',
  'documents',
  'analytics',
  'athleteProfile',
  'athleteLogs',
  'athleteCalendar',
  'athleteFueling',
  'athleteEdit',
  'teamDashboard',
  'teamCalendar',
  'teamStrength',
  'teamCapture',
  'teamTests',
] as const

export const coachNavigationInputSchema = z.object({
  destination: z.enum(coachNavigationDestinations),
  clientId: z.string().uuid().optional(),
  athleteName: z.string().min(2).max(120).optional(),
  teamId: z.string().uuid().optional(),
  teamName: z.string().min(2).max(120).optional(),
})

export type CoachReadinessOverviewInput = z.infer<typeof coachReadinessOverviewInputSchema>
export type CoachAthleteCardioSummaryInput = z.infer<typeof coachAthleteCardioSummaryInputSchema>
export type CoachNavigationInput = z.infer<typeof coachNavigationInputSchema>

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

export function isCoachLiveVoiceDirectToolName(value: string): value is CoachLiveVoiceDirectToolName {
  return (COACH_LIVE_VOICE_DIRECT_TOOL_NAMES as readonly string[]).includes(value)
}

export function isCoachLiveVoiceActionDraftToolName(value: string): value is CoachLiveVoiceActionDraftToolName {
  return (COACH_LIVE_VOICE_ACTION_DRAFT_TOOL_NAMES as readonly string[]).includes(value)
}

export function getCoachLiveVoiceDirectSchema(toolName: CoachLiveVoiceDirectToolName) {
  switch (toolName) {
    case GET_COACH_READINESS_OVERVIEW_TOOL_NAME:
      return coachReadinessOverviewInputSchema
    case GET_COACH_ATHLETE_CARDIO_SUMMARY_TOOL_NAME:
      return coachAthleteCardioSummaryInputSchema
    case SUGGEST_COACH_NAVIGATION_TOOL_NAME:
      return coachNavigationInputSchema
  }
}

export function getCoachLiveVoiceActionDraftSchema(toolName: CoachLiveVoiceActionDraftToolName) {
  switch (toolName) {
    case PREPARE_COACH_MESSAGE_DRAFT_TOOL_NAME:
      return prepareCoachMessageDraftInputSchema
  }
}

function coachReadinessOverviewRealtimeTool(locale: AppLocale): RealtimeFunctionTool {
  return {
    type: 'function',
    name: GET_COACH_READINESS_OVERVIEW_TOOL_NAME,
    description: t(
      locale,
      'Read a coach-safe overview of athletes who may need attention today: low readiness, missing check-in, injuries, and planned sessions. Read-only.',
      'Läs en coachsäker översikt över atleter som kan behöva uppmärksamhet idag: låg readiness, saknad check-in, skador och planerade pass. Endast läsning.'
    ),
    parameters: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'YYYY-MM-DD' },
        teamId: { type: 'string' },
        teamName: { type: 'string' },
        limit: { type: 'integer', minimum: 1, maximum: 15 },
      },
    },
  }
}

function coachAthleteCardioSummaryRealtimeTool(locale: AppLocale): RealtimeFunctionTool {
  return {
    type: 'function',
    name: GET_COACH_ATHLETE_CARDIO_SUMMARY_TOOL_NAME,
    description: t(
      locale,
      'Read a recent cardio summary for one athlete: latest logged cardio sessions, power/HR/distance/RPE, and planned cardio today. Read-only.',
      'Läs en aktuell konditionssammanfattning för en atlet: senaste loggade konditionspass, effekt/puls/distans/RPE och planerad kondition idag. Endast läsning.'
    ),
    parameters: {
      type: 'object',
      properties: {
        clientId: { type: 'string' },
        athleteName: { type: 'string' },
        days: { type: 'integer', minimum: 1, maximum: 90 },
      },
    },
  }
}

function prepareCoachMessageDraftRealtimeTool(locale: AppLocale): RealtimeFunctionTool {
  return {
    type: 'function',
    name: PREPARE_COACH_MESSAGE_DRAFT_TOOL_NAME,
    description: t(
      locale,
      'Prepare a visible confirmation card for a message to one athlete, a whole team, or a filtered team group. Never sends directly; the coach must confirm the card.',
      'Förbered ett synligt bekräftelsekort för ett meddelande till en atlet, ett helt lag eller en filtrerad laggrupp. Skickar aldrig direkt; coachen måste bekräfta kortet.'
    ),
    parameters: {
      type: 'object',
      properties: {
        recipientType: { type: 'string', enum: ['ATHLETE', 'TEAM'] },
        content: { type: 'string' },
        subject: { type: 'string' },
        clientId: { type: 'string' },
        athleteName: { type: 'string' },
        teamId: { type: 'string' },
        teamName: { type: 'string' },
        teamTarget: {
          type: 'string',
          enum: ['ALL', 'LOW_READINESS', 'MISSED_WORKOUTS', 'INJURED', 'SELECTED'],
        },
        clientIds: {
          type: 'array',
          items: { type: 'string' },
        },
      },
      required: ['recipientType', 'content'],
    },
  }
}

function suggestCoachNavigationRealtimeTool(locale: AppLocale): RealtimeFunctionTool {
  return {
    type: 'function',
    name: SUGGEST_COACH_NAVIGATION_TOOL_NAME,
    description: t(
      locale,
      'Open or prepare a safe shortcut to a coach page, athlete page, or team page. Use when the coach asks to open, show, go to, or take them to a view. Read-only.',
      'Öppna eller förbered en säker genväg till en coachsida, atletsida eller lagsida. Använd när coachen ber dig öppna, visa, gå till eller ta dem till en vy. Endast läsning.'
    ),
    parameters: {
      type: 'object',
      properties: {
        destination: {
          type: 'string',
          enum: coachNavigationDestinations,
          description: 'Target coach view.',
        },
        clientId: { type: 'string' },
        athleteName: { type: 'string' },
        teamId: { type: 'string' },
        teamName: { type: 'string' },
      },
      required: ['destination'],
    },
  }
}

export function buildCoachLiveVoiceRealtimeTools(locale: AppLocale): RealtimeFunctionTool[] {
  return [
    coachReadinessOverviewRealtimeTool(locale),
    coachAthleteCardioSummaryRealtimeTool(locale),
    suggestCoachNavigationRealtimeTool(locale),
    prepareCoachMessageDraftRealtimeTool(locale),
  ]
}

export function buildPrepareCoachMessageDraftPreview(
  action: {
    title: string
    description: string
    targetLabel: string
    subject: string | null
    content: string
    recipients: Array<{ clientId: string; name: string; teamName: string | null }>
    recipientCount: number
    confirmLabel: string
    reviewHref: string
  },
  _input: PrepareCoachMessageDraftInput,
) {
  return {
    title: action.title,
    description: action.description,
    targetLabel: action.targetLabel,
    subject: action.subject,
    body: action.content,
    recipients: action.recipients,
    recipientCount: action.recipientCount,
    confirmLabel: action.confirmLabel,
    reviewHref: action.reviewHref,
  }
}

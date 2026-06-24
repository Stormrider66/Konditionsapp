import { z } from 'zod'
import {
  prepareCoachMessageDraftInputSchema,
  type PrepareCoachMessageDraftInput,
} from '@/lib/ai/coach-message-actions'
import {
  prepareCoachDailyBriefingInputSchema,
  type PrepareCoachDailyBriefingInput,
} from '@/lib/ai/coach-briefing-actions'
import {
  createAndAssignCardioWorkoutInputSchema,
  modifyCardioAssignmentInputSchema,
  modifyTeamCardioAssignmentsInputSchema,
  repeatPreviousCardioWorkoutInputSchema,
  type CreateAndAssignCardioWorkoutInput,
  type ModifyCardioAssignmentInput,
  type ModifyTeamCardioAssignmentsInput,
  type RepeatPreviousCardioWorkoutInput,
} from '@/lib/ai/coach-cardio-actions'

export const GET_COACH_READINESS_OVERVIEW_TOOL_NAME = 'getCoachReadinessOverview'
export const GET_COACH_ATHLETE_CARDIO_SUMMARY_TOOL_NAME = 'getCoachAthleteCardioSummary'
export const SUGGEST_COACH_NAVIGATION_TOOL_NAME = 'suggestCoachNavigation'
export const PREPARE_COACH_MESSAGE_DRAFT_TOOL_NAME = 'prepareCoachMessageDraft'
export const CREATE_AND_ASSIGN_CARDIO_WORKOUT_TOOL_NAME = 'createAndAssignCardioWorkout'
export const MODIFY_CARDIO_ASSIGNMENT_TOOL_NAME = 'modifyCardioAssignment'
export const REPEAT_PREVIOUS_CARDIO_WORKOUT_TOOL_NAME = 'repeatPreviousCardioWorkout'
export const MODIFY_TEAM_CARDIO_ASSIGNMENTS_TOOL_NAME = 'modifyTeamCardioAssignments'
export const PREPARE_COACH_DAILY_BRIEFING_TOOL_NAME = 'prepareCoachDailyBriefing'

export const COACH_LIVE_VOICE_DIRECT_TOOL_NAMES = [
  GET_COACH_READINESS_OVERVIEW_TOOL_NAME,
  GET_COACH_ATHLETE_CARDIO_SUMMARY_TOOL_NAME,
  SUGGEST_COACH_NAVIGATION_TOOL_NAME,
] as const

export const COACH_LIVE_VOICE_ACTION_DRAFT_TOOL_NAMES = [
  PREPARE_COACH_MESSAGE_DRAFT_TOOL_NAME,
  CREATE_AND_ASSIGN_CARDIO_WORKOUT_TOOL_NAME,
  MODIFY_CARDIO_ASSIGNMENT_TOOL_NAME,
  REPEAT_PREVIOUS_CARDIO_WORKOUT_TOOL_NAME,
  MODIFY_TEAM_CARDIO_ASSIGNMENTS_TOOL_NAME,
  PREPARE_COACH_DAILY_BRIEFING_TOOL_NAME,
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
export type CoachLiveVoiceCreateAndAssignCardioInput = CreateAndAssignCardioWorkoutInput
export type CoachLiveVoiceModifyCardioInput = ModifyCardioAssignmentInput
export type CoachLiveVoiceRepeatPreviousCardioInput = RepeatPreviousCardioWorkoutInput
export type CoachLiveVoiceModifyTeamCardioInput = ModifyTeamCardioAssignmentsInput
export type CoachLiveVoiceDailyBriefingInput = PrepareCoachDailyBriefingInput

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
    case CREATE_AND_ASSIGN_CARDIO_WORKOUT_TOOL_NAME:
      return createAndAssignCardioWorkoutInputSchema
    case MODIFY_CARDIO_ASSIGNMENT_TOOL_NAME:
      return modifyCardioAssignmentInputSchema
    case REPEAT_PREVIOUS_CARDIO_WORKOUT_TOOL_NAME:
      return repeatPreviousCardioWorkoutInputSchema
    case MODIFY_TEAM_CARDIO_ASSIGNMENTS_TOOL_NAME:
      return modifyTeamCardioAssignmentsInputSchema
    case PREPARE_COACH_DAILY_BRIEFING_TOOL_NAME:
      return prepareCoachDailyBriefingInputSchema
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

function prepareCoachDailyBriefingRealtimeTool(locale: AppLocale): RealtimeFunctionTool {
  return {
    type: 'function',
    name: PREPARE_COACH_DAILY_BRIEFING_TOOL_NAME,
    description: t(
      locale,
      'Prepare a visible coach review card for athletes needing attention today: readiness, injuries, ACWR/load, missed workouts, and planned sessions. Confirmation only marks it reviewed; it does not send or change anything.',
      'Förbered ett synligt coachkort för atleter som behöver uppmärksamhet idag: readiness, skador, ACWR/belastning, missade pass och planerade pass. Bekräftelse markerar bara som granskad; inget skickas eller ändras.'
    ),
    parameters: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'YYYY-MM-DD in Stockholm.' },
        teamId: { type: 'string' },
        teamName: { type: 'string' },
        focus: { type: 'string', enum: ['MORNING', 'LOW_READINESS', 'MISSED_WORKOUTS', 'INJURY', 'LOAD'] },
        limit: { type: 'integer', minimum: 1, maximum: 12 },
      },
    },
  }
}

function createAndAssignCardioWorkoutRealtimeTool(locale: AppLocale): RealtimeFunctionTool {
  return {
    type: 'function',
    name: CREATE_AND_ASSIGN_CARDIO_WORKOUT_TOOL_NAME,
    description: t(
      locale,
      'Prepare a confirmation card that creates a cardio workout and assigns it to one athlete, a team, a filtered group, or selected athletes. Never saves directly.',
      'Förbered ett bekräftelsekort som skapar ett konditionspass och tilldelar det till en atlet, ett lag, en filtrerad grupp eller valda atleter. Sparar aldrig direkt.'
    ),
    parameters: {
      type: 'object',
      properties: {
        targetType: { type: 'string', enum: ['ATHLETE', 'TEAM', 'SELECTED'] },
        clientId: { type: 'string' },
        athleteName: { type: 'string' },
        teamId: { type: 'string' },
        teamName: { type: 'string' },
        teamTarget: { type: 'string', enum: ['ALL', 'LOW_READINESS', 'MISSED_WORKOUTS', 'INJURED', 'SELECTED'] },
        clientIds: { type: 'array', items: { type: 'string' } },
        date: { type: 'string', description: 'YYYY-MM-DD in Stockholm.' },
        name: { type: 'string' },
        description: { type: 'string' },
        workoutType: { type: 'string', enum: ['INTERVAL', 'STEADY'] },
        sport: { type: 'string', enum: ['RUNNING', 'CYCLING', 'SWIMMING', 'SKIING', 'TRIATHLON', 'HYROX', 'GENERAL_FITNESS', 'FUNCTIONAL_FITNESS', 'TEAM_ICE_HOCKEY', 'TEAM_FOOTBALL', 'TEAM_HANDBALL', 'TEAM_FLOORBALL', 'TEAM_BASKETBALL', 'TEAM_VOLLEYBALL', 'TENNIS', 'PADEL'] },
        equipment: { type: 'string', enum: ['RUN', 'BIKE', 'WATTBIKE', 'BIKE_ERG', 'ROW', 'SKI_ERG', 'ECHO_BIKE', 'ASSAULT_BIKE', 'AIR_BIKE', 'TREADMILL', 'OTHER'] },
        rounds: { type: 'integer', minimum: 1, maximum: 80 },
        workDurationSeconds: { type: 'integer', minimum: 10, maximum: 7200 },
        restDurationSeconds: { type: 'integer', minimum: 0, maximum: 3600 },
        durationSeconds: { type: 'integer', minimum: 60, maximum: 21600 },
        intensity: { type: 'string', description: 'Required coach-facing intensity, e.g. Z4, RPE 8, 90% FTP, easy Z2.' },
        zone: { type: 'number', minimum: 1, maximum: 5 },
        targetPower: { type: 'string' },
        targetCadence: { type: 'string' },
        warmupSeconds: { type: 'integer', minimum: 0, maximum: 3600 },
        cooldownSeconds: { type: 'integer', minimum: 0, maximum: 3600 },
        notes: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
      },
      required: ['targetType', 'date', 'name', 'workoutType', 'intensity'],
    },
  }
}

function modifyCardioAssignmentRealtimeTool(locale: AppLocale): RealtimeFunctionTool {
  return {
    type: 'function',
    name: MODIFY_CARDIO_ASSIGNMENT_TOOL_NAME,
    description: t(
      locale,
      'Prepare a confirmation card that modifies one planned cardio assignment: move date, shorten, change intensity, swap sport/equipment, or replace with an easier session. Never changes directly.',
      'Förbered ett bekräftelsekort som anpassar en planerad konditionstilldelning: flytta datum, korta ner, ändra intensitet, byta sport/utrustning eller ersätta med ett lättare pass. Ändrar aldrig direkt.'
    ),
    parameters: {
      type: 'object',
      properties: {
        assignmentId: { type: 'string' },
        clientId: { type: 'string' },
        athleteName: { type: 'string' },
        currentDate: { type: 'string', description: 'YYYY-MM-DD of the planned assignment if assignmentId is unknown.' },
        sessionName: { type: 'string' },
        newDate: { type: 'string', description: 'YYYY-MM-DD if moving the assignment.' },
        name: { type: 'string' },
        workoutType: { type: 'string', enum: ['INTERVAL', 'STEADY'] },
        sport: { type: 'string', enum: ['RUNNING', 'CYCLING', 'SWIMMING', 'SKIING', 'TRIATHLON', 'HYROX', 'GENERAL_FITNESS', 'FUNCTIONAL_FITNESS', 'TEAM_ICE_HOCKEY', 'TEAM_FOOTBALL', 'TEAM_HANDBALL', 'TEAM_FLOORBALL', 'TEAM_BASKETBALL', 'TEAM_VOLLEYBALL', 'TENNIS', 'PADEL'] },
        equipment: { type: 'string', enum: ['RUN', 'BIKE', 'WATTBIKE', 'BIKE_ERG', 'ROW', 'SKI_ERG', 'ECHO_BIKE', 'ASSAULT_BIKE', 'AIR_BIKE', 'TREADMILL', 'OTHER'] },
        rounds: { type: 'integer', minimum: 1, maximum: 80 },
        workDurationSeconds: { type: 'integer', minimum: 10, maximum: 7200 },
        restDurationSeconds: { type: 'integer', minimum: 0, maximum: 3600 },
        durationSeconds: { type: 'integer', minimum: 60, maximum: 21600 },
        intensity: { type: 'string' },
        zone: { type: 'number', minimum: 1, maximum: 5 },
        targetPower: { type: 'string' },
        targetCadence: { type: 'string' },
        warmupSeconds: { type: 'integer', minimum: 0, maximum: 3600 },
        cooldownSeconds: { type: 'integer', minimum: 0, maximum: 3600 },
        notes: { type: 'string' },
        reason: { type: 'string' },
      },
    },
  }
}

function repeatPreviousCardioWorkoutRealtimeTool(locale: AppLocale): RealtimeFunctionTool {
  return {
    type: 'function',
    name: REPEAT_PREVIOUS_CARDIO_WORKOUT_TOOL_NAME,
    description: t(
      locale,
      'Prepare a confirmation card that repeats a previous cardio workout structure for one athlete, a team, a filtered group, or selected athletes. Can make it easier, harder, shorter, or longer. Never saves directly.',
      'Förbered ett bekräftelsekort som upprepar ett tidigare konditionsupplägg för en atlet, ett lag, en filtrerad grupp eller valda atleter. Kan göra det lättare, hårdare, kortare eller längre. Sparar aldrig direkt.'
    ),
    parameters: {
      type: 'object',
      properties: {
        targetType: { type: 'string', enum: ['ATHLETE', 'TEAM', 'SELECTED'] },
        clientId: { type: 'string' },
        athleteName: { type: 'string' },
        teamId: { type: 'string' },
        teamName: { type: 'string' },
        teamTarget: { type: 'string', enum: ['ALL', 'LOW_READINESS', 'MISSED_WORKOUTS', 'INJURED', 'SELECTED'] },
        clientIds: { type: 'array', items: { type: 'string' } },
        sourceAssignmentId: { type: 'string' },
        sourceClientId: { type: 'string' },
        sourceAthleteName: { type: 'string' },
        sourceDate: { type: 'string', description: 'YYYY-MM-DD for the workout to repeat, if known.' },
        sourceSessionName: { type: 'string' },
        lookbackDays: { type: 'integer', minimum: 1, maximum: 120 },
        date: { type: 'string', description: 'YYYY-MM-DD target date in Stockholm.' },
        name: { type: 'string' },
        adjustment: { type: 'string', enum: ['SAME', 'EASIER', 'HARDER', 'SHORTER', 'LONGER', 'CUSTOM'] },
        durationScale: { type: 'number', minimum: 0.5, maximum: 1.5 },
        notes: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
      },
      required: ['targetType', 'date'],
    },
  }
}

function modifyTeamCardioAssignmentsRealtimeTool(locale: AppLocale): RealtimeFunctionTool {
  return {
    type: 'function',
    name: MODIFY_TEAM_CARDIO_ASSIGNMENTS_TOOL_NAME,
    description: t(
      locale,
      'Prepare a confirmation card that modifies multiple planned cardio assignments on one calendar date for a team, filtered team group, or selected athletes. Use for requests like changing all low-readiness athletes to recovery. Never changes directly.',
      'Förbered ett bekräftelsekort som anpassar flera planerade konditionstilldelningar på ett kalenderdatum för ett lag, en filtrerad laggrupp eller valda atleter. Använd för t.ex. att ändra alla med låg readiness till återhämtning. Ändrar aldrig direkt.'
    ),
    parameters: {
      type: 'object',
      properties: {
        targetType: { type: 'string', enum: ['TEAM', 'SELECTED'] },
        teamId: { type: 'string' },
        teamName: { type: 'string' },
        teamTarget: { type: 'string', enum: ['ALL', 'LOW_READINESS', 'MISSED_WORKOUTS', 'INJURED', 'SELECTED'] },
        clientIds: { type: 'array', items: { type: 'string' } },
        currentDate: { type: 'string', description: 'YYYY-MM-DD of planned assignments.' },
        sessionName: { type: 'string' },
        newDate: { type: 'string', description: 'YYYY-MM-DD if moving the assignments.' },
        name: { type: 'string' },
        workoutType: { type: 'string', enum: ['INTERVAL', 'STEADY'] },
        sport: { type: 'string', enum: ['RUNNING', 'CYCLING', 'SWIMMING', 'SKIING', 'TRIATHLON', 'HYROX', 'GENERAL_FITNESS', 'FUNCTIONAL_FITNESS', 'TEAM_ICE_HOCKEY', 'TEAM_FOOTBALL', 'TEAM_HANDBALL', 'TEAM_FLOORBALL', 'TEAM_BASKETBALL', 'TEAM_VOLLEYBALL', 'TENNIS', 'PADEL'] },
        equipment: { type: 'string', enum: ['RUN', 'BIKE', 'WATTBIKE', 'BIKE_ERG', 'ROW', 'SKI_ERG', 'ECHO_BIKE', 'ASSAULT_BIKE', 'AIR_BIKE', 'TREADMILL', 'OTHER'] },
        rounds: { type: 'integer', minimum: 1, maximum: 80 },
        workDurationSeconds: { type: 'integer', minimum: 10, maximum: 7200 },
        restDurationSeconds: { type: 'integer', minimum: 0, maximum: 3600 },
        durationSeconds: { type: 'integer', minimum: 60, maximum: 21600 },
        intensity: { type: 'string' },
        zone: { type: 'number', minimum: 1, maximum: 5 },
        targetPower: { type: 'string' },
        targetCadence: { type: 'string' },
        warmupSeconds: { type: 'integer', minimum: 0, maximum: 3600 },
        cooldownSeconds: { type: 'integer', minimum: 0, maximum: 3600 },
        notes: { type: 'string' },
        reason: { type: 'string' },
        maxAssignments: { type: 'integer', minimum: 1, maximum: 50 },
      },
      required: ['targetType', 'currentDate'],
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
    prepareCoachDailyBriefingRealtimeTool(locale),
    createAndAssignCardioWorkoutRealtimeTool(locale),
    modifyCardioAssignmentRealtimeTool(locale),
    repeatPreviousCardioWorkoutRealtimeTool(locale),
    modifyTeamCardioAssignmentsRealtimeTool(locale),
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

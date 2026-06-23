import { z } from 'zod'
import {
  buildCreateCardioWorkoutRealtimeTool,
  buildCreateCardioWorkoutPreview,
  CREATE_CARDIO_WORKOUT_TOOL_NAME,
  createCardioWorkoutInputSchema,
  getCreateCardioWorkoutClarification,
  stockholmDateKey,
  type CreateCardioWorkoutInput,
} from '@/lib/ai/cardio-workout-action'

export { stockholmDateKey } from '@/lib/ai/cardio-workout-action'

export const OPEN_TODAY_WORKOUT_TOOL_NAME = 'openTodayWorkout'
export const GET_READINESS_BRIEFING_TOOL_NAME = 'getReadinessBriefing'
export const PROPOSE_WORKOUT_MODIFICATION_TOOL_NAME = 'proposeWorkoutModification'
export const GET_QUICK_ERG_MATCH_SUGGESTIONS_TOOL_NAME = 'getQuickErgMatchSuggestions'
export const LOG_COMPLETED_WORKOUT_TOOL_NAME = 'logCompletedWorkout'
export const COMPLETE_ASSIGNED_WORKOUT_TOOL_NAME = 'completeAssignedWorkout'

export const ATHLETE_LIVE_VOICE_ACTION_DRAFT_TOOL_NAMES = [
  CREATE_CARDIO_WORKOUT_TOOL_NAME,
  LOG_COMPLETED_WORKOUT_TOOL_NAME,
  COMPLETE_ASSIGNED_WORKOUT_TOOL_NAME,
] as const

export const ATHLETE_LIVE_VOICE_DIRECT_TOOL_NAMES = [
  OPEN_TODAY_WORKOUT_TOOL_NAME,
  GET_READINESS_BRIEFING_TOOL_NAME,
  PROPOSE_WORKOUT_MODIFICATION_TOOL_NAME,
  GET_QUICK_ERG_MATCH_SUGGESTIONS_TOOL_NAME,
] as const

export type AthleteLiveVoiceActionDraftToolName = typeof ATHLETE_LIVE_VOICE_ACTION_DRAFT_TOOL_NAMES[number]
export type AthleteLiveVoiceDirectToolName = typeof ATHLETE_LIVE_VOICE_DIRECT_TOOL_NAMES[number]
export type AthleteLiveVoiceToolName = AthleteLiveVoiceActionDraftToolName | AthleteLiveVoiceDirectToolName

type AppLocale = 'en' | 'sv'

interface ActionPreview {
  title: string
  description: string
  targetLabel?: string
  body?: string | null
  details: string[]
  confirmLabel?: string
}

interface RealtimeFunctionTool {
  type: 'function'
  name: string
  description: string
  parameters: Record<string, unknown>
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

function dateOrToday(value?: string): string {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : stockholmDateKey()
}

function formatMinutes(value?: number | null): string | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  return `${value} min`
}

function detailsFrom(parts: Array<string | null | undefined>): string[] {
  return parts.filter((part): part is string => Boolean(part))
}

export const logCompletedWorkoutInputSchema = z.object({
  date: z.string().optional(),
  name: z.string().optional(),
  workoutType: z.enum(['CARDIO', 'STRENGTH', 'HYBRID', 'MIXED']),
  sport: z.enum([
    'RUNNING', 'CYCLING', 'SKIING', 'SWIMMING', 'TRIATHLON', 'HYROX',
    'GENERAL_FITNESS', 'FUNCTIONAL_FITNESS', 'STRENGTH',
    'TEAM_FOOTBALL', 'TEAM_ICE_HOCKEY', 'TEAM_HANDBALL', 'TEAM_FLOORBALL',
    'TEAM_BASKETBALL', 'TEAM_VOLLEYBALL', 'TENNIS', 'PADEL',
  ]).optional(),
  intensity: z.enum(['RECOVERY', 'EASY', 'MODERATE', 'THRESHOLD', 'INTERVAL', 'MAX']).optional(),
  durationMinutes: z.number().int().min(1).max(600),
  distanceKm: z.number().positive().max(500).optional(),
  avgHeartRate: z.number().int().min(40).max(230).optional(),
  maxHeartRate: z.number().int().min(40).max(250).optional(),
  perceivedEffort: z.number().int().min(1).max(10).optional(),
  notes: z.string().optional(),
})

export const completeAssignedWorkoutInputSchema = z.object({
  kind: z.enum(['STRENGTH', 'CARDIO', 'WOD']),
  assignmentId: z.string().optional(),
  date: z.string().optional(),
  rpe: z.number().int().min(1).max(10).optional(),
  durationMinutes: z.number().int().min(1).max(600).optional(),
  distanceKm: z.number().positive().max(500).optional(),
  avgHeartRate: z.number().int().min(40).max(230).optional(),
  notes: z.string().optional(),
})

export const openTodayWorkoutInputSchema = z.object({
  date: z.string().optional(),
  kind: z.enum(['ANY', 'CARDIO', 'STRENGTH', 'WOD']).optional(),
})

export const getReadinessBriefingInputSchema = z.object({
  date: z.string().optional(),
})

export const proposeWorkoutModificationInputSchema = z.object({
  date: z.string().optional(),
  goal: z.enum(['EASIER', 'HARDER', 'SHORTER', 'SWAP_TO_BIKE', 'RECOVERY', 'OTHER']).optional(),
  request: z.string().max(500).optional(),
  minutesAvailable: z.number().int().min(5).max(240).optional(),
})

export const getQuickErgMatchSuggestionsInputSchema = z.object({
  date: z.string().optional(),
  limit: z.number().int().min(1).max(5).optional(),
})

export type LogCompletedWorkoutInput = z.infer<typeof logCompletedWorkoutInputSchema>
export type CompleteAssignedWorkoutInput = z.infer<typeof completeAssignedWorkoutInputSchema>
export type OpenTodayWorkoutInput = z.infer<typeof openTodayWorkoutInputSchema>
export type GetReadinessBriefingInput = z.infer<typeof getReadinessBriefingInputSchema>
export type ProposeWorkoutModificationInput = z.infer<typeof proposeWorkoutModificationInputSchema>
export type GetQuickErgMatchSuggestionsInput = z.infer<typeof getQuickErgMatchSuggestionsInputSchema>

export function isAthleteLiveVoiceActionDraftToolName(value: string): value is AthleteLiveVoiceActionDraftToolName {
  return (ATHLETE_LIVE_VOICE_ACTION_DRAFT_TOOL_NAMES as readonly string[]).includes(value)
}

export function isAthleteLiveVoiceDirectToolName(value: string): value is AthleteLiveVoiceDirectToolName {
  return (ATHLETE_LIVE_VOICE_DIRECT_TOOL_NAMES as readonly string[]).includes(value)
}

export function getAthleteLiveVoiceActionDraftSchema(toolName: AthleteLiveVoiceActionDraftToolName) {
  switch (toolName) {
    case CREATE_CARDIO_WORKOUT_TOOL_NAME:
      return createCardioWorkoutInputSchema
    case LOG_COMPLETED_WORKOUT_TOOL_NAME:
      return logCompletedWorkoutInputSchema
    case COMPLETE_ASSIGNED_WORKOUT_TOOL_NAME:
      return completeAssignedWorkoutInputSchema
  }
}

export function getAthleteLiveVoiceDirectSchema(toolName: AthleteLiveVoiceDirectToolName) {
  switch (toolName) {
    case OPEN_TODAY_WORKOUT_TOOL_NAME:
      return openTodayWorkoutInputSchema
    case GET_READINESS_BRIEFING_TOOL_NAME:
      return getReadinessBriefingInputSchema
    case PROPOSE_WORKOUT_MODIFICATION_TOOL_NAME:
      return proposeWorkoutModificationInputSchema
    case GET_QUICK_ERG_MATCH_SUGGESTIONS_TOOL_NAME:
      return getQuickErgMatchSuggestionsInputSchema
  }
}

export function getAthleteLiveVoiceActionClarification(
  toolName: AthleteLiveVoiceActionDraftToolName,
  input: unknown,
  locale: AppLocale
): string | null {
  if (toolName === CREATE_CARDIO_WORKOUT_TOOL_NAME) {
    return getCreateCardioWorkoutClarification(input as CreateCardioWorkoutInput, locale)
  }

  if (toolName === LOG_COMPLETED_WORKOUT_TOOL_NAME) {
    const workout = input as LogCompletedWorkoutInput
    if (!workout.durationMinutes) {
      return t(locale, 'Ask for workout duration before preparing the log card.', 'Fråga efter passets duration innan du förbereder loggkortet.')
    }
    return null
  }

  if (toolName === COMPLETE_ASSIGNED_WORKOUT_TOOL_NAME) {
    const workout = input as CompleteAssignedWorkoutInput
    if (workout.rpe == null && workout.durationMinutes == null) {
      return t(
        locale,
        'Ask for at least RPE or actual duration before preparing the completion card.',
        'Fråga efter minst RPE eller faktisk duration innan du förbereder slutförandekortet.'
      )
    }
  }

  return null
}

export function buildLogCompletedWorkoutPreview(input: LogCompletedWorkoutInput, locale: AppLocale): ActionPreview {
  const date = dateOrToday(input.date)
  const title = input.name || t(locale, 'Log completed workout', 'Logga genomfört pass')
  return {
    title,
    description: t(
      locale,
      'Review this completed workout before it is added to your history and training load.',
      'Granska det genomförda passet innan det läggs till i historiken och träningsbelastningen.'
    ),
    targetLabel: detailsFrom([
      input.workoutType,
      formatMinutes(input.durationMinutes),
      input.distanceKm != null ? `${input.distanceKm} km` : null,
    ]).join(' · '),
    body: input.notes || null,
    details: detailsFrom([
      `${t(locale, 'Date', 'Datum')}: ${date}`,
      `${t(locale, 'Type', 'Typ')}: ${input.workoutType}`,
      input.sport ? `${t(locale, 'Sport', 'Sport')}: ${input.sport}` : null,
      input.intensity ? `${t(locale, 'Intensity', 'Intensitet')}: ${input.intensity}` : null,
      `${t(locale, 'Duration', 'Duration')}: ${input.durationMinutes} min`,
      input.distanceKm != null ? `${t(locale, 'Distance', 'Distans')}: ${input.distanceKm} km` : null,
      input.perceivedEffort != null ? `RPE: ${input.perceivedEffort}/10` : null,
      input.avgHeartRate != null ? `${t(locale, 'Average HR', 'Snittpuls')}: ${input.avgHeartRate} bpm` : null,
      input.maxHeartRate != null ? `${t(locale, 'Max HR', 'Maxpuls')}: ${input.maxHeartRate} bpm` : null,
    ]),
    confirmLabel: t(locale, 'Log workout', 'Logga pass'),
  }
}

export function buildCompleteAssignedWorkoutPreview(input: CompleteAssignedWorkoutInput, locale: AppLocale): ActionPreview {
  const date = dateOrToday(input.date)
  return {
    title: t(locale, 'Complete assigned workout', 'Slutför tilldelat pass'),
    description: t(
      locale,
      'Review this completion before the planned workout is marked as done.',
      'Granska slutförandet innan det planerade passet markeras som klart.'
    ),
    targetLabel: detailsFrom([input.kind, input.assignmentId ? t(locale, 'specific assignment', 'specifik tilldelning') : date]).join(' · '),
    body: input.notes || null,
    details: detailsFrom([
      `${t(locale, 'Date', 'Datum')}: ${date}`,
      `${t(locale, 'Kind', 'Typ')}: ${input.kind}`,
      input.assignmentId ? `${t(locale, 'Assignment', 'Tilldelning')}: ${input.assignmentId}` : null,
      input.durationMinutes != null ? `${t(locale, 'Duration', 'Duration')}: ${input.durationMinutes} min` : null,
      input.distanceKm != null ? `${t(locale, 'Distance', 'Distans')}: ${input.distanceKm} km` : null,
      input.rpe != null ? `RPE: ${input.rpe}/10` : null,
      input.avgHeartRate != null ? `${t(locale, 'Average HR', 'Snittpuls')}: ${input.avgHeartRate} bpm` : null,
    ]),
    confirmLabel: t(locale, 'Complete workout', 'Slutför pass'),
  }
}

export function buildAthleteLiveVoiceActionPreview(
  toolName: AthleteLiveVoiceActionDraftToolName,
  input: unknown,
  locale: AppLocale
): ActionPreview {
  switch (toolName) {
    case CREATE_CARDIO_WORKOUT_TOOL_NAME:
      return buildCreateCardioWorkoutPreview(input as CreateCardioWorkoutInput, locale)
    case LOG_COMPLETED_WORKOUT_TOOL_NAME:
      return buildLogCompletedWorkoutPreview(input as LogCompletedWorkoutInput, locale)
    case COMPLETE_ASSIGNED_WORKOUT_TOOL_NAME:
      return buildCompleteAssignedWorkoutPreview(input as CompleteAssignedWorkoutInput, locale)
  }
}

function logCompletedWorkoutRealtimeTool(locale: AppLocale): RealtimeFunctionTool {
  return {
    type: 'function',
    name: LOG_COMPLETED_WORKOUT_TOOL_NAME,
    description: t(
      locale,
      'Prepare a confirmation card to log a workout the athlete already completed outside the plan. Do not use for planned sessions; use completeAssignedWorkout for those. The athlete must confirm the card.',
      'Förbered ett bekräftelsekort för att logga ett pass atleten redan gjort utanför planen. Använd inte för planerade pass; använd completeAssignedWorkout för dem. Atleten måste bekräfta kortet.'
    ),
    parameters: {
      type: 'object',
      properties: {
        date: { type: 'string', description: t(locale, 'Workout date YYYY-MM-DD. Use today when appropriate.', 'Passdatum YYYY-MM-DD. Använd idag när det passar.') },
        name: { type: 'string' },
        workoutType: { type: 'string', enum: ['CARDIO', 'STRENGTH', 'HYBRID', 'MIXED'] },
        sport: {
          type: 'string',
          enum: [
            'RUNNING', 'CYCLING', 'SKIING', 'SWIMMING', 'TRIATHLON', 'HYROX',
            'GENERAL_FITNESS', 'FUNCTIONAL_FITNESS', 'STRENGTH',
            'TEAM_FOOTBALL', 'TEAM_ICE_HOCKEY', 'TEAM_HANDBALL', 'TEAM_FLOORBALL',
            'TEAM_BASKETBALL', 'TEAM_VOLLEYBALL', 'TENNIS', 'PADEL',
          ],
        },
        intensity: { type: 'string', enum: ['RECOVERY', 'EASY', 'MODERATE', 'THRESHOLD', 'INTERVAL', 'MAX'] },
        durationMinutes: { type: 'integer', minimum: 1, maximum: 600 },
        distanceKm: { type: 'number', minimum: 0, maximum: 500 },
        avgHeartRate: { type: 'integer', minimum: 40, maximum: 230 },
        maxHeartRate: { type: 'integer', minimum: 40, maximum: 250 },
        perceivedEffort: { type: 'integer', minimum: 1, maximum: 10 },
        notes: { type: 'string' },
      },
      required: ['workoutType', 'durationMinutes'],
    },
  }
}

function completeAssignedWorkoutRealtimeTool(locale: AppLocale): RealtimeFunctionTool {
  return {
    type: 'function',
    name: COMPLETE_ASSIGNED_WORKOUT_TOOL_NAME,
    description: t(
      locale,
      'Prepare a confirmation card to mark a planned/assigned workout as completed. Ask for RPE or actual duration first. The athlete must confirm the card before anything changes.',
      'Förbered ett bekräftelsekort för att markera ett planerat/tilldelat pass som genomfört. Fråga efter RPE eller faktisk duration först. Atleten måste bekräfta kortet innan något ändras.'
    ),
    parameters: {
      type: 'object',
      properties: {
        kind: { type: 'string', enum: ['STRENGTH', 'CARDIO', 'WOD'] },
        assignmentId: { type: 'string' },
        date: { type: 'string', description: t(locale, 'Assigned date YYYY-MM-DD. Default today.', 'Tilldelningsdatum YYYY-MM-DD. Standard idag.') },
        rpe: { type: 'integer', minimum: 1, maximum: 10 },
        durationMinutes: { type: 'integer', minimum: 1, maximum: 600 },
        distanceKm: { type: 'number', minimum: 0, maximum: 500 },
        avgHeartRate: { type: 'integer', minimum: 40, maximum: 230 },
        notes: { type: 'string' },
      },
      required: ['kind'],
    },
  }
}

function openTodayWorkoutRealtimeTool(locale: AppLocale): RealtimeFunctionTool {
  return {
    type: 'function',
    name: OPEN_TODAY_WORKOUT_TOOL_NAME,
    description: t(
      locale,
      'Open the athlete view for one planned workout on a date, usually today. If several matching workouts exist, return candidates so you can ask which one.',
      'Öppna atletvyn för ett planerat pass på ett datum, oftast idag. Om flera pass matchar returneras kandidater så att du kan fråga vilket.'
    ),
    parameters: {
      type: 'object',
      properties: {
        date: { type: 'string', description: t(locale, 'Date YYYY-MM-DD. Use today from the instructions when the athlete says today.', 'Datum YYYY-MM-DD. Använd dagens datum från instruktionerna när atleten säger idag.') },
        kind: { type: 'string', enum: ['ANY', 'CARDIO', 'STRENGTH', 'WOD'] },
      },
    },
  }
}

function readinessBriefingRealtimeTool(locale: AppLocale): RealtimeFunctionTool {
  return {
    type: 'function',
    name: GET_READINESS_BRIEFING_TOOL_NAME,
    description: t(
      locale,
      'Fetch a concise readiness-aware training briefing: latest check-in, ACWR/load, active injuries, and today planned sessions. Read-only.',
      'Hämta en kort readiness-baserad träningsbrief: senaste check-in, ACWR/belastning, aktiva skador och dagens planerade pass. Endast läsning.'
    ),
    parameters: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'YYYY-MM-DD' },
      },
    },
  }
}

function workoutModificationRealtimeTool(locale: AppLocale): RealtimeFunctionTool {
  return {
    type: 'function',
    name: PROPOSE_WORKOUT_MODIFICATION_TOOL_NAME,
    description: t(
      locale,
      'Suggest a safe modification to today planned workout based on readiness and the athlete request. Read-only: do not claim anything was changed.',
      'Föreslå en säker justering av dagens planerade pass baserat på readiness och atletens önskemål. Endast läsning: påstå inte att något ändrats.'
    ),
    parameters: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'YYYY-MM-DD' },
        goal: { type: 'string', enum: ['EASIER', 'HARDER', 'SHORTER', 'SWAP_TO_BIKE', 'RECOVERY', 'OTHER'] },
        request: { type: 'string' },
        minutesAvailable: { type: 'integer', minimum: 5, maximum: 240 },
      },
    },
  }
}

function quickErgMatchRealtimeTool(locale: AppLocale): RealtimeFunctionTool {
  return {
    type: 'function',
    name: GET_QUICK_ERG_MATCH_SUGGESTIONS_TOOL_NAME,
    description: t(
      locale,
      'Find likely matches between recent Quick Erg/Wattbike recordings and planned cardio sessions. Read-only and opens the review screen; it does not match automatically.',
      'Hitta troliga matchningar mellan nyliga Quick Erg-/Wattbike-pass och planerade konditionspass. Endast läsning och öppnar granskningsvyn; matchar inte automatiskt.'
    ),
    parameters: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'YYYY-MM-DD' },
        limit: { type: 'integer', minimum: 1, maximum: 5 },
      },
    },
  }
}

export function buildAthleteLiveVoiceRealtimeTools(locale: AppLocale): RealtimeFunctionTool[] {
  return [
    openTodayWorkoutRealtimeTool(locale),
    readinessBriefingRealtimeTool(locale),
    workoutModificationRealtimeTool(locale),
    quickErgMatchRealtimeTool(locale),
    buildCreateCardioWorkoutRealtimeTool(locale),
    logCompletedWorkoutRealtimeTool(locale),
    completeAssignedWorkoutRealtimeTool(locale),
  ]
}

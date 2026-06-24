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
import {
  buildUpdateLiveWorkoutFeedbackPreview,
  updateLiveWorkoutFeedbackInputSchema,
  type UpdateLiveWorkoutFeedbackInput,
} from '@/lib/ai/athlete-live-workout-feedback'

export { stockholmDateKey } from '@/lib/ai/cardio-workout-action'

export const OPEN_TODAY_WORKOUT_TOOL_NAME = 'openTodayWorkout'
export const GET_READINESS_BRIEFING_TOOL_NAME = 'getReadinessBriefing'
export const PROPOSE_WORKOUT_MODIFICATION_TOOL_NAME = 'proposeWorkoutModification'
export const GET_QUICK_ERG_MATCH_SUGGESTIONS_TOOL_NAME = 'getQuickErgMatchSuggestions'
export const LOG_COMPLETED_WORKOUT_TOOL_NAME = 'logCompletedWorkout'
export const COMPLETE_ASSIGNED_WORKOUT_TOOL_NAME = 'completeAssignedWorkout'
export const UPDATE_LIVE_WORKOUT_FEEDBACK_TOOL_NAME = 'updateLiveWorkoutFeedback'
// Performance Meal Guide voice tools. The action-draft names MUST match the
// capability registry ids so confirm runs createChatTools[id].execute.
export const GET_FUELING_BRIEFING_TOOL_NAME = 'getFuelingBriefing'
export const FIT_FOODS_TO_MEAL_TOOL_NAME = 'fitFoodsToMeal'
export const LOG_PLANNED_MEAL_TOOL_NAME = 'logPlannedMeal'
export const REGENERATE_PERFORMANCE_GUIDE_TOOL_NAME = 'regeneratePerformanceGuide'

const VOICE_MEAL_TYPES = [
  'BREAKFAST', 'MORNING_SNACK', 'LUNCH', 'AFTERNOON_SNACK',
  'PRE_WORKOUT', 'POST_WORKOUT', 'DINNER', 'EVENING_SNACK',
] as const

export const ATHLETE_LIVE_VOICE_ACTION_DRAFT_TOOL_NAMES = [
  CREATE_CARDIO_WORKOUT_TOOL_NAME,
  LOG_COMPLETED_WORKOUT_TOOL_NAME,
  COMPLETE_ASSIGNED_WORKOUT_TOOL_NAME,
  UPDATE_LIVE_WORKOUT_FEEDBACK_TOOL_NAME,
  LOG_PLANNED_MEAL_TOOL_NAME,
  REGENERATE_PERFORMANCE_GUIDE_TOOL_NAME,
] as const

export const ATHLETE_LIVE_VOICE_DIRECT_TOOL_NAMES = [
  OPEN_TODAY_WORKOUT_TOOL_NAME,
  GET_READINESS_BRIEFING_TOOL_NAME,
  PROPOSE_WORKOUT_MODIFICATION_TOOL_NAME,
  GET_QUICK_ERG_MATCH_SUGGESTIONS_TOOL_NAME,
  GET_FUELING_BRIEFING_TOOL_NAME,
  FIT_FOODS_TO_MEAL_TOOL_NAME,
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

export const getFuelingBriefingInputSchema = z.object({
  date: z.string().optional(),
})

export const fitFoodsToMealVoiceInputSchema = z.object({
  foods: z.string().min(2).max(300),
  mealType: z.enum(VOICE_MEAL_TYPES).optional(),
  date: z.string().optional(),
})

export const logPlannedMealInputSchema = z.object({
  mealType: z.enum(VOICE_MEAL_TYPES),
  date: z.string().optional(),
})

export const regeneratePerformanceGuideInputSchema = z.object({
  startDate: z.string().optional(),
})

export type LogCompletedWorkoutInput = z.infer<typeof logCompletedWorkoutInputSchema>
export type CompleteAssignedWorkoutInput = z.infer<typeof completeAssignedWorkoutInputSchema>
export type AthleteLiveWorkoutFeedbackInput = UpdateLiveWorkoutFeedbackInput
export type OpenTodayWorkoutInput = z.infer<typeof openTodayWorkoutInputSchema>
export type GetReadinessBriefingInput = z.infer<typeof getReadinessBriefingInputSchema>
export type ProposeWorkoutModificationInput = z.infer<typeof proposeWorkoutModificationInputSchema>
export type GetQuickErgMatchSuggestionsInput = z.infer<typeof getQuickErgMatchSuggestionsInputSchema>
export type GetFuelingBriefingInput = z.infer<typeof getFuelingBriefingInputSchema>
export type FitFoodsToMealVoiceInput = z.infer<typeof fitFoodsToMealVoiceInputSchema>
export type LogPlannedMealInput = z.infer<typeof logPlannedMealInputSchema>
export type RegeneratePerformanceGuideInput = z.infer<typeof regeneratePerformanceGuideInputSchema>

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
    case UPDATE_LIVE_WORKOUT_FEEDBACK_TOOL_NAME:
      return updateLiveWorkoutFeedbackInputSchema
    case LOG_PLANNED_MEAL_TOOL_NAME:
      return logPlannedMealInputSchema
    case REGENERATE_PERFORMANCE_GUIDE_TOOL_NAME:
      return regeneratePerformanceGuideInputSchema
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
    case GET_FUELING_BRIEFING_TOOL_NAME:
      return getFuelingBriefingInputSchema
    case FIT_FOODS_TO_MEAL_TOOL_NAME:
      return fitFoodsToMealVoiceInputSchema
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

  if (toolName === UPDATE_LIVE_WORKOUT_FEEDBACK_TOOL_NAME) {
    const feedback = input as UpdateLiveWorkoutFeedbackInput
    if (
      feedback.rpe == null &&
      !feedback.note &&
      feedback.painLevel == null &&
      !feedback.painBodyPart &&
      !feedback.targetAdjustment
    ) {
      return t(locale, 'Ask what feedback to save before preparing the card.', 'Fråga vilken feedback som ska sparas innan du förbereder kortet.')
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

export function buildLogPlannedMealPreview(input: LogPlannedMealInput, locale: AppLocale): ActionPreview {
  const date = dateOrToday(input.date)
  return {
    title: t(locale, 'Log planned meal', 'Logga planerad måltid'),
    description: t(
      locale,
      'Log this planned meal as eaten, using the planned macros from the meal guide.',
      'Logga den här planerade måltiden som ätet, med de planerade makrona från måltidsguiden.'
    ),
    targetLabel: input.mealType,
    details: detailsFrom([
      `${t(locale, 'Date', 'Datum')}: ${date}`,
      `${t(locale, 'Meal', 'Måltid')}: ${input.mealType}`,
    ]),
    confirmLabel: t(locale, 'Log meal', 'Logga måltid'),
  }
}

export function buildRegeneratePerformanceGuidePreview(input: RegeneratePerformanceGuideInput, locale: AppLocale): ActionPreview {
  const date = dateOrToday(input.startDate)
  return {
    title: t(locale, 'Regenerate meal guide', 'Generera om måltidsguide'),
    description: t(
      locale,
      'Rebuild the Performance Meal Guide for the week. This replaces the current planned meals and recipes.',
      'Bygg om Måltidsguiden för prestation för veckan. Detta ersätter de nuvarande planerade måltiderna och recepten.'
    ),
    targetLabel: date,
    details: detailsFrom([`${t(locale, 'Week start', 'Veckostart')}: ${date}`]),
    confirmLabel: t(locale, 'Regenerate guide', 'Generera om guide'),
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
    case UPDATE_LIVE_WORKOUT_FEEDBACK_TOOL_NAME:
      return buildUpdateLiveWorkoutFeedbackPreview(input as UpdateLiveWorkoutFeedbackInput, locale)
    case LOG_PLANNED_MEAL_TOOL_NAME:
      return buildLogPlannedMealPreview(input as LogPlannedMealInput, locale)
    case REGENERATE_PERFORMANCE_GUIDE_TOOL_NAME:
      return buildRegeneratePerformanceGuidePreview(input as RegeneratePerformanceGuideInput, locale)
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

function updateLiveWorkoutFeedbackRealtimeTool(locale: AppLocale): RealtimeFunctionTool {
  return {
    type: 'function',
    name: UPDATE_LIVE_WORKOUT_FEEDBACK_TOOL_NAME,
    description: t(
      locale,
      'Prepare a confirmation card to save feedback on the current live cardio/erg workout: RPE, hard/easy note, pain note, or target-adjustment note. The athlete must confirm the card before anything changes.',
      'Förbered ett bekräftelsekort för att spara feedback på aktuellt live konditions-/ergometerpass: RPE, hårt/lätt-notering, smärtnotering eller måljustering. Atleten måste bekräfta kortet innan något ändras.'
    ),
    parameters: {
      type: 'object',
      properties: {
        assignmentId: { type: 'string' },
        sessionLogId: { type: 'string' },
        date: { type: 'string', description: t(locale, 'Workout date YYYY-MM-DD. Default today.', 'Passdatum YYYY-MM-DD. Standard idag.') },
        rpe: { type: 'integer', minimum: 1, maximum: 10 },
        note: { type: 'string' },
        painLevel: { type: 'integer', minimum: 0, maximum: 10 },
        painBodyPart: { type: 'string' },
        targetAdjustment: { type: 'string', description: t(locale, 'Example: increase target by 10 W, hold 90 rpm, make next interval easier.', 'Exempel: höj målet med 10 W, håll 90 rpm, gör nästa intervall lättare.') },
      },
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

function fuelingBriefingRealtimeTool(locale: AppLocale): RealtimeFunctionTool {
  return {
    type: 'function',
    name: GET_FUELING_BRIEFING_TOOL_NAME,
    description: t(
      locale,
      "Summarize how the athlete is fueling today against the Performance Meal Guide: planned vs eaten calories/macros, % of target, what's left, and which planned meals are still un-logged. Read-only.",
      'Sammanfatta hur atleten fyller på idag jämfört med Måltidsguiden: planerat vs ätet i kalorier/makros, andel av målet, vad som är kvar och vilka planerade måltider som ännu inte loggats. Endast läsning.'
    ),
    parameters: {
      type: 'object',
      properties: { date: { type: 'string', description: 'YYYY-MM-DD' } },
    },
  }
}

function fitFoodsToMealRealtimeTool(locale: AppLocale): RealtimeFunctionTool {
  return {
    type: 'function',
    name: FIT_FOODS_TO_MEAL_TOOL_NAME,
    description: t(
      locale,
      "Work out how much of each food to eat to hit a planned meal's target. Use when the athlete names foods for a meal and asks how much. Read-only — does not log.",
      "Räkna ut hur mycket av varje livsmedel atleten ska äta för att träffa en planerad måltids mål. Använd när atleten nämner livsmedel och frågar hur mycket. Endast läsning — loggar inget."
    ),
    parameters: {
      type: 'object',
      properties: {
        foods: { type: 'string', description: t(locale, 'Foods as free text, e.g. "yoghurt, banana".', 'Livsmedel som fritext, t.ex. "yoghurt, banan".') },
        mealType: { type: 'string', enum: [...VOICE_MEAL_TYPES] },
        date: { type: 'string', description: 'YYYY-MM-DD' },
      },
      required: ['foods'],
    },
  }
}

function logPlannedMealRealtimeTool(locale: AppLocale): RealtimeFunctionTool {
  return {
    type: 'function',
    name: LOG_PLANNED_MEAL_TOOL_NAME,
    description: t(
      locale,
      'Prepare a confirmation card to log a planned meal from the meal guide as eaten (planned macros). Use only when the athlete ate exactly the planned meal. The athlete must confirm.',
      'Förbered ett bekräftelsekort för att logga en planerad måltid från måltidsguiden som ätet (planerade makros). Använd bara när atleten åt exakt den planerade måltiden. Atleten måste bekräfta.'
    ),
    parameters: {
      type: 'object',
      properties: {
        mealType: { type: 'string', enum: [...VOICE_MEAL_TYPES] },
        date: { type: 'string', description: 'YYYY-MM-DD' },
      },
      required: ['mealType'],
    },
  }
}

function regeneratePerformanceGuideRealtimeTool(locale: AppLocale): RealtimeFunctionTool {
  return {
    type: 'function',
    name: REGENERATE_PERFORMANCE_GUIDE_TOOL_NAME,
    description: t(
      locale,
      'Prepare a confirmation card to rebuild the Performance Meal Guide for the week. Use only when the athlete asks for a fresh/new guide. Replaces the current guide. The athlete must confirm.',
      'Förbered ett bekräftelsekort för att bygga om Måltidsguiden för veckan. Använd bara när atleten ber om en ny/fräsch guide. Ersätter nuvarande guide. Atleten måste bekräfta.'
    ),
    parameters: {
      type: 'object',
      properties: { startDate: { type: 'string', description: 'YYYY-MM-DD' } },
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
    updateLiveWorkoutFeedbackRealtimeTool(locale),
    fuelingBriefingRealtimeTool(locale),
    fitFoodsToMealRealtimeTool(locale),
    logPlannedMealRealtimeTool(locale),
    regeneratePerformanceGuideRealtimeTool(locale),
  ]
}

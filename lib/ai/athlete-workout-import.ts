import 'server-only'

import type { AIActionDraft, Prisma } from '@prisma/client'
import {
  AIProvider,
  HybridFormat,
  ScalingLevel,
  SportType,
  StrengthPhase,
  WorkoutType,
} from '@prisma/client'
import { generateText } from 'ai'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { createModelInstance, generationTuning } from '@/lib/ai/create-model'
import { withAiContext } from '@/lib/ai/usage-logger'
import {
  extractResolvableNames,
  importTypeNeedsResolution,
  parseAIWorkout,
  systemPromptForType,
  WorkoutImportSchema,
  type ParsedCardioWorkout,
  type ParsedHybridWorkout,
  type ParsedStrengthWorkout,
  type ParsedWorkoutImport,
} from '@/lib/ai/workout-parser'
import {
  normalizeText,
  type NormalizedInput,
} from '@/lib/ai/file-normalize'
import {
  resolveExercises,
  type Resolution,
} from '@/lib/ai/exercise-resolver'
import { isStrengthStudioExerciseNameCandidate } from '@/lib/strength/exercise-library-filters'
import { getStrengthStudioExerciseWhereInput } from '@/lib/strength/exercise-library-surface'
import {
  toCardioSessionData,
  toHybridBuilderInitialData,
  toStrengthSessionData,
} from '@/components/workouts/import/converters'
import {
  resolveExtractionModel,
  type AIProvider as LowerAIProvider,
  type AvailableKeys,
  type ModelIntent,
  type ResolvedModel,
} from '@/types/ai-models'
import type {
  ImportedWorkoutParsedPreview,
  ImportedWorkoutType,
} from '@/lib/ai/imported-workout-types'

type AppLocale = 'en' | 'sv'

const AUTO_ASSIGN_THRESHOLD = 0.95
const LONG_TEXT_POWERFUL_THRESHOLD = 8_000
const DEFAULT_WORKOUT_TYPE: ImportedWorkoutType = 'CARDIO'

const ImportedWorkoutTypeSchema = z.enum(['STRENGTH', 'CARDIO', 'HYBRID'])

const DateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

const ImportedWorkoutEditableFieldsSchema = z.object({
  assignedDate: DateOnlySchema.optional(),
  name: z.string().min(1).max(140).optional(),
  workoutType: ImportedWorkoutTypeSchema.optional(),
  notes: z.string().max(1200).optional(),
})

const ImportedWorkoutDraftInputSchema = z.object({
  version: z.literal(1),
  source: z.object({
    kind: z.enum(['text', 'excel', 'csv', 'pdf', 'image']),
    filename: z.string().nullable().optional(),
  }),
  workoutType: ImportedWorkoutTypeSchema,
  assignedDate: DateOnlySchema,
  name: z.string().min(1).max(160),
  notes: z.string().nullable().optional(),
  parsedWorkout: WorkoutImportSchema.refine(
    (workout) => workout.workoutType !== 'AGILITY',
    'Agility imports are not supported in athlete chat v1.'
  ),
  mappings: z.record(z.string()).default({}),
  candidateLookup: z.record(z.string()).default({}),
  warnings: z.array(z.string()).default([]),
  modelUsed: z.string(),
  inputKind: z.enum(['text', 'excel', 'csv', 'pdf', 'image']),
})

export type ImportedWorkoutDraftInput = z.infer<typeof ImportedWorkoutDraftInputSchema>

interface ParseImportedWorkoutParams {
  normalized: NormalizedInput
  note?: string | null
  assignedDate?: string | null
  locale: AppLocale
  userId: string
  clientId: string
  ownerUserId: string
  keys: AvailableKeys
}

type ParseImportedWorkoutResult =
  | {
      success: true
      draftInput: ImportedWorkoutDraftInput
      preview: ImportedWorkoutParsedPreview
      actionPreview: {
        title: string
        description: string
        targetLabel?: string
        body?: string | null
        details: string[]
        confirmLabel?: string
      }
      warnings: string[]
      modelUsed: string
      inputKind: NormalizedInput['kind']
    }
  | {
      success: false
      status: number
      error: string
      needsClarification?: boolean
    }

interface ClassificationResult {
  workoutType: ImportedWorkoutType | 'UNSUPPORTED'
  confidence: number
  reason?: string
  assignedDate?: string | null
  warnings: string[]
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue
}

function optionalJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value == null) return undefined
  return toJson(value)
}

export function stockholmDateKey(date = new Date()): string {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Stockholm',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function parseDateOnly(value: string): Date {
  const parsed = new Date(`${value}T12:00:00.000Z`)
  return Number.isNaN(parsed.getTime()) ? new Date(`${stockholmDateKey()}T12:00:00.000Z`) : parsed
}

function chooseIntent(input: NormalizedInput): ModelIntent {
  if (input.kind !== 'text') return 'powerful'
  return input.body.length > LONG_TEXT_POWERFUL_THRESHOLD ? 'powerful' : 'balanced'
}

function resolveImportModel(keys: AvailableKeys, input: NormalizedInput): {
  intent: ModelIntent
  resolved: ResolvedModel | null
} {
  const intent = chooseIntent(input)
  return {
    intent,
    resolved: resolveExtractionModel(keys, intent),
  }
}

function extractJsonObject(text: string): unknown | null {
  const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const candidate = codeBlock?.[1] || text.match(/\{[\s\S]*\}/)?.[0]
  if (!candidate) return null
  try {
    return JSON.parse(candidate.trim())
  } catch {
    return null
  }
}

function normalizeClassification(value: unknown): ClassificationResult | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const record = value as Record<string, unknown>
  const rawType = typeof record.workoutType === 'string' ? record.workoutType.toUpperCase() : ''
  const workoutType = rawType === 'STRENGTH' || rawType === 'CARDIO' || rawType === 'HYBRID'
    ? rawType
    : rawType === 'UNSUPPORTED'
      ? 'UNSUPPORTED'
      : null
  if (!workoutType) return null
  const assignedDate = typeof record.assignedDate === 'string' && DateOnlySchema.safeParse(record.assignedDate).success
    ? record.assignedDate
    : null
  const warnings = Array.isArray(record.warnings)
    ? record.warnings.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : []
  return {
    workoutType,
    confidence: typeof record.confidence === 'number' ? record.confidence : 0.5,
    reason: typeof record.reason === 'string' ? record.reason : undefined,
    assignedDate,
    warnings,
  }
}

function buildClassificationPrompt(input: NormalizedInput, note: string | null | undefined, locale: AppLocale): string {
  const today = stockholmDateKey()
  const source = input.kind === 'image'
    ? `The source is an uploaded image/screenshot named ${input.filename || 'upload'}.`
    : `Source text:\n"""\n${input.body}\n"""`
  const noteBlock = note?.trim()
    ? `\nAthlete note:\n"""\n${note.trim()}\n"""\n`
    : ''

  return `Today in Europe/Stockholm is ${today}.

Classify this single workout import source for an athlete app.

Return STRICT JSON only:
{
  "workoutType": "STRENGTH" | "CARDIO" | "HYBRID" | "UNSUPPORTED",
  "confidence": number,
  "reason": string,
  "assignedDate": "YYYY-MM-DD" | null,
  "warnings": string[]
}

Rules:
- STRENGTH = gym/strength session with sets, reps, lifts, warmup, core, prehab.
- CARDIO = running, cycling, skiing, swimming, rowing, ergometer, intervals, endurance.
- HYBRID = CrossFit, HYROX, functional fitness, WOD, mixed conditioning with movements.
- UNSUPPORTED = agility/drill-only, nutrition, mobility-only, a multi-week plan, a completed log, unclear content, or not a workout.
- If the source contains multiple workouts, choose the first or clearest single workout and add a warning.
- Set assignedDate only when the source or athlete note clearly states a date relative to today or as an explicit date. Otherwise null.
- Preserve Swedish/English context in reason and warnings.${locale === 'sv' ? '\n- Swedish text may appear; classify it normally.' : ''}

${source}
${noteBlock}`.trim()
}

function buildWorkoutPrompt(input: NormalizedInput, workoutType: ImportedWorkoutType, note: string | null | undefined): string {
  const header = `Workout type: ${workoutType}\nSource: ${input.kind}${input.filename ? ` (${input.filename})` : ''}`
  const noteBlock = note?.trim()
    ? `\n\nAthlete note:\n"""\n${note.trim()}\n"""`
    : ''
  const rules = '\n\nImport exactly one planned workout. If the source contains multiple workouts, extract the first or clearest workout only. Do not create a completed workout log.'
  const truncWarning = input.truncated
    ? '\n\nNOTE: Input was truncated at 200k chars. Use what is available.'
    : ''

  if (input.kind === 'image') {
    return (
      `${header}${rules}${noteBlock}\n\n` +
      `The user uploaded an image of a workout source: screenshot, whiteboard photo, spreadsheet screenshot, PDF page, or handwritten note. ` +
      `Read the image carefully, including tables, abbreviations, Swedish/English mixed text, and uncertain handwriting. ` +
      `List uncertainty in the top-level notes field.\n\nExtract the workout JSON now.`
    )
  }

  return `${header}${rules}${truncWarning}${noteBlock}\n\nInput:\n"""\n${input.body}\n"""\n\nExtract the workout JSON now.`
}

async function callGenerateText(params: {
  resolved: ResolvedModel
  input: NormalizedInput
  system?: string
  prompt: string
  maxOutputTokens: number
  userId: string
  clientId: string
  category: string
  temperature?: number
}) {
  const model = createModelInstance(params.resolved)
  const tuning = generationTuning(params.resolved.modelId, { temperature: params.temperature ?? 0.1 })
  return withAiContext(
    {
      userId: params.userId,
      clientId: params.clientId,
      category: params.category,
    },
    () =>
      params.input.kind === 'image' && params.input.imageBuffer
        ? generateText({
            model,
            system: params.system,
            messages: [
              {
                role: 'user',
                content: [
                  { type: 'text', text: params.prompt },
                  {
                    type: 'image',
                    image: params.input.imageBuffer,
                    mediaType: params.input.imageMimeType || 'image/png',
                  },
                ],
              },
            ],
            ...tuning,
            maxOutputTokens: params.maxOutputTokens,
          })
        : generateText({
            model,
            system: params.system,
            prompt: params.prompt,
            ...tuning,
            maxOutputTokens: params.maxOutputTokens,
          })
  )
}

async function classifyImportedWorkout(params: {
  input: NormalizedInput
  note?: string | null
  locale: AppLocale
  userId: string
  clientId: string
  resolved: ResolvedModel
}): Promise<ClassificationResult | null> {
  const prompt = buildClassificationPrompt(params.input, params.note, params.locale)
  const result = await callGenerateText({
    resolved: params.resolved,
    input: params.input,
    prompt,
    maxOutputTokens: 800,
    userId: params.userId,
    clientId: params.clientId,
    category: 'athlete_chat_workout_import_classify',
    temperature: 0,
  })
  const json = extractJsonObject(result.text)
  return normalizeClassification(json)
}

function mappingsFromResolutions(resolutions: Resolution[]): {
  mappings: Record<string, string>
  candidateLookup: Record<string, string>
} {
  const mappings: Record<string, string> = {}
  const candidateLookup: Record<string, string> = {}
  for (const resolution of resolutions) {
    if (resolution.bestMatch) {
      candidateLookup[resolution.name] = resolution.bestMatch.name
      if (resolution.bestMatch.score >= AUTO_ASSIGN_THRESHOLD) {
        mappings[resolution.name] = resolution.bestMatch.id
      }
    }
  }
  return { mappings, candidateLookup }
}

async function resolveParsedWorkoutExercises(
  workout: ParsedWorkoutImport,
  ownerUserId: string
): Promise<{ resolutions: Resolution[]; warnings: string[] }> {
  if (!importTypeNeedsResolution(workout.workoutType)) return { resolutions: [], warnings: [] }
  if (workout.workoutType === 'AGILITY') return { resolutions: [], warnings: [] }

  const names = workout.workoutType === 'STRENGTH'
    ? extractResolvableNames(workout).filter(isStrengthStudioExerciseNameCandidate)
    : extractResolvableNames(workout)

  if (names.length === 0) return { resolutions: [], warnings: [] }

  const result = await resolveExercises({
    names,
    aliasOwnerId: ownerUserId,
    accessWhere: workout.workoutType === 'STRENGTH'
      ? {
          AND: [
            { OR: [{ isPublic: true }, { coachId: ownerUserId }] },
            getStrengthStudioExerciseWhereInput(),
          ],
        }
      : {
          OR: [{ isPublic: true }, { coachId: ownerUserId }],
        },
  })

  return { resolutions: result.resolutions, warnings: [] }
}

function compactList(items: Array<string | null | undefined>, max = 5): string[] {
  return items
    .map((item) => item?.trim())
    .filter((item): item is string => Boolean(item))
    .slice(0, max)
}

function formatSeconds(seconds: number | undefined | null, locale: AppLocale): string | null {
  if (!seconds || seconds <= 0) return null
  if (seconds % 60 === 0) return `${seconds / 60} min`
  if (seconds < 60) return `${seconds} ${t(locale, 'sec', 'sek')}`
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  return `${minutes}:${String(remainder).padStart(2, '0')}`
}

function previewForParsedWorkout(params: {
  workout: ParsedStrengthWorkout | ParsedCardioWorkout | ParsedHybridWorkout
  source: Pick<NormalizedInput, 'kind' | 'filename'>
  assignedDate: string
  warnings: string[]
  locale: AppLocale
}): ImportedWorkoutParsedPreview {
  const { workout, source, assignedDate, warnings, locale } = params

  if (workout.workoutType === 'STRENGTH') {
    const sections = [
      workout.warmupData?.exercises?.length
        ? {
            label: t(locale, 'Warm-up', 'Uppvärmning'),
            items: compactList(workout.warmupData.exercises.map((e) => e.exerciseName), 4),
          }
        : null,
      {
        label: t(locale, 'Main', 'Huvuddel'),
        items: compactList(workout.exercises.map((e) => {
          const repText = [e.sets ? `${e.sets}x` : null, e.reps != null ? String(e.reps) : null].filter(Boolean).join('')
          return [e.exerciseName, repText || null].filter(Boolean).join(' · ')
        }), 6),
      },
      workout.coreData?.exercises?.length
        ? {
            label: t(locale, 'Core', 'Core'),
            items: compactList(workout.coreData.exercises.map((e) => e.exerciseName), 4),
          }
        : null,
    ].filter((section): section is { label: string; items: string[] } => Boolean(section && section.items.length))

    return {
      source: { kind: source.kind, filename: source.filename || null },
      workoutType: 'STRENGTH',
      name: workout.name,
      assignedDate,
      summary: t(
        locale,
        `${workout.exercises.length} main exercises${workout.estimatedDuration ? ` · ${workout.estimatedDuration} min` : ''}`,
        `${workout.exercises.length} huvudövningar${workout.estimatedDuration ? ` · ${workout.estimatedDuration} min` : ''}`
      ),
      notes: workout.notes || null,
      warnings,
      sections,
    }
  }

  if (workout.workoutType === 'CARDIO') {
    const sections = [{
      label: t(locale, 'Segments', 'Segment'),
      items: compactList(workout.segments.map((segment) => {
        if (segment.type === 'REPEAT_GROUP') {
          const stepSummary = segment.steps
            .map((step) => [step.type, formatSeconds(step.duration, locale), step.distance ? `${step.distance} m` : null].filter(Boolean).join(' '))
            .join(' / ')
          return `${segment.repeats}x ${stepSummary}`
        }
        return [
          segment.type,
          formatSeconds(segment.duration, locale),
          segment.distance ? `${segment.distance} m` : null,
          segment.pace,
          segment.zone ? `Z${segment.zone}` : null,
        ].filter(Boolean).join(' · ')
      }), 6),
    }]

    const total = [
      workout.totalDuration ? formatSeconds(workout.totalDuration, locale) : null,
      workout.totalDistance ? `${workout.totalDistance} m` : null,
    ].filter(Boolean).join(' · ')

    return {
      source: { kind: source.kind, filename: source.filename || null },
      workoutType: 'CARDIO',
      name: workout.name,
      assignedDate,
      summary: [workout.sport, total || null, `${workout.segments.length} ${t(locale, 'segments', 'segment')}`]
        .filter(Boolean)
        .join(' · '),
      notes: workout.notes || null,
      warnings,
      sections,
    }
  }

  const sections = [{
    label: t(locale, 'Movements', 'Rörelser'),
    items: compactList(workout.movements.map((movement) => {
      const quantity = [
        movement.reps != null ? `${movement.reps} reps` : null,
        movement.calories != null ? `${movement.calories} cal` : null,
        movement.distance != null ? `${movement.distance} m` : null,
        formatSeconds(movement.duration, locale),
      ].filter(Boolean).join(' · ')
      return [movement.exerciseName, quantity || null].filter(Boolean).join(' · ')
    }), 7),
  }]

  return {
    source: { kind: source.kind, filename: source.filename || null },
    workoutType: 'HYBRID',
    name: workout.name,
    assignedDate,
    summary: [
      workout.format,
      workout.totalRounds ? `${workout.totalRounds} ${t(locale, 'rounds', 'varv')}` : null,
      workout.totalMinutes ? `${workout.totalMinutes} min` : null,
      workout.timeCap ? `${t(locale, 'cap', 'cap')} ${formatSeconds(workout.timeCap, locale)}` : null,
    ].filter(Boolean).join(' · '),
    notes: workout.notes || null,
    warnings,
    sections,
  }
}

function buildActionPreview(preview: ImportedWorkoutParsedPreview, locale: AppLocale) {
  return {
    title: t(locale, 'Create imported workout', 'Skapa importerat pass'),
    description: t(
      locale,
      'Review the parsed workout before it is added as a planned session.',
      'Granska det tolkade passet innan det läggs till som planerat pass.'
    ),
    targetLabel: preview.name,
    body: preview.summary,
    details: [
      `${t(locale, 'Type', 'Typ')}: ${preview.workoutType}`,
      `${t(locale, 'Date', 'Datum')}: ${preview.assignedDate}`,
      `${t(locale, 'Source', 'Källa')}: ${preview.source.kind}${preview.source.filename ? ` · ${preview.source.filename}` : ''}`,
      ...preview.warnings.slice(0, 3).map((warning) => `${t(locale, 'Warning', 'Varning')}: ${warning}`),
    ],
    confirmLabel: t(locale, 'Create workout', 'Skapa pass'),
  }
}

export async function parseImportedWorkoutSource(
  params: ParseImportedWorkoutParams
): Promise<ParseImportedWorkoutResult> {
  const { normalized, note, locale, userId, clientId, ownerUserId, keys } = params
  const { resolved } = resolveImportModel(keys, normalized)

  if (!resolved) {
    return {
      success: false,
      status: 400,
      error: t(
        locale,
        'No AI provider is available for workout import.',
        'Ingen AI-leverantör är tillgänglig för träningsimport.'
      ),
    }
  }

  if (normalized.kind === 'image' && !resolved.supportsVision) {
    return {
      success: false,
      status: 400,
      error: t(
        locale,
        'The selected AI model cannot read images. Ask your coach to enable a vision-capable model.',
        'Den valda AI-modellen kan inte läsa bilder. Be din coach aktivera en modell med bildstöd.'
      ),
    }
  }

  const warnings: string[] = []
  if (normalized.truncated) {
    warnings.push(t(
      locale,
      'The source was truncated before parsing; review the result carefully.',
      'Källan kortades innan tolkning; granska resultatet noggrant.'
    ))
  }

  const classification = await classifyImportedWorkout({
    input: normalized,
    note,
    locale,
    userId,
    clientId,
    resolved,
  })

  if (!classification || classification.workoutType === 'UNSUPPORTED') {
    return {
      success: false,
      status: 422,
      needsClarification: true,
      error: classification?.reason || t(
        locale,
        'I could not identify one supported planned workout in that source. Try adding a short note like "this is a running interval workout for tomorrow".',
        'Jag kunde inte identifiera ett stött planerat pass i källan. Lägg gärna till en kort notis, t.ex. "det här är löpintervaller för imorgon".'
      ),
    }
  }

  warnings.push(...classification.warnings)
  if (classification.confidence < 0.55) {
    warnings.push(t(
      locale,
      'The workout type was uncertain. Review the parsed workout before creating it.',
      'Passtypen var osäker. Granska tolkningen innan du skapar passet.'
    ))
  }

  const workoutType = classification.workoutType
  const prompt = buildWorkoutPrompt(normalized, workoutType, note)
  const aiOutput = await callGenerateText({
    resolved,
    input: normalized,
    system: systemPromptForType(workoutType),
    prompt,
    maxOutputTokens: resolved.provider === 'anthropic' && resolved.modelId.startsWith('claude-opus-4-')
      ? 64_000
      : 16_000,
    userId,
    clientId,
    category: 'athlete_chat_workout_import_parse',
    temperature: 0.1,
  })

  if (aiOutput.finishReason === 'length') {
    warnings.push(t(
      locale,
      'The AI response was cut off. Try a smaller source if anything looks missing.',
      'AI-svaret kapades. Testa en mindre källa om något verkar saknas.'
    ))
  }

  const parsed = parseAIWorkout(aiOutput.text, workoutType, locale)
  if (!parsed.success) {
    logger.info('Athlete workout import parse failed validation', {
      clientId,
      workoutType,
      model: resolved.displayName,
      error: parsed.error,
      excerpt: aiOutput.text.slice(0, 500),
    })
    return {
      success: false,
      status: 422,
      needsClarification: true,
      error: t(
        locale,
        'I could not turn that source into a clean workout. Try a clearer screenshot, a smaller file, or add a short note with the workout type.',
        'Jag kunde inte göra om källan till ett tydligt pass. Testa en tydligare skärmbild, en mindre fil eller lägg till en kort notis med passtyp.'
      ),
    }
  }

  let resolutions: Resolution[] = []
  try {
    const resolutionResult = await resolveParsedWorkoutExercises(parsed.workout, ownerUserId)
    resolutions = resolutionResult.resolutions
    warnings.push(...resolutionResult.warnings)
  } catch (error) {
    logger.warn('Exercise resolution failed for athlete workout import', { clientId, workoutType }, error)
    warnings.push(t(
      locale,
      'Exercise matching was unavailable. Unmatched hybrid movements will be saved as private custom exercises.',
      'Övningsmatchning var inte tillgänglig. Omatchade hybridrörelser sparas som privata egna övningar.'
    ))
  }

  const { mappings, candidateLookup } = mappingsFromResolutions(resolutions)
  const assignedDate = params.assignedDate && DateOnlySchema.safeParse(params.assignedDate).success
    ? params.assignedDate
    : classification.assignedDate || stockholmDateKey()
  const preview = previewForParsedWorkout({
    workout: parsed.workout as ParsedStrengthWorkout | ParsedCardioWorkout | ParsedHybridWorkout,
    source: normalized,
    assignedDate,
    warnings,
    locale,
  })
  const draftInput: ImportedWorkoutDraftInput = {
    version: 1,
    source: {
      kind: normalized.kind,
      filename: normalized.filename || null,
    },
    workoutType,
    assignedDate,
    name: parsed.workout.name,
    notes: note?.trim() || null,
    parsedWorkout: parsed.workout,
    mappings,
    candidateLookup,
    warnings,
    modelUsed: resolved.displayName,
    inputKind: normalized.kind,
  }

  return {
    success: true,
    draftInput,
    preview,
    actionPreview: buildActionPreview(preview, locale),
    warnings,
    modelUsed: resolved.displayName,
    inputKind: normalized.kind,
  }
}

export function mergeImportedWorkoutDraftInput(
  rawInput: unknown,
  rawOverride: unknown,
  locale: AppLocale = 'en'
): { success: true; input: ImportedWorkoutDraftInput } | { success: false; error: string } {
  const parsedInput = ImportedWorkoutDraftInputSchema.safeParse(rawInput)
  if (!parsedInput.success) {
    return {
      success: false,
      error: t(locale, 'The imported workout draft is no longer valid.', 'Det importerade passutkastet är inte längre giltigt.'),
    }
  }

  if (rawOverride == null) return { success: true, input: parsedInput.data }

  const parsedOverride = ImportedWorkoutEditableFieldsSchema.safeParse(rawOverride)
  if (!parsedOverride.success) {
    return {
      success: false,
      error: t(locale, 'The edits were not valid.', 'Ändringarna var inte giltiga.'),
    }
  }

  const edits = parsedOverride.data
  return {
    success: true,
    input: {
      ...parsedInput.data,
      assignedDate: edits.assignedDate || parsedInput.data.assignedDate,
      name: edits.name?.trim() || parsedInput.data.name,
      workoutType: edits.workoutType || parsedInput.data.workoutType,
      notes: edits.notes?.trim() ?? parsedInput.data.notes ?? null,
    },
  }
}

function withEditedName<T extends ParsedStrengthWorkout | ParsedCardioWorkout | ParsedHybridWorkout>(
  workout: T,
  input: ImportedWorkoutDraftInput
): T {
  return {
    ...workout,
    name: input.name,
    notes: [workout.notes, input.notes].filter(Boolean).join('\n\n') || workout.notes,
  } as T
}

function withImportTag(tags: string[] | undefined): string[] {
  return Array.from(new Set([...(tags || []), 'ai-chat-import']))
}

function buildAssignmentNotes(input: ImportedWorkoutDraftInput, locale: AppLocale): string {
  const source = `${input.source.kind}${input.source.filename ? `: ${input.source.filename}` : ''}`
  const trace = t(locale, `Imported via AI chat from ${source}.`, `Importerat via AI-chatten från ${source}.`)
  return [input.notes?.trim(), trace].filter(Boolean).join('\n\n')
}

function coerceStrengthPhase(value: string | undefined): StrengthPhase {
  if (value && Object.values(StrengthPhase).includes(value as StrengthPhase)) return value as StrengthPhase
  return StrengthPhase.MAXIMUM_STRENGTH
}

function coerceSportType(value: string | undefined): SportType {
  const normalized = (value || '').trim().toUpperCase().replace(/\s+/g, '_')
  const map: Record<string, SportType> = {
    RUN: SportType.RUNNING,
    RUNNING: SportType.RUNNING,
    CYCLING: SportType.CYCLING,
    BIKE: SportType.CYCLING,
    BIKING: SportType.CYCLING,
    SKIING: SportType.SKIING,
    SKI: SportType.SKIING,
    SWIMMING: SportType.SWIMMING,
    SWIM: SportType.SWIMMING,
    TRIATHLON: SportType.TRIATHLON,
    HYROX: SportType.HYROX,
    ROW: SportType.GENERAL_FITNESS,
    ROWING: SportType.GENERAL_FITNESS,
    ERG: SportType.GENERAL_FITNESS,
    GENERAL_FITNESS: SportType.GENERAL_FITNESS,
    FUNCTIONAL_FITNESS: SportType.FUNCTIONAL_FITNESS,
    STRENGTH: SportType.STRENGTH,
  }
  return map[normalized] || SportType.GENERAL_FITNESS
}

function coerceHybridFormat(value: string | undefined): HybridFormat {
  if (value && Object.values(HybridFormat).includes(value as HybridFormat)) return value as HybridFormat
  return HybridFormat.CUSTOM
}

function coerceScalingLevel(value: string | undefined): ScalingLevel {
  if (value && Object.values(ScalingLevel).includes(value as ScalingLevel)) return value as ScalingLevel
  return ScalingLevel.RX
}

function strengthCounts(exercises: ParsedStrengthWorkout['exercises']): {
  totalSets: number
  totalExercises: number
} {
  return {
    totalSets: exercises.reduce((sum, exercise) => sum + (exercise.sets || 0), 0),
    totalExercises: exercises.length,
  }
}

async function getOrCreateHybridFallbackExercise(params: {
  tx: Prisma.TransactionClient
  ownerUserId: string
  name: string
}): Promise<string> {
  const name = params.name.trim() || 'Imported movement'
  const existing = await params.tx.exercise.findFirst({
    where: {
      coachId: params.ownerUserId,
      isPublic: false,
      name: { equals: name, mode: 'insensitive' },
    },
    select: { id: true },
  })
  if (existing) return existing.id

  const created = await params.tx.exercise.create({
    data: {
      coachId: params.ownerUserId,
      name,
      nameSv: name,
      nameEn: name,
      category: WorkoutType.STRENGTH,
      isPublic: false,
      isHybridMovement: true,
      equipmentTypes: [],
      description: 'Imported from athlete AI chat.',
    },
    select: { id: true },
  })
  return created.id
}

export async function executeImportedWorkoutDraft(
  draft: AIActionDraft,
  locale: AppLocale = 'en'
): Promise<unknown> {
  if (!draft.clientId) {
    return { success: false, error: t(locale, 'Athlete scope is missing.', 'Atletscope saknas.') }
  }

  const parsedInput = ImportedWorkoutDraftInputSchema.safeParse(draft.input)
  if (!parsedInput.success) {
    return { success: false, error: t(locale, 'The imported workout draft is invalid.', 'Det importerade passutkastet är ogiltigt.') }
  }

  const input = parsedInput.data
  if (input.workoutType !== input.parsedWorkout.workoutType) {
    return {
      success: false,
      error: t(
        locale,
        'Changing the workout type requires re-importing the source with a correction note.',
        'Ändrad passtyp kräver att du importerar källan igen med en korrigerande notis.'
      ),
    }
  }

  const client = await prisma.client.findUnique({
    where: { id: draft.clientId },
    select: {
      id: true,
      userId: true,
      businessId: true,
    },
  })

  if (!client?.userId) {
    return { success: false, error: t(locale, 'Athlete profile not found.', 'Atletprofilen hittades inte.') }
  }

  const assignedDate = parseDateOnly(input.assignedDate)
  const notes = buildAssignmentNotes(input, locale)

  if (input.workoutType === 'STRENGTH') {
    const parsed = withEditedName(input.parsedWorkout as ParsedStrengthWorkout, input)
    const data = toStrengthSessionData(parsed, input.mappings)
    const counts = strengthCounts(parsed.exercises)

    const result = await prisma.$transaction(async (tx) => {
      const session = await tx.strengthSession.create({
        data: {
          coachId: client.userId,
          name: input.name,
          description: data.description ?? null,
          phase: coerceStrengthPhase(data.phase),
          exercises: toJson(data.exercises),
          warmupData: optionalJson(data.warmupData),
          prehabData: optionalJson(data.prehabData),
          coreData: optionalJson(data.coreData),
          cooldownData: optionalJson(data.cooldownData),
          estimatedDuration: data.estimatedDuration,
          totalSets: counts.totalSets,
          totalExercises: counts.totalExercises,
          tags: withImportTag(data.tags),
          isPublic: false,
        },
      })
      const assignment = await tx.strengthSessionAssignment.create({
        data: {
          sessionId: session.id,
          athleteId: client.id,
          assignedDate,
          assignedBy: client.userId,
          notes,
          status: 'PENDING',
        },
      })
      return { session, assignment }
    })

    return {
      success: true,
      kind: 'STRENGTH',
      sessionId: result.session.id,
      assignmentId: result.assignment.id,
      name: result.session.name,
      startPath: `/athlete/strength?start=${encodeURIComponent(result.assignment.id)}`,
      message: t(locale, 'The strength session is planned.', 'Styrkepasset är planerat.'),
    }
  }

  if (input.workoutType === 'CARDIO') {
    const parsed = withEditedName(input.parsedWorkout as ParsedCardioWorkout, input)
    const data = toCardioSessionData(parsed)

    const result = await prisma.$transaction(async (tx) => {
      const session = await tx.cardioSession.create({
        data: {
          coachId: client.userId,
          name: input.name,
          description: data.description ?? null,
          sport: coerceSportType(data.sport),
          segments: toJson(data.segments),
          totalDuration: data.totalDuration,
          totalDistance: data.totalDistance,
          avgZone: data.avgZone,
          tags: withImportTag(data.tags),
          isPublic: false,
        },
      })
      const assignment = await tx.cardioSessionAssignment.create({
        data: {
          sessionId: session.id,
          athleteId: client.id,
          assignedDate,
          assignedBy: client.userId,
          notes,
          status: 'PENDING',
        },
      })
      return { session, assignment }
    })

    return {
      success: true,
      kind: 'CARDIO',
      sessionId: result.session.id,
      assignmentId: result.assignment.id,
      name: result.session.name,
      startPath: `/athlete/cardio?start=${encodeURIComponent(result.assignment.id)}`,
      message: t(locale, 'The cardio session is planned.', 'Konditionspasset är planerat.'),
    }
  }

  const parsed = withEditedName(input.parsedWorkout as ParsedHybridWorkout, input)
  const data = toHybridBuilderInitialData(parsed, input.mappings, input.candidateLookup)

  const result = await prisma.$transaction(async (tx) => {
    const workout = await tx.hybridWorkout.create({
      data: {
        coachId: client.userId,
        name: input.name,
        description: data.description ?? null,
        format: coerceHybridFormat(data.format),
        timeCap: data.timeCap,
        workTime: data.workTime,
        restTime: data.restTime,
        totalRounds: data.totalRounds,
        totalMinutes: data.totalMinutes,
        repScheme: data.repScheme,
        scalingLevel: coerceScalingLevel(data.scalingLevel),
        tags: withImportTag(data.tags),
        isPublic: false,
      },
    })

    for (const [index, movement] of (data.movements || []).entries()) {
      const exerciseId = movement.exerciseId.startsWith('MISSING:')
        ? await getOrCreateHybridFallbackExercise({
            tx,
            ownerUserId: client.userId,
            name: movement.exercise?.name || movement.exerciseId.replace(/^MISSING:/, ''),
          })
        : movement.exerciseId

      await tx.hybridMovement.create({
        data: {
          workoutId: workout.id,
          exerciseId,
          order: movement.order ?? index,
          reps: movement.reps,
          calories: movement.calories,
          distance: movement.distance,
          duration: movement.duration,
          weightMale: movement.weightMale,
          weightFemale: movement.weightFemale,
          weightUnit: 'kg',
          notes: movement.notes,
        },
      })
    }

    const assignment = await tx.hybridWorkoutAssignment.create({
      data: {
        workoutId: workout.id,
        athleteId: client.id,
        assignedDate,
        assignedBy: client.userId,
        notes,
        status: 'PENDING',
      },
    })
    return { workout, assignment }
  })

  return {
    success: true,
    kind: 'HYBRID',
    workoutId: result.workout.id,
    assignmentId: result.assignment.id,
    name: result.workout.name,
    startPath: `/athlete/hybrid/${encodeURIComponent(result.workout.id)}`,
    message: t(locale, 'The hybrid workout is planned.', 'Hybridpasset är planerat.'),
  }
}

export function normalizePastedWorkoutText(text: string): NormalizedInput {
  return normalizeText(text)
}

export function providerToPrismaProvider(provider: LowerAIProvider): AIProvider {
  if (provider === 'google') return AIProvider.GOOGLE
  if (provider === 'openai') return AIProvider.OPENAI
  return AIProvider.ANTHROPIC
}

export { DEFAULT_WORKOUT_TYPE }

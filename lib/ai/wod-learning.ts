import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import type {
  AdjustedIntensity,
  WODCandidateBlueprint,
  WODCandidateScore,
  WODEquipment,
  WODFeedbackInput,
  WODGuardrailResult,
  WODLearningContext,
  WODPreferenceProfile,
  WODRequest,
  WODWorkout,
  WODWorkoutType,
} from '@/types/wod'

type AppLocale = 'en' | 'sv'

type StoredPreferenceProfile = {
  id: string
  clientId: string
  preferredDuration: number | null
  intensityTolerance: number | null
  preferredFormats: string[]
  exerciseLikes: string[]
  exerciseDislikes: string[]
  modeAffinity: Prisma.JsonValue | null
  workoutTypeAffinity: Prisma.JsonValue | null
  equipmentAffinity: Prisma.JsonValue | null
  structurePreference: Prisma.JsonValue | null
  noveltyPreference: number | null
  painAvoidanceSignals: Prisma.JsonValue | null
  promptSummary: string | null
  confidence: number
  sampleSize: number
  feedbackCount: number
}

type CompletionLearningInput = {
  clientId: string
  wodId: string
  workout: WODWorkout
  mode: string
  workoutType: string | null
  requestedDuration: number
  equipment: string[]
  sessionRPE?: number | null
  actualDuration?: number | null
  exerciseLogs?: unknown
  feedback?: WODFeedbackInput | null
}

const MIN_GLOBAL_COHORT_SIZE = 10

export function normalizeWODFeedback(input: unknown): WODFeedbackInput | null {
  if (!input || typeof input !== 'object') return null
  const record = input as Record<string, unknown>
  const difficultyFit = normalizeScale(record.difficultyFit)
  const enjoyment = normalizeScale(record.enjoyment)
  const structureFit = normalizeScale(record.structureFit)
  const repeatIntent = record.repeatIntent

  if (!difficultyFit || !enjoyment || !structureFit || typeof repeatIntent !== 'boolean') {
    return null
  }

  return {
    difficultyFit,
    enjoyment,
    structureFit,
    repeatIntent,
    painOrDiscomfort: normalizeOptionalText(record.painOrDiscomfort),
    note: normalizeOptionalText(record.note),
  }
}

export async function getWODLearningContext(
  clientId: string,
  context: {
    primarySport: string
    experienceLevel: string
  },
  request?: Pick<WODRequest, 'workoutType'>
): Promise<WODLearningContext> {
  const [profileRecord, globalHints] = await Promise.all([
    prisma.wODPreferenceProfile.findUnique({
      where: { clientId },
    }),
    getAnonymousGlobalWODHints({
      sport: context.primarySport,
      experienceLevel: context.experienceLevel,
      workoutType: request?.workoutType,
    }),
  ])

  const profile = profileRecord ? toPreferenceProfile(profileRecord) : null
  const promptSummary = buildLearningPromptSummary(profile, globalHints)

  return {
    profile,
    globalHints,
    promptSummary,
  }
}

export async function getWODPreferenceProfile(clientId: string): Promise<WODPreferenceProfile | null> {
  const profile = await prisma.wODPreferenceProfile.findUnique({
    where: { clientId },
  })
  return profile ? toPreferenceProfile(profile) : null
}

export async function resetWODPreferenceProfile(clientId: string): Promise<void> {
  await prisma.wODPreferenceProfile.deleteMany({
    where: { clientId },
  })
}

export async function updateWODPreferenceProfileFromCompletion(
  input: CompletionLearningInput
): Promise<WODPreferenceProfile> {
  const existing = await prisma.wODPreferenceProfile.findUnique({
    where: { clientId: input.clientId },
  })
  const current = existing ? toPreferenceProfile(existing) : createEmptyProfile(input.clientId)
  const next = applyCompletionSignal(current, input)
  const saved = await prisma.wODPreferenceProfile.upsert({
    where: { clientId: input.clientId },
    create: {
      clientId: input.clientId,
      preferredDuration: next.preferredDuration,
      intensityTolerance: next.intensityTolerance,
      preferredFormats: next.preferredFormats,
      exerciseLikes: next.exerciseLikes,
      exerciseDislikes: next.exerciseDislikes,
      modeAffinity: next.modeAffinity as Prisma.InputJsonValue,
      workoutTypeAffinity: next.workoutTypeAffinity as Prisma.InputJsonValue,
      equipmentAffinity: next.equipmentAffinity as Prisma.InputJsonValue,
      structurePreference: next.structurePreference as Prisma.InputJsonValue,
      noveltyPreference: next.noveltyPreference,
      painAvoidanceSignals: next.painAvoidanceSignals as Prisma.InputJsonValue,
      promptSummary: next.promptSummary,
      confidence: next.confidence,
      sampleSize: next.sampleSize,
      feedbackCount: next.feedbackCount,
      lastUpdatedFromWODId: input.wodId,
    },
    update: {
      preferredDuration: next.preferredDuration,
      intensityTolerance: next.intensityTolerance,
      preferredFormats: next.preferredFormats,
      exerciseLikes: next.exerciseLikes,
      exerciseDislikes: next.exerciseDislikes,
      modeAffinity: next.modeAffinity as Prisma.InputJsonValue,
      workoutTypeAffinity: next.workoutTypeAffinity as Prisma.InputJsonValue,
      equipmentAffinity: next.equipmentAffinity as Prisma.InputJsonValue,
      structurePreference: next.structurePreference as Prisma.InputJsonValue,
      noveltyPreference: next.noveltyPreference,
      painAvoidanceSignals: next.painAvoidanceSignals as Prisma.InputJsonValue,
      promptSummary: next.promptSummary,
      confidence: next.confidence,
      sampleSize: next.sampleSize,
      feedbackCount: next.feedbackCount,
      lastUpdatedFromWODId: input.wodId,
    },
  })

  await updateAnonymousGlobalWODAggregate(input)

  return toPreferenceProfile(saved)
}

export function scoreWODCandidates(
  candidates: WODCandidateBlueprint[],
  input: {
    request: WODRequest
    guardrails: WODGuardrailResult
    profile: WODPreferenceProfile | null
    globalHints?: string[]
  }
): WODCandidateScore[] {
  return candidates.map((candidate) => scoreWODCandidate(candidate, input))
}

export function pickBestWODCandidate(
  candidates: WODCandidateBlueprint[],
  input: {
    request: WODRequest
    guardrails: WODGuardrailResult
    profile: WODPreferenceProfile | null
    globalHints?: string[]
  }
): { candidate: WODCandidateBlueprint; score: WODCandidateScore; scores: WODCandidateScore[] } {
  const scores = scoreWODCandidates(candidates, input)
  const bestScore = [...scores].sort((a, b) => b.score - a.score)[0] ?? {
    candidateId: candidates[0]?.id ?? 'candidate-1',
    score: 0,
    vetoed: true,
    reasons: ['No candidate scores available'],
    breakdown: {
      safety: 0,
      preferenceFit: 0,
      readinessFit: 0,
      goalFit: 0,
      durationFit: 0,
      equipmentFit: 0,
      variety: 0,
    },
  }
  const candidate = candidates.find((item) => item.id === bestScore.candidateId) ?? candidates[0]

  return { candidate, score: bestScore, scores }
}

export function buildWODPreferenceSection(
  learning: WODLearningContext | null,
  locale: AppLocale
): string {
  if (!learning?.promptSummary) return ''
  const heading = locale === 'sv'
    ? '## INLÄRDA PREFERENSER'
    : '## LEARNED WORKOUT PREFERENCES'
  return `${heading}\n${learning.promptSummary}\n`
}

export function buildCandidateScoringSnapshot(params: {
  learning: WODLearningContext | null
  chosen: WODCandidateBlueprint
  chosenScore: WODCandidateScore
  allScores: WODCandidateScore[]
}): Prisma.InputJsonValue {
  return {
    chosenCandidateId: params.chosen.id,
    chosenScore: params.chosenScore.score,
    chosenReasons: params.chosenScore.reasons,
    candidates: params.allScores,
    profileConfidence: params.learning?.profile?.confidence ?? 0,
    personalSampleSize: params.learning?.profile?.sampleSize ?? 0,
    globalHintCount: params.learning?.globalHints.length ?? 0,
  } as unknown as Prisma.InputJsonValue
}

export function buildPreferenceSnapshot(learning: WODLearningContext | null): Prisma.InputJsonValue {
  return {
    personal: learning?.profile
      ? {
          confidence: learning.profile.confidence,
          sampleSize: learning.profile.sampleSize,
          preferredDuration: learning.profile.preferredDuration ?? null,
          intensityTolerance: learning.profile.intensityTolerance ?? null,
          preferredFormats: learning.profile.preferredFormats,
          exerciseLikes: learning.profile.exerciseLikes.slice(0, 10),
          exerciseDislikes: learning.profile.exerciseDislikes.slice(0, 10),
          promptSummary: learning.profile.promptSummary,
        }
      : null,
    globalHints: learning?.globalHints ?? [],
  } as Prisma.InputJsonValue
}

function scoreWODCandidate(
  candidate: WODCandidateBlueprint,
  input: {
    request: WODRequest
    guardrails: WODGuardrailResult
    profile: WODPreferenceProfile | null
  }
): WODCandidateScore {
  const reasons: string[] = []
  const requestedEquipment = normalizeEquipment(input.request.equipment ?? ['none'])
  const candidateEquipment = normalizeEquipment(candidate.equipment)
  const excludedAreas = input.guardrails.excludedAreas.map((area) => area.toLowerCase())
  const keyExerciseText = candidate.keyExercises.join(' ').toLowerCase()
  const vetoedByBodyArea = excludedAreas.some((area) => keyExerciseText.includes(area))
  const usesDisallowedEquipment = requestedEquipment.length > 0 && !candidateEquipment.every((item) => requestedEquipment.includes(item))
  const vetoed = vetoedByBodyArea || usesDisallowedEquipment

  let safety = vetoed ? 0 : 100
  if (candidate.intensity !== input.guardrails.adjustedIntensity) {
    safety -= 10
    reasons.push('Adjusted intensity mismatch')
  }
  if (vetoedByBodyArea) reasons.push('Loads an excluded body area')
  if (usesDisallowedEquipment) reasons.push('Uses equipment not requested')

  const durationFit = 100 - Math.min(100, Math.abs(candidate.duration - (input.request.duration ?? 45)) * 4)
  const equipmentFit = usesDisallowedEquipment ? 0 : 100
  const readinessFit = scoreReadinessFit(candidate.intensity, input.guardrails.adjustedIntensity)
  const preferenceFit = scorePreferenceFit(candidate, input.profile)
  const goalFit = input.request.workoutType && candidate.workoutType !== input.request.workoutType ? 70 : 100
  const variety = scoreVariety(candidate, input.profile)

  const breakdown = {
    safety: clamp(safety, 0, 100),
    preferenceFit,
    readinessFit,
    goalFit,
    durationFit: clamp(durationFit, 0, 100),
    equipmentFit,
    variety,
  }

  const score = vetoed
    ? 0
    : Math.round(
        breakdown.safety * 0.3 +
        breakdown.preferenceFit * 0.25 +
        breakdown.readinessFit * 0.15 +
        breakdown.goalFit * 0.1 +
        breakdown.durationFit * 0.1 +
        breakdown.equipmentFit * 0.05 +
        breakdown.variety * 0.05
      )

  if (input.profile?.promptSummary) reasons.push('Scored against personal learning profile')
  if (reasons.length === 0) reasons.push('Balanced safety, preference, and session fit')

  return {
    candidateId: candidate.id,
    score,
    vetoed,
    reasons,
    breakdown,
  }
}

function applyCompletionSignal(
  profile: WODPreferenceProfile,
  input: CompletionLearningInput
): WODPreferenceProfile {
  const feedback = input.feedback
  const sampleSize = profile.sampleSize + 1
  const feedbackCount = profile.feedbackCount + (feedback ? 1 : 0)
  const actualDuration = input.actualDuration ?? input.requestedDuration
  const satisfaction = feedback
    ? (feedback.enjoyment + feedback.structureFit + (feedback.repeatIntent ? 5 : 2)) / 3
    : 3
  const delta = (satisfaction - 3) / 2
  const mode = input.mode.toLowerCase()
  const workoutType = input.workoutType ?? 'strength'
  const format = inferWorkoutFormat(input.workout)
  const completedNames = extractExerciseNames(input.exerciseLogs)
  const keyExercises = completedNames.length > 0 ? completedNames : extractWorkoutExerciseNames(input.workout)
  const positiveSignal = satisfaction >= 4 || feedback?.repeatIntent === true
  const negativeSignal = satisfaction <= 2 || !!feedback?.painOrDiscomfort

  const preferredDuration = profile.preferredDuration
    ? Math.round(blend(profile.preferredDuration, actualDuration, positiveSignal ? 0.35 : 0.15))
    : actualDuration

  const intensityTolerance = updateIntensityTolerance(profile.intensityTolerance, input.sessionRPE, feedback?.difficultyFit)
  const preferredFormats = positiveSignal ? pushUnique(format ? profile.preferredFormats : profile.preferredFormats, format) : profile.preferredFormats
  const exerciseLikes = positiveSignal ? pushManyUnique(profile.exerciseLikes, keyExercises).slice(0, 30) : profile.exerciseLikes
  const exerciseDislikes = negativeSignal ? pushManyUnique(profile.exerciseDislikes, keyExercises).slice(0, 30) : profile.exerciseDislikes

  const modeAffinity = adjustAffinity(profile.modeAffinity, mode, delta)
  const workoutTypeAffinity = adjustAffinity(profile.workoutTypeAffinity, workoutType, delta)
  const equipmentAffinity = input.equipment.reduce(
    (map, item) => adjustAffinity(map, item, delta),
    { ...profile.equipmentAffinity }
  )
  const structurePreference = {
    ...profile.structurePreference,
    lastFormat: format,
    repeatFriendly: feedback?.repeatIntent ?? profile.structurePreference.repeatFriendly ?? false,
    latestDifficultyFit: feedback?.difficultyFit ?? profile.structurePreference.latestDifficultyFit ?? null,
  }
  const noveltyPreference = clamp(
    blend(profile.noveltyPreference ?? 0.5, mode === 'fun' && positiveSignal ? 0.75 : 0.45, 0.2),
    0,
    1
  )
  const painAvoidanceSignals = updatePainSignals(profile.painAvoidanceSignals, feedback?.painOrDiscomfort, keyExercises)
  const confidence = clamp(sampleSize / 12, 0, 1)

  const next: WODPreferenceProfile = {
    ...profile,
    preferredDuration,
    intensityTolerance,
    preferredFormats,
    exerciseLikes,
    exerciseDislikes,
    modeAffinity,
    workoutTypeAffinity,
    equipmentAffinity,
    structurePreference,
    noveltyPreference,
    painAvoidanceSignals,
    confidence,
    sampleSize,
    feedbackCount,
  }

  return {
    ...next,
    promptSummary: summarizePreferenceProfile(next),
  }
}

async function getAnonymousGlobalWODHints(input: {
  sport: string
  experienceLevel: string
  workoutType?: WODWorkoutType
}): Promise<string[]> {
  const aggregates = await prisma.wODGlobalLearningAggregate.findMany({
    where: {
      sport: { in: [input.sport, 'ALL'] },
      sampleSize: { gte: MIN_GLOBAL_COHORT_SIZE },
      OR: [
        { workoutType: input.workoutType ?? null },
        { workoutType: null },
      ],
    },
    orderBy: { sampleSize: 'desc' },
    take: 3,
  })

  return aggregates
    .filter((aggregate) => aggregate.sampleSize >= aggregate.minCohortSize)
    .map((aggregate) => aggregate.promptSummary)
    .filter((summary): summary is string => !!summary)
}

async function updateAnonymousGlobalWODAggregate(input: CompletionLearningInput): Promise<void> {
  const feedback = input.feedback
  if (!feedback) return

  const workoutType = input.workoutType ?? 'strength'
  const sport = 'ALL'
  const cohortKey = `${sport}:${workoutType}`
  const positive = feedback.enjoyment >= 4 && feedback.structureFit >= 4 && feedback.repeatIntent
  const format = inferWorkoutFormat(input.workout)
  const lessons = {
    workoutType,
    positiveFormat: positive ? format : null,
    difficultyFitAvg: feedback.difficultyFit,
    enjoymentAvg: feedback.enjoyment,
    repeatIntentRate: feedback.repeatIntent ? 1 : 0,
  }
  const promptSummary = positive
    ? `Anonymous cohort: ${workoutType} WODs with ${format || 'clear'} structure are getting strong repeat signals.`
    : `Anonymous cohort: keep ${workoutType} WOD difficulty calibrated and avoid over-complex structures.`

  await prisma.wODGlobalLearningAggregate.upsert({
    where: { cohortKey },
    create: {
      cohortKey,
      sport,
      workoutType,
      sampleSize: 1,
      lessons: lessons as Prisma.InputJsonValue,
      promptSummary,
    },
    update: {
      sampleSize: { increment: 1 },
      lessons: lessons as Prisma.InputJsonValue,
      promptSummary,
    },
  })
}

function buildLearningPromptSummary(profile: WODPreferenceProfile | null, globalHints: string[]): string | null {
  const lines: string[] = []
  if (profile?.promptSummary) {
    lines.push(`Personal learning: ${profile.promptSummary}`)
  }
  for (const hint of globalHints.slice(0, 3)) {
    lines.push(`Anonymous cohort hint: ${hint}`)
  }
  return lines.length > 0 ? lines.join('\n') : null
}

function summarizePreferenceProfile(profile: WODPreferenceProfile): string {
  const lines: string[] = []
  if (profile.preferredDuration) lines.push(`Usually fits best around ${profile.preferredDuration} minutes.`)
  if (profile.intensityTolerance) lines.push(`Recent tolerated intensity centers around RPE ${profile.intensityTolerance.toFixed(1)}/10.`)
  const topFormats = profile.preferredFormats.slice(0, 3)
  if (topFormats.length > 0) lines.push(`Preferred structures: ${topFormats.join(', ')}.`)
  const mode = topKey(profile.modeAffinity)
  if (mode) lines.push(`Best-liked style so far: ${mode}.`)
  const workoutType = topKey(profile.workoutTypeAffinity)
  if (workoutType) lines.push(`Strongest workout-type signal: ${workoutType}.`)
  if (profile.exerciseLikes.length > 0) lines.push(`Exercises to reuse when appropriate: ${profile.exerciseLikes.slice(0, 6).join(', ')}.`)
  if (profile.exerciseDislikes.length > 0) lines.push(`Exercises to be cautious with: ${profile.exerciseDislikes.slice(0, 6).join(', ')}.`)
  const painAreas = Array.isArray(profile.painAvoidanceSignals.areas) ? profile.painAvoidanceSignals.areas.slice(0, 5) : []
  if (painAreas.length > 0) lines.push(`Pain/discomfort watch areas: ${painAreas.join(', ')}.`)
  lines.push(`Confidence ${Math.round(profile.confidence * 100)}% from ${profile.sampleSize} WOD signal${profile.sampleSize === 1 ? '' : 's'}.`)
  return lines.join(' ')
}

function toPreferenceProfile(record: StoredPreferenceProfile): WODPreferenceProfile {
  return {
    id: record.id,
    clientId: record.clientId,
    preferredDuration: record.preferredDuration,
    intensityTolerance: record.intensityTolerance,
    preferredFormats: record.preferredFormats,
    exerciseLikes: record.exerciseLikes,
    exerciseDislikes: record.exerciseDislikes,
    modeAffinity: jsonNumberObject(record.modeAffinity),
    workoutTypeAffinity: jsonNumberObject(record.workoutTypeAffinity),
    equipmentAffinity: jsonNumberObject(record.equipmentAffinity),
    structurePreference: jsonPreferenceObject(record.structurePreference),
    noveltyPreference: record.noveltyPreference,
    painAvoidanceSignals: jsonObject(record.painAvoidanceSignals),
    promptSummary: record.promptSummary,
    confidence: record.confidence,
    sampleSize: record.sampleSize,
    feedbackCount: record.feedbackCount,
  }
}

function createEmptyProfile(clientId: string): WODPreferenceProfile {
  return {
    clientId,
    preferredDuration: null,
    intensityTolerance: null,
    preferredFormats: [],
    exerciseLikes: [],
    exerciseDislikes: [],
    modeAffinity: {},
    workoutTypeAffinity: {},
    equipmentAffinity: {},
    structurePreference: {},
    noveltyPreference: 0.5,
    painAvoidanceSignals: {},
    promptSummary: null,
    confidence: 0,
    sampleSize: 0,
    feedbackCount: 0,
  }
}

function normalizeScale(value: unknown): 1 | 2 | 3 | 4 | 5 | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  const rounded = Math.round(value)
  if (rounded < 1 || rounded > 5) return null
  return rounded as 1 | 2 | 3 | 4 | 5
}

function normalizeOptionalText(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed.slice(0, 500) : null
}

function normalizeEquipment(equipment: WODEquipment[] | string[] | undefined): string[] {
  return [...new Set((equipment ?? ['none']).filter(Boolean).map((item) => String(item)))]
}

function jsonObject(value: Prisma.JsonValue | null): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

function jsonNumberObject(value: Prisma.JsonValue | null): Record<string, number> {
  const object = jsonObject(value)
  return Object.fromEntries(
    Object.entries(object).filter((entry): entry is [string, number] => typeof entry[1] === 'number')
  )
}

function jsonPreferenceObject(value: Prisma.JsonValue | null): Record<string, number | string | boolean> {
  const object = jsonObject(value)
  return Object.fromEntries(
    Object.entries(object).filter((entry): entry is [string, number | string | boolean] =>
      ['number', 'string', 'boolean'].includes(typeof entry[1])
    )
  )
}

function adjustAffinity(source: Record<string, unknown>, key: string, delta: number): Record<string, number> {
  const existing = typeof source[key] === 'number' ? source[key] as number : 0
  return {
    ...source,
    [key]: Math.round(clamp(existing + delta, -5, 5) * 100) / 100,
  } as Record<string, number>
}

function updateIntensityTolerance(current: number | null | undefined, rpe?: number | null, difficultyFit?: number): number | null {
  if (!rpe && !difficultyFit) return current ?? null
  const adjustment = difficultyFit ? (difficultyFit - 3) * 0.4 : 0
  const next = clamp((rpe ?? current ?? 6) + adjustment, 1, 10)
  return Math.round(blend(current ?? next, next, 0.35) * 10) / 10
}

function updatePainSignals(
  current: Record<string, unknown>,
  painText: string | null | undefined,
  exercises: string[]
): Record<string, unknown> {
  if (!painText) return current
  const tokens = painText
    .toLowerCase()
    .replace(/[^a-zåäö0-9\s-]/gi, ' ')
    .split(/\s+/)
    .filter((token) => token.length >= 4)
    .slice(0, 8)
  const areas = pushManyUnique(Array.isArray(current.areas) ? current.areas as string[] : [], tokens).slice(0, 20)
  const relatedExercises = pushManyUnique(
    Array.isArray(current.relatedExercises) ? current.relatedExercises as string[] : [],
    exercises
  ).slice(0, 20)
  return {
    ...current,
    areas,
    relatedExercises,
    reportCount: typeof current.reportCount === 'number' ? current.reportCount + 1 : 1,
  }
}

function inferWorkoutFormat(workout: WODWorkout): string {
  const text = [
    workout.title,
    workout.subtitle,
    workout.description,
    workout.coachNotes,
    ...workout.sections.flatMap((section) => [section.name, section.notes, ...section.exercises.map((exercise) => exercise.instructions)]),
  ].filter(Boolean).join(' ').toLowerCase()

  if (text.includes('emom')) return 'EMOM'
  if (text.includes('amrap')) return 'AMRAP'
  if (text.includes('tabata')) return 'Tabata'
  if (text.includes('for time')) return 'For Time'
  if (text.includes('circuit') || text.includes('cirkel')) return 'Circuit'
  if (text.includes('interval') || text.includes('intervall')) return 'Intervals'
  return 'Structured blocks'
}

function extractExerciseNames(exerciseLogs: unknown): string[] {
  if (!Array.isArray(exerciseLogs)) return []
  return exerciseLogs
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const record = item as Record<string, unknown>
      return typeof record.name === 'string' ? record.name : null
    })
    .filter((name): name is string => !!name)
}

function extractWorkoutExerciseNames(workout: WODWorkout): string[] {
  return workout.sections
    .flatMap((section) => section.exercises.map((exercise) => exercise.name))
    .filter(Boolean)
}

function scoreReadinessFit(candidateIntensity: AdjustedIntensity, adjustedIntensity: AdjustedIntensity): number {
  if (candidateIntensity === adjustedIntensity) return 100
  const order: AdjustedIntensity[] = ['recovery', 'easy', 'moderate', 'threshold']
  const diff = Math.abs(order.indexOf(candidateIntensity) - order.indexOf(adjustedIntensity))
  return clamp(100 - diff * 25, 0, 100)
}

function scorePreferenceFit(candidate: WODCandidateBlueprint, profile: WODPreferenceProfile | null): number {
  if (!profile || profile.sampleSize === 0) return 70
  let score = 70
  score += affinityValue(profile.modeAffinity, candidate.mode) * 5
  score += affinityValue(profile.workoutTypeAffinity, candidate.workoutType) * 5
  score += candidate.equipment.reduce((sum, item) => sum + affinityValue(profile.equipmentAffinity, item) * 2, 0)
  if (profile.preferredFormats.includes(candidate.format)) score += 10
  if (profile.exerciseLikes.some((name) => candidate.keyExercises.join(' ').toLowerCase().includes(name.toLowerCase()))) score += 8
  if (profile.exerciseDislikes.some((name) => candidate.keyExercises.join(' ').toLowerCase().includes(name.toLowerCase()))) score -= 18
  return clamp(Math.round(score), 0, 100)
}

function scoreVariety(candidate: WODCandidateBlueprint, profile: WODPreferenceProfile | null): number {
  if (!profile || profile.sampleSize < 3) return 75
  const novelty = profile.noveltyPreference ?? 0.5
  const familiar = profile.preferredFormats.includes(candidate.format)
  if (novelty >= 0.65) return familiar ? 75 : 92
  return familiar ? 90 : 72
}

function affinityValue(map: Record<string, unknown>, key: string): number {
  return typeof map[key] === 'number' ? map[key] as number : 0
}

function topKey(map: Record<string, unknown>): string | null {
  const entries = Object.entries(map)
    .filter((entry): entry is [string, number] => typeof entry[1] === 'number')
    .sort((a, b) => b[1] - a[1])
  return entries[0]?.[0] ?? null
}

function blend(current: number, next: number, alpha: number): number {
  return current * (1 - alpha) + next * alpha
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function pushUnique(list: string[], value: string): string[] {
  if (!value) return list
  return list.includes(value) ? list : [value, ...list]
}

function pushManyUnique(list: string[], values: string[]): string[] {
  return values.reduce((acc, value) => pushUnique(acc, value), list)
}

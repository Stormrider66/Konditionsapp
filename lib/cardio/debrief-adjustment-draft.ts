import type { CardioDebriefAnswer } from '@/lib/cardio/post-workout-debrief'
import type { CardioSessionSummaryData } from '@/lib/cardio/session-summary'
import type { FocusModeSegment } from '@/lib/cardio/focus-mode-segments'
import {
  buildCreateCardioWorkoutPreview,
  stockholmDateKey,
  type CreateCardioWorkoutInput,
} from '@/lib/ai/cardio-workout-action'

type AppLocale = 'en' | 'sv'

type CardioWorkoutStation = CreateCardioWorkoutInput['stations'][number]

export interface CardioAdjustmentDraft {
  input: CreateCardioWorkoutInput
  preview: ReturnType<typeof buildCreateCardioWorkoutPreview>
  rationale: string[]
  adjustmentType: 'deload' | 'repeat' | 'progression'
}

const WORK_TYPES = new Set(['INTERVAL', 'STEADY', 'HILL', 'DRILLS'])
const VALID_EQUIPMENT = new Set([
  'RUN',
  'TREADMILL',
  'BIKE',
  'ASSAULT_BIKE',
  'ECHO_BIKE',
  'WATTBIKE',
  'BIKE_ERG',
  'ROW',
  'SKI_ERG',
  'SWIM',
  'OTHER',
])

function text(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

function tomorrowStockholm(now = new Date()): string {
  return stockholmDateKey(new Date(now.getTime() + 24 * 60 * 60 * 1000))
}

function clampInt(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)))
}

function roundWatts(value: number): number {
  return clampInt(Math.round(value / 5) * 5, 30, 1000)
}

function answerValues(answers: CardioDebriefAnswer[] | undefined): Set<string> {
  return new Set(
    (answers ?? [])
      .map((answer) => answer.value)
      .filter((value): value is string => Boolean(value)),
  )
}

function sourceWorkSegments(segments: FocusModeSegment[]): FocusModeSegment[] {
  return segments.filter((segment) => WORK_TYPES.has(segment.type))
}

function primaryRepeatGroup(workSegments: FocusModeSegment[]): { groupId: string; roundCount: number } | null {
  const groups = new Map<string, { groupId: string; roundCount: number; windows: number }>()
  for (const segment of workSegments) {
    if (!segment.groupId || !segment.roundCount || segment.roundCount <= 1) continue
    const current = groups.get(segment.groupId) ?? {
      groupId: segment.groupId,
      roundCount: segment.roundCount,
      windows: 0,
    }
    current.windows += 1
    groups.set(segment.groupId, current)
  }

  return Array.from(groups.values()).sort((a, b) => b.windows - a.windows)[0] ?? null
}

function stationFromSegment(segment: FocusModeSegment, powerMultiplier: number, note: string | null): CardioWorkoutStation {
  const station: CardioWorkoutStation = {}

  if (segment.equipment && VALID_EQUIPMENT.has(segment.equipment)) {
    station.equipment = segment.equipment as CardioWorkoutStation['equipment']
  }
  if (segment.plannedDuration != null) station.durationSeconds = clampInt(segment.plannedDuration, 10, 3600)
  if (segment.plannedCalories != null) station.calories = clampInt(segment.plannedCalories * powerMultiplier, 1, 200)
  if (segment.plannedDistance != null) station.distanceMeters = clampInt(segment.plannedDistance * 1000, 50, 50000)
  if (segment.plannedPower != null) station.targetWatts = roundWatts(segment.plannedPower * powerMultiplier)
  if (segment.plannedPower == null && segment.plannedZone != null) {
    station.zone = clampInt(segment.plannedZone + (powerMultiplier < 1 ? -1 : 0), 1, 5)
  }

  const notes = [
    segment.plannedCadence != null ? `Cadence ${segment.plannedCadence} rpm` : null,
    note,
  ].filter((item): item is string => Boolean(item))
  if (notes.length > 0) station.notes = notes.join(' · ').slice(0, 300)

  return station
}

function uniqueDetails(details: string[]): string[] {
  return Array.from(new Set(details.filter(Boolean))).slice(0, 7)
}

function adjustmentSignals(summary: CardioSessionSummaryData, locale: AppLocale): {
  type: CardioAdjustmentDraft['adjustmentType']
  powerMultiplier: number
  restDeltaSeconds: number
  rationale: string[]
  stationNote: string | null
} {
  const planned = summary.plannedVsActual
  const values = answerValues(summary.log.debrief?.answers)
  const highRpe = (summary.log.sessionRPE ?? 0) >= 8
  const pain = Boolean(summary.coachReview.painFlag) || summary.coachReview.flags.some((flag) => flag.severity === 'urgent')
  const notEnoughRecovery = values.has('not_enough') || planned?.heartRateRecovery.status === 'slow'
  const targetTooHard = values.has('too_hard') || values.has('load_too_high')
  const targetTooEasy = values.has('too_easy')
  const missedPlan = (planned?.missedWindows ?? 0) > 0 || (planned?.executionScore ?? 100) < 75
  const lowPowerHitRate = planned?.powerHitRate != null && planned.powerHitRate < 0.75

  if (pain) {
    return {
      type: 'deload',
      powerMultiplier: 0.9,
      restDeltaSeconds: 30,
      rationale: uniqueDetails([
        text(locale, 'Pain or injury was mentioned.', 'Smärta eller skada nämndes.'),
        text(locale, 'Next dose is reduced until symptoms are reviewed.', 'Nästa dos sänks tills symtomen har granskats.'),
      ]),
      stationNote: text(locale, 'Reduced because pain was mentioned', 'Sänkt eftersom smärta nämndes'),
    }
  }

  if (targetTooHard || notEnoughRecovery || (highRpe && missedPlan) || lowPowerHitRate) {
    return {
      type: 'deload',
      powerMultiplier: targetTooHard || lowPowerHitRate ? 0.95 : 0.97,
      restDeltaSeconds: notEnoughRecovery ? 30 : 15,
      rationale: uniqueDetails([
        targetTooHard ? text(locale, 'Athlete reported that the target felt too hard.', 'Atleten upplevde att målet var för hårt.') : '',
        notEnoughRecovery ? text(locale, 'Recovery looked or felt too short.', 'Vilan såg ut eller kändes för kort.') : '',
        lowPowerHitRate ? text(locale, 'Power targets were missed often enough to reduce the next dose.', 'Wattmålen missades tillräckligt ofta för att sänka nästa dos.') : '',
        highRpe && missedPlan ? text(locale, 'High RPE combined with missed execution.', 'Hög RPE kombinerat med missad genomförandegrad.') : '',
      ]),
      stationNote: text(locale, 'Adjusted down from last session', 'Sänkt från föregående pass'),
    }
  }

  if (targetTooEasy || (planned?.executionScore != null && planned.executionScore >= 90 && (summary.log.sessionRPE ?? 10) <= 6)) {
    return {
      type: 'progression',
      powerMultiplier: 1.03,
      restDeltaSeconds: 0,
      rationale: uniqueDetails([
        targetTooEasy
          ? text(locale, 'Athlete reported the target felt too easy.', 'Atleten upplevde att målet var för lätt.')
          : text(locale, 'Execution was strong with manageable RPE.', 'Genomförandet var starkt med hanterbar RPE.'),
      ]),
      stationNote: text(locale, 'Small progression from repeatable session', 'Liten stegring från repeterbart pass'),
    }
  }

  return {
    type: 'repeat',
    powerMultiplier: 1,
    restDeltaSeconds: 0,
    rationale: [
      text(locale, 'No major adjustment signal found; repeat the same dose.', 'Ingen tydlig justeringssignal hittades; upprepa samma dos.'),
    ],
    stationNote: text(locale, 'Repeat same dose', 'Upprepa samma dos'),
  }
}

function firstSegmentMinutes(segments: FocusModeSegment[], type: 'WARMUP' | 'COOLDOWN'): number | undefined {
  const segment = segments.find((item) => item.type === type && item.plannedDuration != null)
  if (!segment?.plannedDuration) return undefined
  return clampInt(segment.plannedDuration / 60, 1, 60)
}

export function buildCardioDebriefAdjustmentDraft(input: {
  summary: CardioSessionSummaryData
  focusSegments: FocusModeSegment[]
  locale: AppLocale
  now?: Date
  targetDate?: string
}): CardioAdjustmentDraft | null {
  const workSegments = sourceWorkSegments(input.focusSegments)
  if (workSegments.length === 0) return null

  const signals = adjustmentSignals(input.summary, input.locale)
  const repeatGroup = primaryRepeatGroup(workSegments)
  const stationSegments = repeatGroup
    ? workSegments.filter((segment) => segment.groupId === repeatGroup.groupId && segment.roundIndex === 0)
    : workSegments.slice(0, 10)

  if (stationSegments.length === 0) return null

  const rounds = repeatGroup?.roundCount ?? 1
  const sourceRest = repeatGroup
    ? input.focusSegments.find((segment) =>
        segment.groupId === repeatGroup.groupId &&
        segment.type === 'RECOVERY' &&
        segment.plannedDuration != null
      )?.plannedDuration
    : undefined
  const adjustedRest = rounds > 1
    ? clampInt((sourceRest ?? 60) + signals.restDeltaSeconds, 5, 600)
    : undefined

  const workoutInput: CreateCardioWorkoutInput = {
    name: `${input.summary.session.name} ${text(input.locale, 'adjusted', 'justerat')}`.slice(0, 120),
    description: `${text(input.locale, 'Adjusted from', 'Justerat från')} ${input.summary.session.name}. ${signals.rationale.join(' ')}`.slice(0, 500),
    sport: input.summary.session.sport as CreateCardioWorkoutInput['sport'],
    date: input.targetDate ?? tomorrowStockholm(input.now),
    warmupMinutes: firstSegmentMinutes(input.focusSegments, 'WARMUP'),
    cooldownMinutes: firstSegmentMinutes(input.focusSegments, 'COOLDOWN'),
    rounds,
    restBetweenRoundsSeconds: adjustedRest,
    stations: stationSegments.map((segment) =>
      stationFromSegment(segment, signals.powerMultiplier, signals.stationNote)
    ),
  }

  const preview = buildCreateCardioWorkoutPreview(workoutInput, input.locale)
  const extraDetails = [
    `${text(input.locale, 'Adjustment', 'Justering')}: ${signals.rationale.join(' ')}`,
    input.summary.plannedVsActual
      ? `${text(input.locale, 'Execution score', 'Genomförandescore')}: ${input.summary.plannedVsActual.executionScore}/100`
      : null,
    input.summary.log.sessionRPE != null ? `RPE: ${input.summary.log.sessionRPE}/10` : null,
    text(input.locale, 'Nothing changes until this card is confirmed.', 'Inget ändras förrän kortet bekräftas.'),
  ].filter((detail): detail is string => Boolean(detail))

  return {
    input: workoutInput,
    preview: {
      ...preview,
      title: text(input.locale, 'Create adjusted cardio workout', 'Skapa justerat konditionspass'),
      description: text(
        input.locale,
        'Review this debrief-driven adjustment before it is added to training.',
        'Granska den debrief-styrda justeringen innan den läggs till i träningen.',
      ),
      details: uniqueDetails([...extraDetails, ...preview.details]),
      confirmLabel: text(input.locale, 'Create adjusted workout', 'Skapa justerat pass'),
    },
    rationale: signals.rationale,
    adjustmentType: signals.type,
  }
}

// Post-workout summary assembly for cardio focus-mode sessions.
//
// Rebuilds per-round splits from the flat CardioSegmentLog sequence (round
// provenance comes from buildCardioFocusModeSegments' groupId/roundIndex tags)
// and derives the analytics the summary screens render: round splits, fade
// across rounds, per-equipment comparison and calorie-target adherence.
//
// Window scoring: an EMOM-style segment (fixed duration + calorie goal) is
// scored by calories achieved; a calorie-target segment without a duration
// (e.g. "row 16 cal for time") is scored by time to complete. Sessions can mix
// both — every consumer checks `scoreKind` per window, not per session.

import type { Prisma } from '@prisma/client'
import {
  buildCardioFocusModeSegments,
  type AppLocale,
  type FocusModeSegment,
} from './focus-mode-segments'

const WORK_TYPES = new Set(['INTERVAL', 'STEADY', 'HILL', 'DRILLS'])

export type WindowScoreKind = 'calories' | 'time' | 'none'

export interface SummaryWindow {
  index: number
  typeName: string
  equipment: string | null
  groupId: string | null
  round: number | null // 1-based
  roundCount: number | null
  scoreKind: WindowScoreKind
  plannedDuration: number | null // seconds
  plannedCalories: number | null
  plannedPower: number | null
  actualDuration: number | null // seconds
  actualCalories: number | null
  actualDistance: number | null // km
  actualAvgPower: number | null
  actualMaxPower: number | null
  actualAvgHR: number | null
  actualMaxHR: number | null
  completed: boolean
  skipped: boolean
}

export interface RoundSummary {
  round: number // 1-based
  groupId: string
  windows: SummaryWindow[]
  complete: boolean // every window in the round logged as completed
  totalCalories: number | null
  totalWorkSeconds: number | null
  avgPower: number | null // duration-weighted across windows
  avgHR: number | null
  maxHR: number | null
}

export interface EquipmentSummary {
  equipment: string | null
  windows: number
  completedWindows: number
  scoreKind: WindowScoreKind
  totalCalories: number | null
  avgCalories: number | null // per completed window
  bestCalories: number | null
  worstCalories: number | null
  avgWindowSeconds: number | null
  bestWindowSeconds: number | null // fastest, for time-scored windows
  worstWindowSeconds: number | null
  avgPower: number | null
  maxPower: number | null
  avgHR: number | null
  maxHR: number | null
  targetCalories: number | null // per-window target when uniform across windows
  targetHitRate: number | null // share of completed windows reaching the target
  // First vs last completed window on this equipment. Negative = decline for
  // calorie scores; positive = slower for time scores.
  fadePercent: number | null
}

export interface RoundFade {
  metric: 'calories' | 'workSeconds'
  firstRound: number
  lastRound: number
  firstValue: number
  lastValue: number
  percent: number // signed: negative = fewer calories / faster
  bestRound: number
  worstRound: number
}

export interface CalorieAdherence {
  plannedTotal: number
  actualTotal: number
  scoredWindows: number
  hitWindows: number // actual >= planned
}

export interface CardioSessionSummaryData {
  session: {
    id: string
    name: string
    description: string | null
    sport: string
  }
  log: {
    id: string
    startedAt: string
    completedAt: string | null
    status: string
    actualDuration: number | null
    sessionRPE: number | null
    notes: string | null
    avgHeartRate: number | null
    maxHeartRate: number | null
  }
  totals: {
    segments: number
    completedSegments: number
    skippedSegments: number
    workSeconds: number | null
    restSeconds: number | null
    calories: number | null
    distanceKm: number | null
    avgPower: number | null
    maxPower: number | null
  }
  rounds: RoundSummary[]
  roundFade: RoundFade | null
  equipment: EquipmentSummary[]
  calorieAdherence: CalorieAdherence | null
  windows: SummaryWindow[] // all work windows in execution order
}

function sum(values: Array<number | null | undefined>): number | null {
  const present = values.filter((v): v is number => typeof v === 'number')
  if (present.length === 0) return null
  return present.reduce((a, b) => a + b, 0)
}

function mean(values: Array<number | null | undefined>): number | null {
  const present = values.filter((v): v is number => typeof v === 'number')
  if (present.length === 0) return null
  return present.reduce((a, b) => a + b, 0) / present.length
}

function max(values: Array<number | null | undefined>): number | null {
  const present = values.filter((v): v is number => typeof v === 'number')
  if (present.length === 0) return null
  return Math.max(...present)
}

/** Average power weighted by each window's duration (falls back to plain mean). */
function weightedAvgPower(windows: SummaryWindow[]): number | null {
  const withPower = windows.filter((w) => w.actualAvgPower != null)
  if (withPower.length === 0) return null
  const allDurations = withPower.every((w) => (w.actualDuration ?? w.plannedDuration) != null)
  if (!allDurations) return Math.round(mean(withPower.map((w) => w.actualAvgPower))!)
  let powerSum = 0
  let weightSum = 0
  for (const w of withPower) {
    const weight = (w.actualDuration ?? w.plannedDuration)!
    powerSum += w.actualAvgPower! * weight
    weightSum += weight
  }
  return weightSum > 0 ? Math.round(powerSum / weightSum) : null
}

function windowScoreKind(seg: FocusModeSegment): WindowScoreKind {
  if (seg.plannedCalories != null && seg.plannedDuration != null) return 'calories'
  if (seg.plannedCalories != null) return 'time'
  return 'none'
}

function toWindow(seg: FocusModeSegment): SummaryWindow {
  return {
    index: seg.index,
    typeName: seg.typeName,
    equipment: seg.equipment ?? null,
    groupId: seg.groupId ?? null,
    round: seg.roundIndex != null ? seg.roundIndex + 1 : null,
    roundCount: seg.roundCount ?? null,
    scoreKind: windowScoreKind(seg),
    plannedDuration: seg.plannedDuration ?? null,
    plannedCalories: seg.plannedCalories ?? null,
    plannedPower: seg.plannedPower ?? null,
    actualDuration: seg.actualDuration ?? null,
    actualCalories: seg.actualCalories ?? null,
    actualDistance: seg.actualDistance ?? null,
    actualAvgPower: seg.actualAvgPower ?? null,
    actualMaxPower: seg.actualMaxPower ?? null,
    actualAvgHR: seg.actualAvgHR ?? null,
    actualMaxHR: seg.actualMaxHR ?? null,
    completed: seg.completed,
    skipped: seg.skipped,
  }
}

function buildRounds(windows: SummaryWindow[]): RoundSummary[] {
  const byRound = new Map<string, SummaryWindow[]>()
  for (const w of windows) {
    if (w.groupId == null || w.round == null) continue
    const key = `${w.groupId}#${w.round}`
    const list = byRound.get(key)
    if (list) list.push(w)
    else byRound.set(key, [w])
  }
  const rounds: RoundSummary[] = []
  for (const [key, ws] of byRound) {
    const [groupId, roundStr] = key.split('#')
    rounds.push({
      round: parseInt(roundStr, 10),
      groupId,
      windows: ws,
      complete: ws.every((w) => w.completed),
      totalCalories: sum(ws.map((w) => w.actualCalories)),
      totalWorkSeconds: sum(ws.map((w) => w.actualDuration)),
      avgPower: weightedAvgPower(ws),
      avgHR: mean(ws.map((w) => w.actualAvgHR)) != null
        ? Math.round(mean(ws.map((w) => w.actualAvgHR))!)
        : null,
      maxHR: max(ws.map((w) => w.actualMaxHR)),
    })
  }
  rounds.sort((a, b) => a.groupId === b.groupId
    ? a.round - b.round
    : a.windows[0].index - b.windows[0].index)
  return rounds
}

function buildRoundFade(rounds: RoundSummary[]): RoundFade | null {
  // Fade only makes sense within one repeat group; use the largest.
  const groups = new Map<string, RoundSummary[]>()
  for (const r of rounds) {
    const list = groups.get(r.groupId)
    if (list) list.push(r)
    else groups.set(r.groupId, [r])
  }
  let target: RoundSummary[] | null = null
  for (const list of groups.values()) {
    if (!target || list.length > target.length) target = list
  }
  if (!target) return null

  const complete = target.filter((r) => r.complete)
  if (complete.length < 2) return null

  // Score rounds by calories when available on every complete round (EMOM),
  // otherwise by total work time (calorie-target-for-time sessions).
  const useCalories = complete.every((r) => r.totalCalories != null)
  const metric = useCalories ? 'calories' as const : 'workSeconds' as const
  const value = (r: RoundSummary) =>
    useCalories ? r.totalCalories! : r.totalWorkSeconds
  if (!useCalories && complete.some((r) => r.totalWorkSeconds == null)) return null

  const first = complete[0]
  const last = complete[complete.length - 1]
  const firstValue = value(first)!
  const lastValue = value(last)!
  if (firstValue === 0) return null

  let bestRound = first
  let worstRound = first
  for (const r of complete) {
    const v = value(r)!
    const bestV = value(bestRound)!
    const worstV = value(worstRound)!
    // calories: higher is better; time: lower is better
    if (useCalories ? v > bestV : v < bestV) bestRound = r
    if (useCalories ? v < worstV : v > worstV) worstRound = r
  }

  return {
    metric,
    firstRound: first.round,
    lastRound: last.round,
    firstValue,
    lastValue,
    percent: ((lastValue - firstValue) / firstValue) * 100,
    bestRound: bestRound.round,
    worstRound: worstRound.round,
  }
}

function buildEquipmentSummaries(windows: SummaryWindow[]): EquipmentSummary[] {
  const byEquipment = new Map<string, SummaryWindow[]>()
  for (const w of windows) {
    const key = w.equipment ?? ''
    const list = byEquipment.get(key)
    if (list) list.push(w)
    else byEquipment.set(key, [w])
  }

  const summaries: EquipmentSummary[] = []
  for (const [key, ws] of byEquipment) {
    const completed = ws.filter((w) => w.completed)
    const kinds = new Set(completed.map((w) => w.scoreKind))
    const scoreKind: WindowScoreKind = kinds.size === 1 ? completed[0]?.scoreKind ?? 'none' : 'none'

    const calories = completed.map((w) => w.actualCalories)
    const durations = completed.map((w) => w.actualDuration)
    const targets = ws.map((w) => w.plannedCalories).filter((v): v is number => v != null)
    const uniformTarget = targets.length === ws.length && new Set(targets).size === 1
      ? targets[0]
      : null

    const scored = completed.filter(
      (w) => w.plannedCalories != null && w.actualCalories != null
    )
    const hitRate = scored.length > 0
      ? scored.filter((w) => w.actualCalories! >= w.plannedCalories!).length / scored.length
      : null

    // First vs last completed window: calories (negative = decline) or time
    // (positive = slower) depending on how this equipment's windows are scored.
    let fadePercent: number | null = null
    if (completed.length >= 2) {
      const pick = (w: SummaryWindow) =>
        scoreKind === 'calories' ? w.actualCalories
          : scoreKind === 'time' ? w.actualDuration
            : null
      const firstVal = pick(completed[0])
      const lastVal = pick(completed[completed.length - 1])
      if (firstVal != null && lastVal != null && firstVal !== 0) {
        fadePercent = ((lastVal - firstVal) / firstVal) * 100
      }
    }

    const avgCal = mean(calories)
    const avgDur = mean(durations)
    const avgHR = mean(completed.map((w) => w.actualAvgHR))
    summaries.push({
      equipment: key === '' ? null : key,
      windows: ws.length,
      completedWindows: completed.length,
      scoreKind,
      totalCalories: sum(calories),
      avgCalories: avgCal != null ? Math.round(avgCal * 10) / 10 : null,
      bestCalories: max(calories),
      worstCalories: calories.some((c) => c != null)
        ? Math.min(...calories.filter((c): c is number => c != null))
        : null,
      avgWindowSeconds: avgDur != null ? Math.round(avgDur) : null,
      bestWindowSeconds: durations.some((d) => d != null)
        ? Math.min(...durations.filter((d): d is number => d != null))
        : null,
      worstWindowSeconds: max(durations),
      avgPower: weightedAvgPower(completed),
      maxPower: max(completed.map((w) => w.actualMaxPower)),
      avgHR: avgHR != null ? Math.round(avgHR) : null,
      maxHR: max(completed.map((w) => w.actualMaxHR)),
      targetCalories: uniformTarget,
      targetHitRate: hitRate,
      fadePercent,
    })
  }

  summaries.sort((a, b) => b.windows - a.windows)
  return summaries
}

export interface BuildSummaryInput {
  session: {
    id: string
    name: string
    description: string | null
    sport: string
    segments: Prisma.JsonValue
  }
  log: {
    id: string
    startedAt: Date
    completedAt: Date | null
    status: string
    actualDuration: number | null
    sessionRPE: number | null
    notes: string | null
    avgHeartRate: number | null
    maxHeartRate: number | null
    segmentLogs: Array<{
      id: string
      segmentIndex: number
      actualDuration: number | null
      actualDistance: number | null
      actualPace: number | null
      actualAvgHR: number | null
      actualMaxHR: number | null
      actualAvgPower: number | null
      actualMaxPower: number | null
      actualCalories: number | null
      completed: boolean
      skipped: boolean
    }>
  }
  locale: AppLocale
}

export function buildCardioSessionSummary({
  session,
  log,
  locale,
}: BuildSummaryInput): CardioSessionSummaryData {
  const segments = buildCardioFocusModeSegments({
    segments: session.segments,
    segmentLogs: log.segmentLogs,
    locale,
  })

  const workSegments = segments.filter((s) => WORK_TYPES.has(s.type))
  const restSegments = segments.filter((s) => !WORK_TYPES.has(s.type))
  const windows = workSegments.map(toWindow)
  const rounds = buildRounds(windows)

  const scored = windows.filter(
    (w) => w.completed && w.plannedCalories != null && w.actualCalories != null
  )
  const calorieAdherence: CalorieAdherence | null = scored.length > 0
    ? {
        plannedTotal: scored.reduce((a, w) => a + w.plannedCalories!, 0),
        actualTotal: scored.reduce((a, w) => a + w.actualCalories!, 0),
        scoredWindows: scored.length,
        hitWindows: scored.filter((w) => w.actualCalories! >= w.plannedCalories!).length,
      }
    : null

  const completedWindows = windows.filter((w) => w.completed)
  return {
    session: {
      id: session.id,
      name: session.name,
      description: session.description,
      sport: session.sport,
    },
    log: {
      id: log.id,
      startedAt: log.startedAt.toISOString(),
      completedAt: log.completedAt ? log.completedAt.toISOString() : null,
      status: log.status,
      actualDuration: log.actualDuration,
      sessionRPE: log.sessionRPE,
      notes: log.notes,
      avgHeartRate: log.avgHeartRate,
      maxHeartRate: log.maxHeartRate,
    },
    totals: {
      segments: segments.length,
      completedSegments: segments.filter((s) => s.completed).length,
      skippedSegments: segments.filter((s) => s.skipped).length,
      workSeconds: sum(workSegments.map((s) => s.actualDuration ?? s.plannedDuration)),
      restSeconds: sum(restSegments.map((s) => s.actualDuration ?? s.plannedDuration)),
      calories: sum(segments.map((s) => s.actualCalories)),
      distanceKm: sum(segments.map((s) => s.actualDistance)),
      avgPower: weightedAvgPower(completedWindows),
      maxPower: max(completedWindows.map((w) => w.actualMaxPower)),
    },
    rounds,
    roundFade: buildRoundFade(rounds),
    equipment: buildEquipmentSummaries(windows),
    calorieAdherence,
    windows,
  }
}

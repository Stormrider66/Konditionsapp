import type { LiveMachineMetrics } from './types'

export type CardioLiveInsightKind =
  | 'POWER_TARGET'
  | 'CADENCE'
  | 'RECOVERY'
  | 'CONSISTENCY'
  | 'GUARDRAIL'

export interface CardioLiveInsight {
  kind: CardioLiveInsightKind
  severity: 'info' | 'warning' | 'urgent'
  message: string
  key: string
}

export interface CardioLiveInsightInput {
  nowMs: number
  metrics: LiveMachineMetrics
  segmentIndex: number
  segmentType?: string
  segmentTypeName?: string
  isWorkSegment: boolean
  segmentElapsedSeconds: number
  segmentPlannedDurationSeconds?: number | null
  currentSegmentAvgPower?: number | null
  previousWorkAvgPowers?: number[]
  painMentioned?: boolean
}

export interface CardioLiveInsightState {
  powerIssueStartedAtMs?: number
  powerIssueDirection?: 'high' | 'low'
  cadenceIssueStartedAtMs?: number
  recoveryIssueStartedAtMs?: number
  guardrailIssueStartedAtMs?: number
  emittedConsistencySegments: number[]
  lastEmittedAtByKey: Record<string, number>
}

export function createCardioLiveInsightState(): CardioLiveInsightState {
  return {
    emittedConsistencySegments: [],
    lastEmittedAtByKey: {},
  }
}

function hasNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function elapsed(startMs: number | undefined, nowMs: number): number {
  return startMs == null ? 0 : Math.max(0, (nowMs - startMs) / 1000)
}

function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 1
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2
}

function canEmit(state: CardioLiveInsightState, key: string, nowMs: number, cooldownMs = 45_000): boolean {
  const last = state.lastEmittedAtByKey[key]
  return last == null || nowMs - last >= cooldownMs
}

function markEmitted(state: CardioLiveInsightState, insight: CardioLiveInsight, nowMs: number): CardioLiveInsight {
  state.lastEmittedAtByKey[insight.key] = nowMs
  return insight
}

function powerTargetInsight(input: CardioLiveInsightInput, state: CardioLiveInsightState): CardioLiveInsight | null {
  const { metrics, nowMs } = input
  if (!input.isWorkSegment || !metrics.isTimerRunning) {
    state.powerIssueStartedAtMs = undefined
    state.powerIssueDirection = undefined
    return null
  }
  if (!hasNumber(metrics.power) || !hasNumber(metrics.targetPower) || metrics.targetPower < 60) return null

  const diff = metrics.power - metrics.targetPower
  const diffPct = diff / metrics.targetPower
  const direction = diffPct >= 0.1 && diff >= 15
    ? 'high'
    : diffPct <= -0.1 && diff <= -15
      ? 'low'
      : null

  if (!direction) {
    state.powerIssueStartedAtMs = undefined
    state.powerIssueDirection = undefined
    return null
  }

  if (state.powerIssueDirection !== direction) {
    state.powerIssueStartedAtMs = nowMs
    state.powerIssueDirection = direction
  }

  if (elapsed(state.powerIssueStartedAtMs, nowMs) < 20) return null

  const key = `power:${input.segmentIndex}:${direction}`
  if (!canEmit(state, key, nowMs)) return null

  const watts = Math.abs(Math.round(diff))
  const message = direction === 'high'
    ? `Power is ${watts} W above target for this interval. Cue the athlete to settle slightly while keeping rhythm.`
    : `Power is ${watts} W below target for this interval. Cue the athlete to bring it up gradually.`

  return markEmitted(state, {
    kind: 'POWER_TARGET',
    severity: 'info',
    message,
    key,
  }, nowMs)
}

function cadenceInsight(input: CardioLiveInsightInput, state: CardioLiveInsightState): CardioLiveInsight | null {
  const { metrics, nowMs } = input
  if (!input.isWorkSegment || !metrics.isTimerRunning) {
    state.cadenceIssueStartedAtMs = undefined
    return null
  }

  const cadence = metrics.cadence ?? metrics.strokeRate
  if (!hasNumber(cadence)) return null

  const lowCadence = metrics.cadence != null
    ? cadence < 75
    : cadence < 20
  const highTorque =
    metrics.cadence != null &&
    lowCadence &&
    hasNumber(metrics.power) &&
    hasNumber(metrics.targetPower) &&
    metrics.power >= metrics.targetPower * 0.95

  if (!lowCadence) {
    state.cadenceIssueStartedAtMs = undefined
    return null
  }

  state.cadenceIssueStartedAtMs ??= nowMs
  if (elapsed(state.cadenceIssueStartedAtMs, nowMs) < 20) return null

  const key = `cadence:${input.segmentIndex}:${metrics.cadence != null ? 'rpm' : 'spm'}`
  if (!canEmit(state, key, nowMs)) return null

  const unit = metrics.cadence != null ? 'rpm' : 'spm'
  const message = highTorque
    ? `Cadence is low at ${Math.round(cadence)} ${unit} while power is on target. Cue smoother spinning and less torque.`
    : `Cadence is low at ${Math.round(cadence)} ${unit}. Cue the athlete to lift rhythm and stay relaxed.`

  return markEmitted(state, {
    kind: 'CADENCE',
    severity: 'info',
    message,
    key,
  }, nowMs)
}

function recoveryInsight(input: CardioLiveInsightInput, state: CardioLiveInsightState): CardioLiveInsight | null {
  const { metrics, nowMs } = input
  const isRecovery = metrics.isTimerRunning && (input.segmentType === 'RECOVERY' || !input.isWorkSegment)
  if (!isRecovery) {
    state.recoveryIssueStartedAtMs = undefined
    return null
  }
  if (!hasNumber(metrics.heartRate) && !hasNumber(metrics.heartRateZone)) return null

  const highRecoveryHr =
    (hasNumber(metrics.heartRateZone) && metrics.heartRateZone >= 4) ||
    (hasNumber(metrics.heartRate) && metrics.heartRate >= 165)

  if (!highRecoveryHr) {
    state.recoveryIssueStartedAtMs = undefined
    return null
  }

  state.recoveryIssueStartedAtMs ??= nowMs
  if (elapsed(state.recoveryIssueStartedAtMs, nowMs) < 15) return null

  const key = `recovery:${input.segmentIndex}`
  if (!canEmit(state, key, nowMs, 60_000)) return null

  const message = hasNumber(metrics.timeRemainingSeconds) && metrics.timeRemainingSeconds <= 35
    ? `Heart rate is still high late in recovery. Cue a controlled start to the next interval.`
    : `Heart rate is still high during recovery. Cue slower breathing and relaxed legs.`

  return markEmitted(state, {
    kind: 'RECOVERY',
    severity: 'warning',
    message,
    key,
  }, nowMs)
}

function consistencyInsight(input: CardioLiveInsightInput, state: CardioLiveInsightState): CardioLiveInsight | null {
  const previous = input.previousWorkAvgPowers ?? []
  if (
    !input.isWorkSegment ||
    !input.metrics.isTimerRunning ||
    previous.length < 2 ||
    !hasNumber(input.currentSegmentAvgPower)
  ) {
    return null
  }
  if (input.segmentElapsedSeconds < 45) return null
  if (state.emittedConsistencySegments.includes(input.segmentIndex)) return null

  const reference = median(previous.slice(-4))
  if (!reference || reference < 60) return null

  const diffPct = (input.currentSegmentAvgPower - reference) / reference
  if (Math.abs(diffPct) < 0.08) return null

  state.emittedConsistencySegments.push(input.segmentIndex)
  const delta = Math.abs(Math.round(input.currentSegmentAvgPower - reference))
  return {
    kind: 'CONSISTENCY',
    severity: 'info',
    key: `consistency:${input.segmentIndex}:${diffPct > 0 ? 'high' : 'low'}`,
    message: diffPct > 0
      ? `This interval is averaging ${delta} W above recent reps. Cue control so the athlete can repeat it.`
      : `This interval is averaging ${delta} W below recent reps. Cue form, breathing, and sustainable pressure.`,
  }
}

function guardrailInsight(input: CardioLiveInsightInput, state: CardioLiveInsightState): CardioLiveInsight | null {
  const { metrics, nowMs } = input
  if (!metrics.isTimerRunning || (!input.isWorkSegment && !input.painMentioned)) {
    state.guardrailIssueStartedAtMs = undefined
    return null
  }

  const lowPower =
    hasNumber(metrics.targetPower) &&
    hasNumber(input.currentSegmentAvgPower) &&
    input.currentSegmentAvgPower <= metrics.targetPower * 0.86
  const lowCadence = hasNumber(metrics.cadence) ? metrics.cadence < 70 : false
  const highHr =
    (hasNumber(metrics.heartRateZone) && metrics.heartRateZone >= 5) ||
    (hasNumber(metrics.heartRate) && metrics.heartRate >= 178)
  const concernCluster = input.painMentioned === true || (input.isWorkSegment && lowPower && lowCadence && highHr)

  if (!concernCluster) {
    state.guardrailIssueStartedAtMs = undefined
    return null
  }

  state.guardrailIssueStartedAtMs ??= nowMs
  if (!input.painMentioned && elapsed(state.guardrailIssueStartedAtMs, nowMs) < 20) return null

  const key = `guardrail:${input.segmentIndex}:${input.painMentioned ? 'pain' : 'fatigue'}`
  if (!canEmit(state, key, nowMs, 90_000)) return null

  const message = input.painMentioned
    ? `Pain or injury concern is recorded. Cue the athlete to stop or back off and contact the coach if pain persists.`
    : `Fatigue markers are stacking: power is below target, cadence is low, and heart rate is high. Cue backing off and prioritizing control.`

  return markEmitted(state, {
    kind: 'GUARDRAIL',
    severity: input.painMentioned ? 'urgent' : 'warning',
    message,
    key,
  }, nowMs)
}

export function evaluateCardioLiveInsight(
  input: CardioLiveInsightInput,
  state: CardioLiveInsightState,
): CardioLiveInsight | null {
  if (!input.metrics.available || input.segmentElapsedSeconds < 10) return null

  return (
    guardrailInsight(input, state) ||
    recoveryInsight(input, state) ||
    powerTargetInsight(input, state) ||
    cadenceInsight(input, state) ||
    consistencyInsight(input, state)
  )
}

export function formatCardioLiveInsightForCoach(insight: CardioLiveInsight): string {
  return `[COACHING INSIGHT] ${insight.kind} ${insight.severity}: ${insight.message}`
}

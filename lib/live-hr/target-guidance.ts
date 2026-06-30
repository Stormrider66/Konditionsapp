import type {
  LiveHRParticipantData,
  LiveHRWorkflowBlock,
  LiveHRWorkoutTargetStep,
} from './types'

export type LiveHRTargetStatus = 'waiting' | 'on' | 'low' | 'high'
export type LiveHRTargetMetricKey = 'power' | 'cadence' | 'zone' | 'heartRate'

export interface LiveHRTargetMetric {
  key: LiveHRTargetMetricKey
  status: LiveHRTargetStatus
  actualLabel: string
  targetLabel: string
  deltaLabel?: string
}

export interface LiveHRTargetTimer {
  elapsedSeconds: number
  remainingSeconds: number
  durationSeconds: number
  progress: number
  isOvertime: boolean
}

export interface LiveHRTargetGuidance {
  step: LiveHRWorkoutTargetStep | null
  metrics: LiveHRTargetMetric[]
  timer: LiveHRTargetTimer | null
  status: LiveHRTargetStatus | 'none'
}

function compareNumeric(
  actual: number | null | undefined,
  target: number,
  tolerance: number,
  unit = ''
): Pick<LiveHRTargetMetric, 'status' | 'actualLabel' | 'targetLabel' | 'deltaLabel'> {
  if (actual == null) {
    return {
      status: 'waiting',
      actualLabel: '-',
      targetLabel: `${target}${unit}`,
    }
  }

  const delta = actual - target
  const status: LiveHRTargetStatus = delta < -tolerance ? 'low' : delta > tolerance ? 'high' : 'on'
  const roundedDelta = Math.round(delta)

  return {
    status,
    actualLabel: `${Math.round(actual)}${unit}`,
    targetLabel: `${target}${unit}`,
    deltaLabel: roundedDelta === 0 ? '0' : `${roundedDelta > 0 ? '+' : ''}${roundedDelta}${unit}`,
  }
}

function parseHeartRateRange(value: string): { min?: number; max?: number } | null {
  const numbers = value.match(/\d+/g)?.map(Number).filter(Number.isFinite) ?? []
  if (numbers.length === 0) return null
  if (numbers.length === 1) return { min: numbers[0], max: numbers[0] }
  return { min: Math.min(numbers[0], numbers[1]), max: Math.max(numbers[0], numbers[1]) }
}

function heartRateMetric(participant: LiveHRParticipantData, target: string): LiveHRTargetMetric | null {
  const range = parseHeartRateRange(target)
  if (!range) return null
  const actual = participant.heartRate
  if (actual == null) {
    return { key: 'heartRate', status: 'waiting', actualLabel: '-', targetLabel: target }
  }

  const min = range.min ?? range.max ?? 0
  const max = range.max ?? range.min ?? min
  const status: LiveHRTargetStatus = actual < min ? 'low' : actual > max ? 'high' : 'on'
  return {
    key: 'heartRate',
    status,
    actualLabel: `${actual} bpm`,
    targetLabel: target,
    deltaLabel: status === 'on' ? '0' : actual < min ? `${actual - min} bpm` : `+${actual - max} bpm`,
  }
}

function timerForBlock(
  activeBlock: LiveHRWorkflowBlock | null | undefined,
  step: LiveHRWorkoutTargetStep | null,
  nowMs: number
): LiveHRTargetTimer | null {
  const durationSeconds = activeBlock?.target?.durationSeconds ?? step?.durationSeconds
  if (!activeBlock || activeBlock.endedAt || !durationSeconds) return null

  const startedAt = new Date(activeBlock.startedAt).getTime()
  if (!Number.isFinite(startedAt)) return null

  const elapsedSeconds = Math.max(0, Math.floor((nowMs - startedAt) / 1000))
  const remainingSeconds = durationSeconds - elapsedSeconds

  return {
    elapsedSeconds,
    remainingSeconds: Math.max(0, remainingSeconds),
    durationSeconds,
    progress: Math.max(0, Math.min(1, elapsedSeconds / durationSeconds)),
    isOvertime: remainingSeconds < 0,
  }
}

function overallStatus(metrics: LiveHRTargetMetric[]): LiveHRTargetGuidance['status'] {
  if (metrics.length === 0) return 'none'
  const actionable = metrics.filter((metric) => metric.status !== 'waiting')
  if (actionable.length === 0) return 'waiting'
  if (actionable.some((metric) => metric.status === 'high')) return 'high'
  if (actionable.some((metric) => metric.status === 'low')) return 'low'
  return 'on'
}

export function buildLiveHRTargetGuidance(input: {
  participant: LiveHRParticipantData
  step?: LiveHRWorkoutTargetStep | null
  activeBlock?: LiveHRWorkflowBlock | null
  nowMs?: number
}): LiveHRTargetGuidance {
  const step = input.activeBlock?.target ?? input.step ?? null
  const metrics: LiveHRTargetMetric[] = []

  if (step?.targetPower) {
    const tolerance = Math.max(10, Math.round(step.targetPower * 0.05))
    metrics.push({
      key: 'power',
      ...compareNumeric(input.participant.power, step.targetPower, tolerance, ' W'),
    })
  }

  if (step?.targetCadence) {
    metrics.push({
      key: 'cadence',
      ...compareNumeric(input.participant.cadence, step.targetCadence, 5, ' rpm'),
    })
  }

  if (step?.targetZone) {
    const zone = input.participant.zone ?? input.participant.powerZone ?? null
    metrics.push({
      key: 'zone',
      ...compareNumeric(zone, step.targetZone, 0, ''),
    })
  }

  if (step?.targetHeartRate) {
    const metric = heartRateMetric(input.participant, step.targetHeartRate)
    if (metric) metrics.push(metric)
  }

  return {
    step,
    metrics,
    timer: timerForBlock(input.activeBlock, step, input.nowMs ?? Date.now()),
    status: overallStatus(metrics),
  }
}

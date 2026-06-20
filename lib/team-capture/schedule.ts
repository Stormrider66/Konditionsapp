import { TeamCaptureMachineType } from '@prisma/client'

import {
  equipmentDefinition,
  type TeamCaptureMethod,
  type TeamCaptureTargetMetric,
} from './equipment'

export interface TeamCaptureMemberInput {
  id: string
  name: string
  jerseyNumber?: number | null
  position?: string | null
}

export interface TeamCaptureSessionOptions {
  laneCount?: number
  roundCount?: number
  bikeCalories?: number
  rowCalories?: number
  runDistanceMeters?: number
  restBetweenRoundsSeconds?: number
  estimatedBikeSeconds?: number
  estimatedRowSeconds?: number
  estimatedRunSeconds?: number
  template?: TeamCaptureTemplate
}

export interface TeamCaptureStationTemplate {
  stationIndex: number
  equipmentKey: string
  label: string
  machineType: TeamCaptureMachineType
  captureMethod: TeamCaptureMethod
  targetMetric: TeamCaptureTargetMetric
  targetCalories?: number
  targetDistanceMeters?: number
  targetDurationSec?: number
  targetPower?: number
  estimatedSeconds: number
}

export interface TeamCaptureTemplate {
  source: 'DEFAULT' | 'CARDIO' | 'HYBRID' | 'AI_CARDIO' | 'AI_HYBRID'
  workoutType?: string
  workoutId?: string
  workoutName?: string
  name: string
  roundCount: number
  restBetweenRoundsSeconds: number
  stations: TeamCaptureStationTemplate[]
  summary: {
    stationCount: number
    bluetoothStationCount: number
    manualStationCount: number
    runStationCount: number
    estimatedSecondsPerRound: number
  }
}

export interface TeamCaptureParticipantPlan {
  clientId: string
  displayName: string
  jerseyNumber: number | null
  position: string | null
  laneNumber: number
  heatNumber: number
  startOrder: number
  expectedStartOffsetSec: number
}

export interface TeamCaptureStationPlan {
  laneNumber: number
  stationIndex: number
  machineType: TeamCaptureMachineType
  equipmentKey: string
  captureMethod: TeamCaptureMethod
  targetMetric: TeamCaptureTargetMetric
  label: string
}

export interface TeamCaptureSegmentPlan {
  clientId: string
  laneNumber: number
  heatNumber: number
  roundNumber: number
  segmentIndex: number
  stationIndex: number
  machineType: TeamCaptureMachineType
  equipmentKey: string
  captureMethod: TeamCaptureMethod
  label: string
  plannedStartSec: number
  plannedEndSec: number
  targetCalories?: number
  targetDistanceMeters?: number
  targetDurationSec?: number
  targetPower?: number
}

export interface TeamCaptureLanePlan {
  participants: TeamCaptureParticipantPlan[]
  stations: TeamCaptureStationPlan[]
  segments: TeamCaptureSegmentPlan[]
  heatDurationSec: number
  totalPlannedDurationSec: number
}

export const DEFAULT_TEAM_CAPTURE_OPTIONS = {
  laneCount: 6,
  roundCount: 10,
  bikeCalories: 20,
  rowCalories: 20,
  runDistanceMeters: 200,
  restBetweenRoundsSeconds: 60,
  estimatedBikeSeconds: 75,
  estimatedRowSeconds: 75,
  estimatedRunSeconds: 45,
} satisfies Omit<Required<TeamCaptureSessionOptions>, 'template'>

export function withTeamCaptureDefaults(
  options: TeamCaptureSessionOptions = {}
): Omit<Required<TeamCaptureSessionOptions>, 'template'> {
  return {
    laneCount: clampInt(options.laneCount, DEFAULT_TEAM_CAPTURE_OPTIONS.laneCount, 1, 12),
    roundCount: clampInt(options.roundCount, DEFAULT_TEAM_CAPTURE_OPTIONS.roundCount, 1, 30),
    bikeCalories: clampInt(options.bikeCalories, DEFAULT_TEAM_CAPTURE_OPTIONS.bikeCalories, 1, 200),
    rowCalories: clampInt(options.rowCalories, DEFAULT_TEAM_CAPTURE_OPTIONS.rowCalories, 1, 200),
    runDistanceMeters: clampInt(options.runDistanceMeters, DEFAULT_TEAM_CAPTURE_OPTIONS.runDistanceMeters, 10, 5000),
    restBetweenRoundsSeconds: clampInt(options.restBetweenRoundsSeconds, DEFAULT_TEAM_CAPTURE_OPTIONS.restBetweenRoundsSeconds, 0, 600),
    estimatedBikeSeconds: clampInt(options.estimatedBikeSeconds, DEFAULT_TEAM_CAPTURE_OPTIONS.estimatedBikeSeconds, 10, 900),
    estimatedRowSeconds: clampInt(options.estimatedRowSeconds, DEFAULT_TEAM_CAPTURE_OPTIONS.estimatedRowSeconds, 10, 900),
    estimatedRunSeconds: clampInt(options.estimatedRunSeconds, DEFAULT_TEAM_CAPTURE_OPTIONS.estimatedRunSeconds, 5, 900),
  }
}

export function buildDefaultTeamCaptureTemplate(options: TeamCaptureSessionOptions = {}): TeamCaptureTemplate {
  const defaults = withTeamCaptureDefaults(options)
  const stations: TeamCaptureStationTemplate[] = [
    createStationTemplate({
      stationIndex: 0,
      equipmentKey: 'BIKE_ERG',
      targetCalories: defaults.bikeCalories,
      estimatedSeconds: defaults.estimatedBikeSeconds,
    }),
    createStationTemplate({
      stationIndex: 1,
      equipmentKey: 'ROW',
      targetCalories: defaults.rowCalories,
      estimatedSeconds: defaults.estimatedRowSeconds,
    }),
    createStationTemplate({
      stationIndex: 2,
      equipmentKey: 'RUN',
      targetDistanceMeters: defaults.runDistanceMeters,
      estimatedSeconds: defaults.estimatedRunSeconds,
    }),
  ]

  return buildTemplateSummary({
    source: 'DEFAULT',
    workoutType: 'HYBRID',
    workoutName: '10 rounds - BikeErg / RowErg / Run',
    name: '10 rounds - BikeErg / RowErg / Run',
    roundCount: defaults.roundCount,
    restBetweenRoundsSeconds: defaults.restBetweenRoundsSeconds,
    stations,
  })
}

export function buildTeamCaptureStructure(options: TeamCaptureSessionOptions = {}) {
  const defaults = withTeamCaptureDefaults(options)
  const template = options.template ?? buildDefaultTeamCaptureTemplate(defaults)
  return {
    version: 2,
    mode: 'FIXED_LANES',
    identity: 'STARTLIST_TIMING',
    laneCount: defaults.laneCount,
    roundCount: template.roundCount,
    stations: template.stations,
    restBetweenRoundsSeconds: template.restBetweenRoundsSeconds,
    templateSource: template.source,
  }
}

export function buildTeamCaptureLanePlan(
  members: TeamCaptureMemberInput[],
  options: TeamCaptureSessionOptions = {}
): TeamCaptureLanePlan {
  const defaults = withTeamCaptureDefaults(options)
  const template = options.template ?? buildDefaultTeamCaptureTemplate(defaults)
  const roundWorkSec = template.stations.reduce((sum, station) => sum + station.estimatedSeconds, 0)
  const heatDurationSec =
    template.roundCount * roundWorkSec +
    Math.max(0, template.roundCount - 1) * template.restBetweenRoundsSeconds
  const participants = members.map((member, index) => {
    const heatNumber = Math.floor(index / defaults.laneCount) + 1
    const laneNumber = (index % defaults.laneCount) + 1
    return {
      clientId: member.id,
      displayName: member.name,
      jerseyNumber: member.jerseyNumber ?? null,
      position: member.position ?? null,
      laneNumber,
      heatNumber,
      startOrder: index + 1,
      expectedStartOffsetSec: (heatNumber - 1) * heatDurationSec,
    }
  })

  const stations: TeamCaptureStationPlan[] = []
  for (let laneNumber = 1; laneNumber <= defaults.laneCount; laneNumber++) {
    for (const station of template.stations.filter((item) => item.captureMethod === 'BLUETOOTH_STATION')) {
      stations.push({
        laneNumber,
        stationIndex: station.stationIndex,
        machineType: station.machineType,
        equipmentKey: station.equipmentKey,
        captureMethod: station.captureMethod,
        targetMetric: station.targetMetric,
        label: `Lane ${laneNumber} ${station.label}`,
      })
    }
  }

  const segments = participants.flatMap((participant) => {
    const out: TeamCaptureSegmentPlan[] = []
    for (let roundNumber = 1; roundNumber <= template.roundCount; roundNumber++) {
      const roundBase =
        participant.expectedStartOffsetSec +
        (roundNumber - 1) * (roundWorkSec + template.restBetweenRoundsSeconds)
      let cursor = roundBase
      for (const station of template.stations) {
        out.push({
          clientId: participant.clientId,
          laneNumber: participant.laneNumber,
          heatNumber: participant.heatNumber,
          roundNumber,
          segmentIndex: out.length,
          stationIndex: station.stationIndex,
          machineType: station.machineType,
          equipmentKey: station.equipmentKey,
          captureMethod: station.captureMethod,
          label: `Round ${roundNumber} ${targetLabel(station)}`,
          plannedStartSec: cursor,
          plannedEndSec: cursor + station.estimatedSeconds,
          targetCalories: station.targetCalories,
          targetDistanceMeters: station.targetDistanceMeters,
          targetDurationSec: station.targetDurationSec ?? station.estimatedSeconds,
          targetPower: station.targetPower,
        })
        cursor += station.estimatedSeconds
      }
      if (roundNumber < template.roundCount && template.restBetweenRoundsSeconds > 0) {
        const rest = createStationTemplate({
          stationIndex: template.stations.length,
          equipmentKey: 'REST',
          targetDurationSec: template.restBetweenRoundsSeconds,
          estimatedSeconds: template.restBetweenRoundsSeconds,
        })
        out.push({
          clientId: participant.clientId,
          laneNumber: participant.laneNumber,
          heatNumber: participant.heatNumber,
          roundNumber,
          segmentIndex: out.length,
          stationIndex: rest.stationIndex,
          machineType: rest.machineType,
          equipmentKey: rest.equipmentKey,
          captureMethod: rest.captureMethod,
          label: `Round ${roundNumber} Rest ${formatDuration(template.restBetweenRoundsSeconds)}`,
          plannedStartSec: cursor,
          plannedEndSec: cursor + template.restBetweenRoundsSeconds,
          targetDurationSec: template.restBetweenRoundsSeconds,
        })
      }
    }
    return out
  })

  const heatCount = Math.ceil(members.length / defaults.laneCount)
  return {
    participants,
    stations,
    segments,
    heatDurationSec,
    totalPlannedDurationSec: heatCount * heatDurationSec,
  }
}

export function createStationTemplate(input: {
  stationIndex: number
  equipmentKey: string
  label?: string
  targetCalories?: number
  targetDistanceMeters?: number
  targetDurationSec?: number
  targetPower?: number
  estimatedSeconds?: number
  captureMethod?: TeamCaptureMethod
}): TeamCaptureStationTemplate {
  const definition = equipmentDefinition(input.equipmentKey)
  const targetMetric: TeamCaptureTargetMetric = input.targetCalories != null
    ? 'CALORIES'
    : input.targetDistanceMeters != null
      ? 'DISTANCE'
      : input.targetPower != null
        ? 'POWER'
        : 'DURATION'

  return {
    stationIndex: input.stationIndex,
    equipmentKey: definition.key,
    label: input.label ?? definition.label,
    machineType: definition.machineType,
    captureMethod: input.captureMethod ?? definition.captureMethod,
    targetMetric,
    targetCalories: input.targetCalories,
    targetDistanceMeters: input.targetDistanceMeters,
    targetDurationSec: input.targetDurationSec,
    targetPower: input.targetPower,
    estimatedSeconds: clampInt(input.estimatedSeconds, input.targetDurationSec ?? definition.estimatedSeconds, 5, 1800),
  }
}

export function buildTemplateSummary(template: Omit<TeamCaptureTemplate, 'summary'>): TeamCaptureTemplate {
  const estimatedSecondsPerRound = template.stations.reduce((sum, station) => sum + station.estimatedSeconds, 0)
  return {
    ...template,
    summary: {
      stationCount: template.stations.length,
      bluetoothStationCount: template.stations.filter((station) => station.captureMethod === 'BLUETOOTH_STATION').length,
      manualStationCount: template.stations.filter((station) => station.captureMethod === 'MANUAL').length,
      runStationCount: template.stations.filter((station) => station.equipmentKey === 'RUN').length,
      estimatedSecondsPerRound,
    },
  }
}

function clampInt(value: number | undefined, fallback: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return fallback
  return Math.min(Math.max(Math.floor(value as number), min), max)
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`
}

function targetLabel(station: TeamCaptureStationTemplate): string {
  if (station.targetCalories != null) return `${station.label} ${station.targetCalories} cal`
  if (station.targetDistanceMeters != null) return `${station.label} ${station.targetDistanceMeters} m`
  if (station.targetDurationSec != null) return `${station.label} ${formatDuration(station.targetDurationSec)}`
  if (station.targetPower != null) return `${station.label} ${station.targetPower} W`
  return station.label
}

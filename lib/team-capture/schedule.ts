import type { TeamCaptureMachineType } from '@prisma/client'

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
  machineType: Extract<TeamCaptureMachineType, 'BIKEERG' | 'ROWER'>
  label: string
}

export interface TeamCaptureSegmentPlan {
  clientId: string
  laneNumber: number
  heatNumber: number
  roundNumber: number
  segmentIndex: number
  machineType: TeamCaptureMachineType
  label: string
  plannedStartSec: number
  plannedEndSec: number
  targetCalories?: number
  targetDistanceMeters?: number
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
} satisfies Required<TeamCaptureSessionOptions>

export function withTeamCaptureDefaults(
  options: TeamCaptureSessionOptions = {}
): Required<TeamCaptureSessionOptions> {
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

export function buildTeamCaptureStructure(options: TeamCaptureSessionOptions = {}) {
  const defaults = withTeamCaptureDefaults(options)
  return {
    version: 1,
    mode: 'FIXED_LANES',
    identity: 'STARTLIST_TIMING',
    laneCount: defaults.laneCount,
    roundCount: defaults.roundCount,
    stations: [
      { machineType: 'BIKEERG', targetCalories: defaults.bikeCalories, estimatedSeconds: defaults.estimatedBikeSeconds },
      { machineType: 'ROWER', targetCalories: defaults.rowCalories, estimatedSeconds: defaults.estimatedRowSeconds },
      { machineType: 'RUN', targetDistanceMeters: defaults.runDistanceMeters, estimatedSeconds: defaults.estimatedRunSeconds },
    ],
    restBetweenRoundsSeconds: defaults.restBetweenRoundsSeconds,
  }
}

export function buildTeamCaptureLanePlan(
  members: TeamCaptureMemberInput[],
  options: TeamCaptureSessionOptions = {}
): TeamCaptureLanePlan {
  const defaults = withTeamCaptureDefaults(options)
  const roundWorkSec = defaults.estimatedBikeSeconds + defaults.estimatedRowSeconds + defaults.estimatedRunSeconds
  const heatDurationSec =
    defaults.roundCount * roundWorkSec +
    Math.max(0, defaults.roundCount - 1) * defaults.restBetweenRoundsSeconds
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
    stations.push(
      { laneNumber, machineType: 'BIKEERG', label: `Lane ${laneNumber} BikeErg` },
      { laneNumber, machineType: 'ROWER', label: `Lane ${laneNumber} RowErg` },
    )
  }

  const segments = participants.flatMap((participant) => {
    const out: TeamCaptureSegmentPlan[] = []
    for (let roundNumber = 1; roundNumber <= defaults.roundCount; roundNumber++) {
      const roundBase =
        participant.expectedStartOffsetSec +
        (roundNumber - 1) * (roundWorkSec + defaults.restBetweenRoundsSeconds)
      let cursor = roundBase
      out.push({
        clientId: participant.clientId,
        laneNumber: participant.laneNumber,
        heatNumber: participant.heatNumber,
        roundNumber,
        segmentIndex: out.length,
        machineType: 'BIKEERG',
        label: `Round ${roundNumber} BikeErg ${defaults.bikeCalories} cal`,
        plannedStartSec: cursor,
        plannedEndSec: cursor + defaults.estimatedBikeSeconds,
        targetCalories: defaults.bikeCalories,
      })
      cursor += defaults.estimatedBikeSeconds
      out.push({
        clientId: participant.clientId,
        laneNumber: participant.laneNumber,
        heatNumber: participant.heatNumber,
        roundNumber,
        segmentIndex: out.length,
        machineType: 'ROWER',
        label: `Round ${roundNumber} RowErg ${defaults.rowCalories} cal`,
        plannedStartSec: cursor,
        plannedEndSec: cursor + defaults.estimatedRowSeconds,
        targetCalories: defaults.rowCalories,
      })
      cursor += defaults.estimatedRowSeconds
      out.push({
        clientId: participant.clientId,
        laneNumber: participant.laneNumber,
        heatNumber: participant.heatNumber,
        roundNumber,
        segmentIndex: out.length,
        machineType: 'RUN',
        label: `Round ${roundNumber} Run ${defaults.runDistanceMeters} m`,
        plannedStartSec: cursor,
        plannedEndSec: cursor + defaults.estimatedRunSeconds,
        targetDistanceMeters: defaults.runDistanceMeters,
      })
      cursor += defaults.estimatedRunSeconds
      if (roundNumber < defaults.roundCount && defaults.restBetweenRoundsSeconds > 0) {
        out.push({
          clientId: participant.clientId,
          laneNumber: participant.laneNumber,
          heatNumber: participant.heatNumber,
          roundNumber,
          segmentIndex: out.length,
          machineType: 'REST',
          label: `Round ${roundNumber} Rest ${formatDuration(defaults.restBetweenRoundsSeconds)}`,
          plannedStartSec: cursor,
          plannedEndSec: cursor + defaults.restBetweenRoundsSeconds,
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

function clampInt(value: number | undefined, fallback: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return fallback
  return Math.min(Math.max(Math.floor(value as number), min), max)
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`
}

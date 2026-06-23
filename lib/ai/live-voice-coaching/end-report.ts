import type {
  LivePerformanceSnapshot,
  LivePostWorkoutDebrief,
} from './types'

export interface LiveVoiceSyntheticTranscript {
  role: 'athlete' | 'coach_ai'
  content: string
  timestamp: string
}

function present(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

export function buildPostWorkoutDebriefLine(debrief: LivePostWorkoutDebrief): string {
  const parts: string[] = []
  if (present(debrief.sessionRpe)) parts.push(`RPE ${debrief.sessionRpe}/10`)
  if (debrief.mood) parts.push(`mood ${debrief.mood}`)
  parts.push(`pain ${debrief.painMentioned ? 'yes' : 'no'}`)
  if (debrief.painDetails) parts.push(`pain details: ${debrief.painDetails}`)
  if (debrief.notes) parts.push(`notes: ${debrief.notes}`)
  return `[POST WORKOUT DEBRIEF] ${parts.join(' | ')}`
}

export function buildPerformanceSnapshotLine(snapshot: LivePerformanceSnapshot): string {
  const parts: string[] = []
  if (snapshot.workoutName) parts.push(`workout ${snapshot.workoutName}`)
  if (snapshot.sport) parts.push(`sport ${snapshot.sport}`)
  if (present(snapshot.completedSegments) && present(snapshot.totalSegments)) {
    parts.push(`segments ${snapshot.completedSegments}/${snapshot.totalSegments}`)
  }
  if (present(snapshot.skippedSegments) && snapshot.skippedSegments > 0) {
    parts.push(`skipped ${snapshot.skippedSegments}`)
  }
  if (present(snapshot.totalActualDurationSeconds)) {
    parts.push(`duration ${Math.round(snapshot.totalActualDurationSeconds / 60)} min`)
  }
  if (present(snapshot.avgPower)) parts.push(`avg power ${snapshot.avgPower} W`)
  if (present(snapshot.maxPower)) parts.push(`max power ${snapshot.maxPower} W`)
  if (present(snapshot.avgHeartRate)) parts.push(`avg HR ${snapshot.avgHeartRate} bpm`)
  if (present(snapshot.maxHeartRate)) parts.push(`max HR ${snapshot.maxHeartRate} bpm`)
  if (present(snapshot.totalDistanceKm)) parts.push(`distance ${snapshot.totalDistanceKm.toFixed(2)} km`)
  if (present(snapshot.totalCalories)) parts.push(`calories ${snapshot.totalCalories}`)

  const segmentLines = (snapshot.segments ?? [])
    .slice(0, 20)
    .map((s) => {
      const bits = [`#${s.index + 1} ${s.typeName}`]
      if (s.skipped) bits.push('skipped')
      if (present(s.plannedPower)) bits.push(`target ${s.plannedPower} W`)
      if (present(s.actualAvgPower)) bits.push(`avg ${s.actualAvgPower} W`)
      if (present(s.actualMaxPower)) bits.push(`max ${s.actualMaxPower} W`)
      if (present(s.actualAvgHR)) bits.push(`HR ${s.actualAvgHR}`)
      if (present(s.actualCalories)) bits.push(`${s.actualCalories} cal`)
      if (s.notes) bits.push(`notes: ${s.notes}`)
      return bits.join(', ')
    })

  return [
    `[SESSION METRICS] ${parts.length > 0 ? parts.join(' | ') : 'No aggregate metrics available.'}`,
    ...(segmentLines.length > 0 ? [`[SEGMENTS] ${segmentLines.join(' ; ')}`] : []),
  ].join('\n')
}

export function buildSyntheticLiveVoiceTranscripts(params: {
  debrief?: LivePostWorkoutDebrief | null
  performanceSnapshot?: LivePerformanceSnapshot | null
  timestamp?: string
}): LiveVoiceSyntheticTranscript[] {
  const timestamp = params.timestamp ?? new Date().toISOString()
  const transcripts: LiveVoiceSyntheticTranscript[] = []

  if (params.performanceSnapshot) {
    transcripts.push({
      role: 'coach_ai',
      content: buildPerformanceSnapshotLine(params.performanceSnapshot),
      timestamp,
    })
  }

  if (params.debrief) {
    transcripts.push({
      role: 'athlete',
      content: buildPostWorkoutDebriefLine(params.debrief),
      timestamp,
    })
  }

  return transcripts
}

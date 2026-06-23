import { describe, expect, it } from 'vitest'
import {
  buildPerformanceSnapshotLine,
  buildPostWorkoutDebriefLine,
  buildSyntheticLiveVoiceTranscripts,
} from './end-report'

describe('live voice end report helpers', () => {
  it('formats post-workout debrief details for summary context', () => {
    expect(buildPostWorkoutDebriefLine({
      sessionRpe: 8,
      painMentioned: true,
      painDetails: 'left calf tightness',
      notes: 'Faded on the last two reps',
      mood: 'struggling',
    })).toContain('RPE 8/10')
    expect(buildPostWorkoutDebriefLine({
      sessionRpe: 8,
      painMentioned: true,
      painDetails: 'left calf tightness',
      notes: 'Faded on the last two reps',
      mood: 'struggling',
    })).toContain('pain details: left calf tightness')
  })

  it('formats performance snapshot aggregates and segments', () => {
    const line = buildPerformanceSnapshotLine({
      workoutName: '10 x 3 min bike',
      sport: 'CYCLING',
      totalSegments: 20,
      completedSegments: 20,
      avgPower: 286,
      maxPower: 421,
      segments: [
        { index: 0, typeName: 'Interval', plannedPower: 280, actualAvgPower: 286, actualMaxPower: 421 },
      ],
    })

    expect(line).toContain('workout 10 x 3 min bike')
    expect(line).toContain('avg power 286 W')
    expect(line).toContain('#1 Interval, target 280 W, avg 286 W')
  })

  it('creates synthetic transcript rows for metrics and debrief', () => {
    const rows = buildSyntheticLiveVoiceTranscripts({
      timestamp: '2026-06-23T10:00:00.000Z',
      performanceSnapshot: { workoutName: 'Bike', totalSegments: 1, completedSegments: 1 },
      debrief: { sessionRpe: 6, painMentioned: false },
    })

    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({ role: 'coach_ai', timestamp: '2026-06-23T10:00:00.000Z' })
    expect(rows[1]).toMatchObject({ role: 'athlete', timestamp: '2026-06-23T10:00:00.000Z' })
  })
})

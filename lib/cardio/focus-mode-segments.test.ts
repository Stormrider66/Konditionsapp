import { describe, expect, it } from 'vitest'
import { buildCardioFocusModeSegments } from './focus-mode-segments'

describe('buildCardioFocusModeSegments', () => {
  it('expands flat repeats and rest intervals into loggable focus steps', () => {
    const segments = buildCardioFocusModeSegments({
      locale: 'sv',
      segments: [
        { id: 'warmup', type: 'WARMUP', duration: 600 },
        { id: 'reps', type: 'INTERVAL', distance: 300, repeats: 5, restDuration: 60 },
      ],
      segmentLogs: [
        {
          id: 'log-rest-1',
          segmentIndex: 2,
          actualDuration: 60,
          actualDistance: null,
          actualPace: null,
          actualAvgHR: null,
          actualMaxHR: null,
          completed: true,
          skipped: false,
        },
      ],
    })

    expect(segments).toHaveLength(10)
    expect(segments.map((segment) => segment.type)).toEqual([
      'WARMUP',
      'INTERVAL',
      'RECOVERY',
      'INTERVAL',
      'RECOVERY',
      'INTERVAL',
      'RECOVERY',
      'INTERVAL',
      'RECOVERY',
      'INTERVAL',
    ])
    expect(segments[1]).toMatchObject({
      index: 1,
      plannedDistance: 0.3,
      notes: '1/5',
    })
    expect(segments[2]).toMatchObject({
      index: 2,
      plannedDuration: 60,
      completed: true,
      logId: 'log-rest-1',
    })
    expect(segments[9]).toMatchObject({
      index: 9,
      plannedDistance: 0.3,
      notes: '5/5',
    })
  })

  it('normalizes repeat-group REST steps to the persisted RECOVERY segment type', () => {
    const segments = buildCardioFocusModeSegments({
      locale: 'en',
      segments: [
        {
          id: 'group',
          type: 'REPEAT_GROUP',
          repeats: 2,
          steps: [
            { id: 'work', type: 'INTERVAL', duration: 30 },
            { id: 'rest', type: 'REST', duration: 15 },
          ],
        },
      ],
    })

    expect(segments).toHaveLength(4)
    expect(segments[1]).toMatchObject({
      type: 'RECOVERY',
      typeName: 'Rest',
      plannedDuration: 15,
    })
  })
})

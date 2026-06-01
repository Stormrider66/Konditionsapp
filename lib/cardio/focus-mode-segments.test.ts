import { describe, expect, it } from 'vitest'
import { buildCardioFocusModeSegments, resolveSegmentPower } from './focus-mode-segments'

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

  it('carries benchmark + relative power fields onto opener and work intervals', () => {
    const segments = buildCardioFocusModeSegments({
      locale: 'sv',
      segments: [
        // Opener: all-out 3 min, marked as the prolog/benchmark
        { id: 'opener', type: 'INTERVAL', duration: 180, power: '250', isBenchmark: true },
        // Work set: 3 × 3 min @ 80% of the opener, 1 min rest
        {
          id: 'work',
          type: 'INTERVAL',
          duration: 180,
          repeats: 3,
          restDuration: 60,
          powerRelPercent: 80,
          powerRelTo: 'OPENER',
        },
      ],
    })

    // opener (index 0)
    expect(segments[0]).toMatchObject({
      isBenchmark: true,
      plannedPower: 250,
    })
    expect(segments[0].powerRelPercent).toBeUndefined()

    // first work rep (index 1) — relative, no absolute power
    expect(segments[1]).toMatchObject({
      powerRelPercent: 80,
      powerRelTo: 'OPENER',
    })
    expect(segments[1].plannedPower).toBeUndefined()
    expect(segments[1].isBenchmark).toBeUndefined()
  })

  it('resolves power targets against the logged opener watts', () => {
    // Absolute target → returned as-is
    expect(resolveSegmentPower({ plannedPower: 200 }, undefined)).toEqual({ watts: 200 })

    // Relative to opener, opener logged at 320 → 80% = 256
    expect(
      resolveSegmentPower({ powerRelPercent: 80, powerRelTo: 'OPENER' }, 320),
    ).toEqual({ watts: 256 })

    // Relative to opener but opener not logged yet → pending label
    expect(
      resolveSegmentPower({ powerRelPercent: 80, powerRelTo: 'OPENER' }, undefined),
    ).toEqual({ pendingLabel: '80% prolog' })

    // FTP reference (not wired) → pending label with the ref name
    expect(
      resolveSegmentPower({ powerRelPercent: 90, powerRelTo: 'FTP' }, 320),
    ).toEqual({ pendingLabel: '90% FTP' })

    // No power target at all
    expect(resolveSegmentPower({}, 320)).toEqual({})
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

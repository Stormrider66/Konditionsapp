import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/prisma', () => ({ prisma: {} }))
vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn() } }))

import { pickBestOverlap, sliceHrStream } from './garmin-cardio-link'
import { normalizeGarminSampleOffsets } from '@/lib/integrations/garmin/client'

const T0 = new Date('2026-06-13T10:00:00Z').getTime()
const MIN = 60 * 1000

describe('sliceHrStream', () => {
  it('slices avg/max HR for a window using per-sample offsets', () => {
    // 10 samples at 0..9s: 120..129 bpm
    const hrStream = Array.from({ length: 10 }, (_, i) => 120 + i)
    const offsets = Array.from({ length: 10 }, (_, i) => i)

    const slice = sliceHrStream({
      activityStartMs: T0,
      hrStream,
      hrStreamOffsets: offsets,
      windowStartMs: T0 + 3000,
      windowEndMs: T0 + 9000,
    })

    expect(slice).toEqual({ avg: 126, max: 129, samples: 7 }) // samples 3..9
  })

  it('respects offsets across recording gaps (index ≠ seconds)', () => {
    // Two samples before a 5-minute pause, two after.
    const hrStream = [150, 152, 130, 128]
    const offsets = [0, 1, 300, 301]

    // A window covering only the post-gap part must not see the early samples,
    // which a naive index-as-seconds read would include.
    const slice = sliceHrStream({
      activityStartMs: T0,
      hrStream,
      hrStreamOffsets: offsets,
      windowStartMs: T0 + 299_000,
      windowEndMs: T0 + 302_000,
    })

    expect(slice).toBeNull() // only 2 samples in window < MIN_SLICE_SAMPLES
  })

  it('falls back to 1 Hz index offsets when no offsets stored', () => {
    const hrStream = Array.from({ length: 120 }, (_, i) => 110 + (i % 5))
    const slice = sliceHrStream({
      activityStartMs: T0,
      hrStream,
      windowStartMs: T0 + 60_000,
      windowEndMs: T0 + 119_000,
    })
    expect(slice).not.toBeNull()
    expect(slice!.samples).toBe(60) // seconds 60..119
  })

  it('returns null for windows with too few samples', () => {
    const slice = sliceHrStream({
      activityStartMs: T0,
      hrStream: [140, 141],
      hrStreamOffsets: [0, 1],
      windowStartMs: T0,
      windowEndMs: T0 + 10_000,
    })
    expect(slice).toBeNull()
  })
})

describe('pickBestOverlap', () => {
  // Session: 10:00 → 10:39
  const sessionStart = T0
  const sessionEnd = T0 + 39 * MIN

  it('picks the recording that covers the session', () => {
    const best = pickBestOverlap(sessionStart, sessionEnd, [
      // Morning run, hours earlier
      { id: 'run', startDate: new Date(T0 - 4 * 60 * MIN), duration: 3600, elapsedTime: null },
      // Watch recording started 1 min before the session, 42 min long
      { id: 'erg', startDate: new Date(T0 - MIN), duration: 42 * 60, elapsedTime: null },
    ])
    expect(best?.id).toBe('erg')
  })

  it('rejects recordings with insufficient overlap', () => {
    const best = pickBestOverlap(sessionStart, sessionEnd, [
      // 10-min recording ending shortly after the session started (e.g. warmup
      // recorded separately): overlaps 5 min of a 10-min recording = 50%… make
      // it clearly under: 3 of 10 minutes.
      { id: 'warmup', startDate: new Date(T0 - 7 * MIN), duration: 600, elapsedTime: null },
    ])
    expect(best).toBeNull()
  })

  it('prefers the larger overlap among several candidates', () => {
    const best = pickBestOverlap(sessionStart, sessionEnd, [
      { id: 'short', startDate: new Date(T0), duration: 20 * 60, elapsedTime: null },
      { id: 'full', startDate: new Date(T0 - MIN), duration: 41 * 60, elapsedTime: null },
    ])
    expect(best?.id).toBe('full')
  })

  it('accepts a duration-less recording starting inside the session window', () => {
    const best = pickBestOverlap(sessionStart, sessionEnd, [
      { id: 'manual', startDate: new Date(T0 + 2 * MIN), duration: null, elapsedTime: null },
    ])
    expect(best?.id).toBe('manual')
  })
})

describe('normalizeGarminSampleOffsets', () => {
  it('converts epoch recordingTimes to seconds from activity start', () => {
    const start = 1_770_000_000
    expect(
      normalizeGarminSampleOffsets([start, start + 1, start + 5], start)
    ).toEqual([0, 1, 5])
  })

  it('anchors to the first sample when epoch-like without an activity start', () => {
    expect(normalizeGarminSampleOffsets([1_770_000_010, 1_770_000_012])).toEqual([0, 2])
  })

  it('passes through already-relative offsets and index-fills missing ones', () => {
    expect(normalizeGarminSampleOffsets([0, 1, null, 3])).toEqual([0, 1, 2, 3])
  })
})

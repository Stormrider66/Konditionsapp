import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const testDir = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
const { evaluateBacklog, minutesSince } = require(path.join(testDir, 'qa-daily-metrics-backlog.cjs'))

const thresholds = {
  maxPending: 50,
  maxFailed: 10,
  maxStaleProcessing: 0,
  maxOldestPendingMinutes: 10,
  staleProcessingMinutes: 5,
}

describe('qa-daily-metrics-backlog', () => {
  it('passes when backlog is within pilot thresholds', () => {
    const result = evaluateBacklog(
      {
        counts: { PENDING: 4, FAILED: 0, PROCESSING: 1, COMPLETED: 120 },
        oldestPendingRunAfter: '2026-05-08T20:57:00.000Z',
        staleProcessing: 0,
        recentFailed: 0,
      },
      thresholds,
      new Date('2026-05-08T21:00:00.000Z')
    )

    expect(result.ok).toBe(true)
    expect(result.failures).toEqual([])
    expect(result.oldestPendingMinutes).toBe(3)
  })

  it('fails when pending, failed, stale, or old jobs exceed thresholds', () => {
    const result = evaluateBacklog(
      {
        counts: { PENDING: 51, FAILED: 11, PROCESSING: 2 },
        oldestPendingRunAfter: '2026-05-08T20:45:00.000Z',
        staleProcessing: 1,
        recentFailed: 2,
      },
      thresholds,
      new Date('2026-05-08T21:00:00.000Z')
    )

    expect(result.ok).toBe(false)
    expect(result.failures).toEqual([
      'pending jobs 51 > 50',
      'failed jobs 11 > 10',
      'stale processing jobs 1 > 0',
      'oldest pending job age 15m > 10m',
    ])
    expect(result.warnings).toEqual(['recent failed jobs in last hour: 2'])
  })

  it('returns null age when no pending runAfter exists', () => {
    expect(minutesSince(null, new Date('2026-05-08T21:00:00.000Z'))).toBeNull()
  })
})

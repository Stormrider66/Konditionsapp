import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const testDir = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
const { evaluateCronConfig } = require(path.join(testDir, 'qa-cron-config.cjs'))

const requiredCrons = [
  { path: '/api/cron/process-daily-metrics', schedule: '* * * * *' },
  { path: '/api/cron/link-workouts', schedule: '*/15 * * * *' },
  { path: '/api/cron/calculate-acwr', schedule: '0 3 * * *' },
  { path: '/api/cron/expire-trials', schedule: '0 2 * * *' },
  { path: '/api/cron/trial-warnings', schedule: '0 9 * * *' },
  { path: '/api/cron/reset-ai-usage', schedule: '5 0 1 * *' },
  { path: '/api/cron/reset-budgets', schedule: '0 0 1 * *' },
]

describe('qa-cron-config', () => {
  it('passes when required crons are present and route files exist', () => {
    const result = evaluateCronConfig(
      { crons: requiredCrons },
      { routeExists: () => true }
    )

    expect(result.ok).toBe(true)
    expect(result.errors).toEqual([])
    expect(result.cronCount).toBe(requiredCrons.length)
  })

  it('fails when a required cron is missing or has the wrong schedule', () => {
    const result = evaluateCronConfig(
      {
        crons: [
          { path: '/api/cron/process-daily-metrics', schedule: '*/5 * * * *' },
          ...requiredCrons.slice(1, -1),
        ],
      },
      { routeExists: () => true }
    )

    expect(result.ok).toBe(false)
    expect(result.errors).toEqual([
      'Required cron /api/cron/process-daily-metrics has schedule "*/5 * * * *", expected "* * * * *"',
      'Required cron is missing: /api/cron/reset-budgets',
    ])
  })

  it('fails on duplicate or missing route files', () => {
    const result = evaluateCronConfig(
      {
        crons: [
          ...requiredCrons,
          { path: '/api/cron/link-workouts', schedule: '*/15 * * * *' },
          { path: '/api/cron/missing-route', schedule: '0 * * * *' },
        ],
      },
      { routeExists: (cronPath: string) => cronPath !== '/api/cron/missing-route' }
    )

    expect(result.ok).toBe(false)
    expect(result.errors).toContain('Duplicate cron path: /api/cron/link-workouts')
    expect(result.errors).toContain('Cron route file is missing for /api/cron/missing-route')
  })
})

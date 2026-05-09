import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const testDir = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
const { buildChecks, shouldIncludeBrowserQa, shouldIncludeLoadQa } = require(path.join(testDir, 'qa-hockey-pilot-gates.cjs'))

describe('qa-hockey-pilot-gates', () => {
  it('runs deterministic pilot gates by default', () => {
    expect(buildChecks().map((check: { args: string[] }) => check.args.join(' '))).toEqual([
      'run qa:hockey-pilot-readiness',
      'run qa:launch-config',
      'run qa:cron-config',
      'run qa:daily-metrics-backlog',
    ])
  })

  it('can include browser cockpit QA explicitly', () => {
    expect(buildChecks({ includeBrowserQa: true }).map((check: { args: string[] }) => check.args.join(' '))).toEqual([
      'run qa:hockey-pilot-readiness',
      'run qa:launch-config',
      'run qa:hockey',
      'run qa:cron-config',
      'run qa:daily-metrics-backlog',
    ])
  })

  it('can include the pilot load run explicitly', () => {
    expect(buildChecks({ includeLoadQa: true }).map((check: { args: string[] }) => check.args.join(' '))).toEqual([
      'run qa:hockey-pilot-readiness',
      'run qa:launch-config',
      'run qa:cron-config',
      'run qa:daily-metrics-backlog',
      'run load:k6:hockey-pilot',
      'run qa:daily-metrics-backlog',
    ])
  })

  it('can include browser and load checks together', () => {
    expect(buildChecks({ includeBrowserQa: true, includeLoadQa: true }).map((check: { args: string[] }) => check.args.join(' '))).toEqual([
      'run qa:hockey-pilot-readiness',
      'run qa:launch-config',
      'run qa:hockey',
      'run qa:cron-config',
      'run qa:daily-metrics-backlog',
      'run load:k6:hockey-pilot',
      'run qa:daily-metrics-backlog',
    ])
  })

  it('detects browser QA from flag or env', () => {
    expect(shouldIncludeBrowserQa(['node', 'script'], {})).toBe(false)
    expect(shouldIncludeBrowserQa(['node', 'script', '--include-browser'], {})).toBe(true)
    expect(shouldIncludeBrowserQa(['node', 'script'], { HOCKEY_PILOT_GATES_INCLUDE_BROWSER: 'true' })).toBe(true)
  })

  it('detects load QA from flag or env', () => {
    expect(shouldIncludeLoadQa(['node', 'script'], {})).toBe(false)
    expect(shouldIncludeLoadQa(['node', 'script', '--include-load'], {})).toBe(true)
    expect(shouldIncludeLoadQa(['node', 'script'], { HOCKEY_PILOT_GATES_INCLUDE_LOAD: 'true' })).toBe(true)
  })
})

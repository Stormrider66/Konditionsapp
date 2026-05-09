import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const testDir = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
const {
  buildChecks,
  formatCommand,
  gateModeEnv,
  nextStepMessages,
  runChecks,
  shouldIncludeBrowserQa,
  shouldIncludeLoadQa,
} = require(path.join(testDir, 'qa-hockey-pilot-gates.cjs'))

describe('qa-hockey-pilot-gates', () => {
  it('runs deterministic pilot gates by default', () => {
    expect(buildChecks().map((check: { args: string[] }) => check.args.join(' '))).toEqual([
      'run qa:hockey-pilot-readiness',
      'run qa:launch-config',
      'run qa:hockey-pilot-wave-plan',
      'run qa:hockey-pilot-tenant-boundary',
      'run qa:cron-config',
      'run qa:daily-metrics-backlog',
    ])
  })

  it('passes gate mode metadata to child checks', () => {
    const checks = buildChecks({ includeBrowserQa: true, includeLoadQa: true })
    expect(checks.every((check: { env?: Record<string, string> }) => check.env?.HOCKEY_PILOT_GATE_MODES === 'deterministic,browser,load')).toBe(true)
  })

  it('can include browser cockpit QA explicitly', () => {
    expect(buildChecks({ includeBrowserQa: true }).map((check: { args: string[] }) => check.args.join(' '))).toEqual([
      'run qa:hockey-pilot-readiness',
      'run qa:launch-config',
      'run qa:hockey-pilot-wave-plan',
      'run qa:hockey-pilot-tenant-boundary',
      'run qa:hockey-browser-env',
      'run qa:hockey',
      'run qa:cron-config',
      'run qa:daily-metrics-backlog',
    ])
  })

  it('can include the pilot load run explicitly', () => {
    expect(buildChecks({ includeLoadQa: true }).map((check: { args: string[] }) => check.args.join(' '))).toEqual([
      'run qa:hockey-pilot-readiness',
      'run qa:launch-config',
      'run qa:hockey-pilot-wave-plan',
      'run qa:hockey-pilot-tenant-boundary',
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
      'run qa:hockey-pilot-wave-plan',
      'run qa:hockey-pilot-tenant-boundary',
      'run qa:hockey-browser-env',
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

  it('formats gate mode env consistently', () => {
    expect(gateModeEnv()).toBe('deterministic')
    expect(gateModeEnv({ includeBrowserQa: true })).toBe('deterministic,browser')
    expect(gateModeEnv({ includeLoadQa: true })).toBe('deterministic,load')
  })

  it('reports the first failed check with command details', () => {
    const checks = buildChecks({ includeLoadQa: true })
    const result = runChecks(checks, (check: { label: string }) => (
      check.label === 'Hockey pilot load run' ? 42 : 0
    ))

    expect(result).toMatchObject({
      ok: false,
      status: 42,
      failedCheck: checks[6],
    })
    expect(formatCommand(result.failedCheck)).toBe('npm run load:k6:hockey-pilot')
  })

  it('prints exact next-step commands for skipped optional gates', () => {
    expect(nextStepMessages()).toEqual([
      'Browser cockpit QA was skipped. Run with a production-like target: TRAINOMICS_QA_BASE_URL="https://pilot.example.com" HOCKEY_PILOT_TARGET_COMMIT_SHA="vercel-deployment-commit-sha" npm run qa:hockey-pilot-gates -- --include-browser',
      'Pilot load run was skipped. Run with evidence export: HOCKEY_PILOT_SUPPORT_OWNER="Support Lead" HOCKEY_PILOT_SUPPORT_SLA_HOURS=24 HOCKEY_PILOT_OPEN_CRITICAL_ISSUES=0 HOCKEY_PILOT_TARGET_COMMIT_SHA="vercel-deployment-commit-sha" K6_SUMMARY_EXPORT=load-tests/evidence/hockey-pilot-YYYY-MM-DD.json npm run qa:hockey-pilot-gates -- --include-load',
    ])
    expect(nextStepMessages({ includeBrowserQa: true, includeLoadQa: true })).toEqual([])
  })
})

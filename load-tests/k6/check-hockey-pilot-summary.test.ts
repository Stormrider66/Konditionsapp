import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'

const testDir = path.dirname(fileURLToPath(import.meta.url))
const checkerPath = path.resolve(testDir, 'check-hockey-pilot-summary.cjs')

const tempDirs: string[] = []

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop()
    if (dir) rmSync(dir, { recursive: true, force: true })
  }
})

function tempSummaryPath(name = 'summary.json') {
  const dir = mkdtempSync(path.join(tmpdir(), 'hockey-summary-'))
  tempDirs.push(dir)
  return path.join(dir, name)
}

function metricValues(p95: number, p99: number) {
  return { values: { 'p(95)': p95, 'p(99)': p99 } }
}

function endpointMetrics(endpoint: string, p95 = 800, p99 = 1800, failRate = 0) {
  return {
    [`endpoint_duration{endpoint:${endpoint}}`]: metricValues(p95, p99),
    [`endpoint_failed{endpoint:${endpoint}}`]: { values: { rate: failRate } },
  }
}

function fullPilotMetrics() {
  return {
    http_req_failed: { values: { rate: 0.001 } },
    http_req_duration: metricValues(1000, 3000),
    ...endpointMetrics('business-stats'),
    ...endpointMetrics('team-dashboard'),
    ...endpointMetrics('hockey-tests-list'),
    ...endpointMetrics('hockey-package'),
    ...endpointMetrics('hockey-athlete-summary'),
    ...endpointMetrics('athlete-calendar'),
    ...endpointMetrics('daily-metrics-get'),
    ...endpointMetrics('daily-metrics-post'),
    ...endpointMetrics('hockey-simca-export'),
  }
}

function writeSummary(metrics: Record<string, unknown>) {
  const summaryPath = tempSummaryPath()
  writeFileSync(summaryPath, JSON.stringify({ metrics }, null, 2))
  return summaryPath
}

function runChecker(summaryPath: string, env: Record<string, string> = {}) {
  return spawnSync(process.execPath, [checkerPath, summaryPath], {
    cwd: path.resolve(testDir, '../..'),
    env: {
      ...process.env,
      HOCKEY_PILOT_READ_WEIGHT: '',
      HOCKEY_PILOT_ATHLETE_WEIGHT: '',
      HOCKEY_PILOT_DASHBOARD_WEIGHT: '',
      HOCKEY_PILOT_EXPORT_WEIGHT: '',
      HOCKEY_PILOT_REQUIRED_ENDPOINTS: '',
      ...env,
    },
    encoding: 'utf8',
  })
}

describe('check-hockey-pilot-summary', () => {
  it('passes when every default pilot endpoint is present and under threshold', () => {
    const result = runChecker(writeSummary(fullPilotMetrics()))

    expect(result.status).toBe(0)
    expect(result.stdout).toContain('Hockey pilot summary gate passed.')
    expect(result.stdout).toContain('Required endpoints: hockey-tests-list')
    expect(result.stdout).toContain('PASS  daily-metrics-post fail rate')
  })

  it('fails when an enabled flow endpoint is missing from the summary', () => {
    const result = runChecker(writeSummary({
      http_req_failed: { values: { rate: 0.001 } },
      http_req_duration: metricValues(1000, 3000),
      ...endpointMetrics('hockey-tests-list'),
    }))

    expect(result.status).toBe(1)
    expect(result.stdout).toContain('FAIL  hockey-package p95')
    expect(result.stdout).toContain('FAIL  athlete-calendar p95')
    expect(result.stderr).toContain('Hockey pilot summary gate failed')
  })

  it('uses traffic weights to make disabled flow endpoints optional', () => {
    const result = runChecker(
      writeSummary({
        http_req_failed: { values: { rate: 0.001 } },
        http_req_duration: metricValues(1000, 3000),
        ...endpointMetrics('hockey-tests-list'),
        ...endpointMetrics('hockey-package'),
        ...endpointMetrics('hockey-athlete-summary'),
      }),
      {
        HOCKEY_PILOT_ATHLETE_WEIGHT: '0',
        HOCKEY_PILOT_DASHBOARD_WEIGHT: '0',
        HOCKEY_PILOT_EXPORT_WEIGHT: '0',
      }
    )

    expect(result.status).toBe(0)
    expect(result.stdout).toContain('Required endpoints: hockey-tests-list, hockey-package, hockey-athlete-summary')
    expect(result.stdout).toContain('SKIP  athlete-calendar p95')
  })

  it('supports an explicit custom endpoint coverage set for narrow debug runs', () => {
    const result = runChecker(
      writeSummary({
        http_req_failed: { values: { rate: 0.001 } },
        http_req_duration: metricValues(1000, 3000),
        ...endpointMetrics('team-dashboard'),
      }),
      { HOCKEY_PILOT_REQUIRED_ENDPOINTS: 'team-dashboard' }
    )

    expect(result.status).toBe(0)
    expect(result.stdout).toContain('Required endpoints: team-dashboard')
    expect(result.stdout).toContain('PASS  team-dashboard p95')
    expect(result.stdout).toContain('SKIP  hockey-tests-list p95')
  })

  it('fails when an endpoint failure rate exceeds the pilot threshold', () => {
    const result = runChecker(writeSummary({
      ...fullPilotMetrics(),
      ...endpointMetrics('daily-metrics-post', 800, 1800, 0.02),
    }))

    expect(result.status).toBe(1)
    expect(result.stdout).toContain('FAIL  daily-metrics-post fail rate')
  })
})

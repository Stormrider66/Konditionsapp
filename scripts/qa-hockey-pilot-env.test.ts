import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'

const testDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(testDir, '..')
const scriptPath = path.resolve(testDir, 'qa-hockey-pilot-env.cjs')

const tempDirs: string[] = []

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop()
    if (dir) rmSync(dir, { recursive: true, force: true })
  }
})

function writeEnv(lines: string[]) {
  const dir = mkdtempSync(path.join(tmpdir(), 'hockey-env-'))
  tempDirs.push(dir)
  const envPath = path.join(dir, '.env.k6')
  writeFileSync(envPath, `${lines.join('\n')}\n`)
  return envPath
}

function baseEnvLines(overrides: string[] = []) {
  return [
    'BASE_URL=https://pilot.example.com',
    'CLIENT_ID=client-1',
    'BUSINESS_ID=business-1',
    'TEAM_ID=team-1',
    'LOAD_TEST_BYPASS_USER_EMAIL=coach@example.com',
    'LOAD_TEST_BYPASS_SECRET=test-secret',
    'ATHLETE_LOAD_TEST_BYPASS_USER_EMAIL=athlete@example.com',
    'K6_SUMMARY_EXPORT=/tmp/hockey-summary.json',
    ...overrides,
  ]
}

function runPreflight(lines: string[], env: Record<string, string> = {}) {
  const envPath = writeEnv(lines)
  const childEnv = { ...process.env }
  for (const key of [
    'BASE_URL',
    'CLIENT_ID',
    'CLIENT_IDS',
    'BUSINESS_ID',
    'TEAM_ID',
    'AUTH_COOKIE',
    'BEARER_TOKEN',
    'LOAD_TEST_BYPASS_USER_EMAIL',
    'LOAD_TEST_BYPASS_SECRET',
    'ATHLETE_AUTH_COOKIE',
    'ATHLETE_BEARER_TOKEN',
    'ATHLETE_LOAD_TEST_BYPASS_USER_EMAIL',
    'HOCKEY_PILOT_READ_WEIGHT',
    'HOCKEY_PILOT_ATHLETE_WEIGHT',
    'HOCKEY_PILOT_DASHBOARD_WEIGHT',
    'HOCKEY_PILOT_EXPORT_WEIGHT',
    'HOCKEY_PILOT_TEAM_COUNT',
    'HOCKEY_PILOT_ATHLETES_PER_TEAM',
    'HOCKEY_PILOT_STAFF_PER_TEAM',
    'HOCKEY_PILOT_EXPECTED_PEAK_USERS',
    'HOCKEY_PILOT_PEAK_VUS',
    'HOCKEY_PILOT_GATE_MODES',
    'HOCKEY_PILOT_SUPPORT_OWNER',
    'HOCKEY_PILOT_SUPPORT_SLA_HOURS',
    'HOCKEY_PILOT_OPEN_CRITICAL_ISSUES',
    'K6_SUMMARY_EXPORT',
  ]) {
    delete childEnv[key]
  }

  return spawnSync(process.execPath, [scriptPath], {
    cwd: repoRoot,
    env: {
      ...childEnv,
      K6_ENV_PATH: envPath,
      ...env,
    },
    encoding: 'utf8',
  })
}

describe('qa-hockey-pilot-env', () => {
  it('passes for a complete coach and athlete pilot env', () => {
    const result = runPreflight(baseEnvLines())

    expect(result.status).toBe(0)
    expect(result.stdout).toContain('Hockey pilot k6 env passed.')
    expect(result.stdout).toContain('Coach auth: bypass')
    expect(result.stdout).toContain('Athlete traffic: enabled')
    expect(result.stdout).toContain('Athlete auth: bypass')
    expect(result.stdout).toContain('Pilot users: 210')
    expect(result.stdout).toContain('Expected peak users: 75')
    expect(result.stdout).toContain('Peak VUs: 75')
    expect(result.stdout).toContain('Gate modes: -')
  })

  it('fails when athlete traffic is enabled without athlete auth', () => {
    const result = runPreflight(baseEnvLines([
      'ATHLETE_LOAD_TEST_BYPASS_USER_EMAIL=',
      'ATHLETE_AUTH_COOKIE=',
      'ATHLETE_BEARER_TOKEN=',
    ]))

    expect(result.status).toBe(1)
    expect(result.stderr).toContain('Athlete traffic is enabled but athlete auth is missing')
  })

  it('allows a coach-only run when athlete weight is zero', () => {
    const result = runPreflight(baseEnvLines([
      'ATHLETE_LOAD_TEST_BYPASS_USER_EMAIL=',
      'HOCKEY_PILOT_ATHLETE_WEIGHT=0',
    ]))

    expect(result.status).toBe(0)
    expect(result.stdout).toContain('Athlete traffic: disabled')
  })

  it('fails when all traffic weights are zero', () => {
    const result = runPreflight(baseEnvLines([
      'HOCKEY_PILOT_READ_WEIGHT=0',
      'HOCKEY_PILOT_ATHLETE_WEIGHT=0',
      'HOCKEY_PILOT_DASHBOARD_WEIGHT=0',
      'HOCKEY_PILOT_EXPORT_WEIGHT=0',
    ]))

    expect(result.status).toBe(1)
    expect(result.stderr).toContain('At least one hockey pilot traffic weight must be greater than 0')
  })

  it('fails athlete traffic with multiple client ids', () => {
    const result = runPreflight(baseEnvLines([
      'CLIENT_IDS=client-1,client-2',
    ]))

    expect(result.status).toBe(1)
    expect(result.stderr).toContain('Athlete traffic is enabled with multiple CLIENT_IDS')
  })

  it('lets shell env override the file for one-off debug runs', () => {
    const result = runPreflight(
      baseEnvLines([
        'ATHLETE_LOAD_TEST_BYPASS_USER_EMAIL=',
        'CLIENT_IDS=client-1,client-2',
      ]),
      { HOCKEY_PILOT_ATHLETE_WEIGHT: '0' }
    )

    expect(result.status).toBe(0)
    expect(result.stdout).toContain('Athlete traffic: disabled')
  })

  it('parses quoted values and inline comments', () => {
    const result = runPreflight([
      'BASE_URL="https://pilot.example.com"',
      'CLIENT_ID=client-1 # active athlete',
      'BUSINESS_ID=business-1',
      'TEAM_ID=team-1',
      'AUTH_COOKIE="session=value"',
      'HOCKEY_PILOT_ATHLETE_WEIGHT=0',
      'K6_SUMMARY_EXPORT=/tmp/hockey-summary.json',
    ])

    expect(result.status).toBe(0)
    expect(result.stdout).toContain('Target: https://pilot.example.com')
    expect(result.stdout).toContain('Coach auth: cookie')
    expect(result.stdout).toContain('Client IDs: 1')
  })

  it('fails when pilot wave sizing exceeds the first pilot gate', () => {
    const result = runPreflight(baseEnvLines([
      'HOCKEY_PILOT_TEAM_COUNT=7',
      'HOCKEY_PILOT_ATHLETES_PER_TEAM=45',
      'HOCKEY_PILOT_STAFF_PER_TEAM=9',
      'HOCKEY_PILOT_EXPECTED_PEAK_USERS=90',
      'HOCKEY_PILOT_PEAK_VUS=90',
    ]))

    expect(result.status).toBe(1)
    expect(result.stderr).toContain('Pilot team count is 7')
    expect(result.stderr).toContain('Estimated pilot users is 378')
    expect(result.stderr).toContain('Expected peak users is 90')
  })

  it('fails when peak VUs do not cover the expected pilot peak', () => {
    const result = runPreflight(baseEnvLines([
      'HOCKEY_PILOT_EXPECTED_PEAK_USERS=60',
      'HOCKEY_PILOT_PEAK_VUS=35',
    ]))

    expect(result.status).toBe(1)
    expect(result.stderr).toContain('HOCKEY_PILOT_PEAK_VUS is 35, but HOCKEY_PILOT_EXPECTED_PEAK_USERS is 60')
  })

  it('fails when support readiness is not clean for the pilot wave', () => {
    const result = runPreflight(baseEnvLines([
      'HOCKEY_PILOT_SUPPORT_OWNER=Support Lead',
      'HOCKEY_PILOT_SUPPORT_SLA_HOURS=48',
      'HOCKEY_PILOT_OPEN_CRITICAL_ISSUES=1',
    ]))

    expect(result.status).toBe(1)
    expect(result.stderr).toContain('Support SLA is 48h')
    expect(result.stderr).toContain('Open critical support issues is 1')
  })

  it('requires summary export when running as the load gate', () => {
    const result = runPreflight(
      baseEnvLines([
        'K6_SUMMARY_EXPORT=',
      ]),
      { HOCKEY_PILOT_GATE_MODES: 'deterministic,load' }
    )

    expect(result.status).toBe(1)
    expect(result.stderr).toContain('Set K6_SUMMARY_EXPORT=load-tests/hockey-pilot-summary.json so the run saves evidence for review.')
  })

  it('only warns about missing summary export outside the load gate', () => {
    const result = runPreflight(baseEnvLines([
      'K6_SUMMARY_EXPORT=',
    ]))

    expect(result.status).toBe(0)
    expect(result.stderr).toContain('Set K6_SUMMARY_EXPORT=load-tests/hockey-pilot-summary.json so the run saves evidence for review.')
  })
})

import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'

const testDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(testDir, '../..')
const runnerPath = path.resolve(testDir, 'run.cjs')

const tempDirs: string[] = []

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop()
    if (dir) rmSync(dir, { recursive: true, force: true })
  }
})

function tempDir() {
  const dir = mkdtempSync(path.join(tmpdir(), 'hockey-runner-'))
  tempDirs.push(dir)
  return dir
}

function writeEnvFile(dir: string, lines: string[]) {
  const envPath = path.join(dir, '.env.k6')
  writeFileSync(envPath, `${lines.join('\n')}\n`)
  return envPath
}

function writeFakeK6(dir: string, options: { fail?: boolean; gateFail?: boolean } = {}) {
  const logPath = path.join(dir, 'k6-log.json')
  const scriptPath = path.join(dir, 'fake-k6.cjs')
  writeFileSync(scriptPath, [
    '#!/usr/bin/env node',
    'const fs = require("fs");',
    'const path = require("path");',
    `const logPath = ${JSON.stringify(logPath)};`,
    `const shouldFail = ${options.fail ? 'true' : 'false'};`,
    `const gateFail = ${options.gateFail ? 'true' : 'false'};`,
    'const args = process.argv.slice(2);',
    'fs.writeFileSync(logPath, JSON.stringify({ args, env: { CLIENT_ID: process.env.CLIENT_ID, HOCKEY_PILOT_ATHLETE_WEIGHT: process.env.HOCKEY_PILOT_ATHLETE_WEIGHT } }, null, 2));',
    'const exportIndex = args.indexOf("--summary-export");',
    'if (exportIndex >= 0) {',
    '  const output = args[exportIndex + 1];',
    '  const endpoints = ["business-stats","team-dashboard","hockey-tests-list","hockey-package","hockey-athlete-summary","athlete-calendar","daily-metrics-get","daily-metrics-post","hockey-simca-export"];',
    '  const metrics = { http_req_failed: { values: { rate: gateFail ? 0.10 : 0.001 } }, http_req_duration: { values: { "p(95)": gateFail ? 2600 : 1000, "p(99)": gateFail ? 7000 : 3000 } } };',
    '  for (const endpoint of endpoints) {',
    '    metrics["endpoint_duration{endpoint:" + endpoint + "}"] = { values: { "p(95)": 800, "p(99)": 1800 } };',
    '    metrics["endpoint_failed{endpoint:" + endpoint + "}"] = { values: { rate: 0 } };',
    '  }',
    '  fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true });',
    '  fs.writeFileSync(output, JSON.stringify({ metrics }, null, 2));',
    '}',
    'if (shouldFail) process.exit(42);',
    'console.log("fake k6 run ok");',
    '',
  ].join('\n'))
  chmodSync(scriptPath, 0o755)
  return { scriptPath, logPath }
}

function sidecarPath(summaryPath: string, suffix: string) {
  const ext = path.extname(summaryPath)
  const base = ext ? summaryPath.slice(0, -ext.length) : summaryPath
  return `${base}.${suffix}.txt`
}

function manifestPath(summaryPath: string) {
  const ext = path.extname(summaryPath)
  const base = ext ? summaryPath.slice(0, -ext.length) : summaryPath
  return `${base}.manifest.json`
}

function baseEnvLines(overrides: string[] = []) {
  return [
    'BASE_URL=https://pilot.example.com',
    'CLIENT_ID=client-from-file',
    'BUSINESS_ID=business-1',
    'TEAM_ID=team-1',
    'LOAD_TEST_BYPASS_USER_EMAIL=coach@example.com',
    'LOAD_TEST_BYPASS_SECRET=test-secret',
    'ATHLETE_LOAD_TEST_BYPASS_USER_EMAIL=athlete@example.com',
    ...overrides,
  ]
}

function runRunner(args: string[], env: Record<string, string>) {
  const childEnv = { ...process.env }
  for (const key of [
    'K6_BIN',
    'K6_ENV_PATH',
    'K6_SUMMARY_EXPORT',
    'BASE_URL',
    'CLIENT_ID',
    'CLIENT_IDS',
    'BUSINESS_ID',
    'BUSINESS_SLUG',
    'TEAM_ID',
    'AUTH_COOKIE',
    'BEARER_TOKEN',
    'LOAD_TEST_BYPASS_USER_EMAIL',
    'LOAD_TEST_BYPASS_SECRET',
    'ATHLETE_AUTH_COOKIE',
    'ATHLETE_BEARER_TOKEN',
    'HOCKEY_PILOT_ATHLETE_WEIGHT',
    'ATHLETE_LOAD_TEST_BYPASS_USER_EMAIL',
    'HOCKEY_PILOT_READ_WEIGHT',
    'HOCKEY_PILOT_DASHBOARD_WEIGHT',
    'HOCKEY_PILOT_EXPORT_WEIGHT',
  ]) {
    delete childEnv[key]
  }

  return spawnSync(process.execPath, [runnerPath, ...args], {
    cwd: repoRoot,
    env: { ...childEnv, ...env },
    encoding: 'utf8',
  })
}

describe('load-tests k6 runner', () => {
  it('runs hockey preflight, fake k6, and summary gate for exported pilot runs', () => {
    const dir = tempDir()
    const envPath = writeEnvFile(dir, baseEnvLines())
    const summaryPath = path.join(dir, 'summary.json')
    const fakeK6 = writeFakeK6(dir)

    const result = runRunner(['hockey-pilot'], {
      K6_ENV_PATH: envPath,
      K6_BIN: fakeK6.scriptPath,
      K6_SUMMARY_EXPORT: summaryPath,
    })

    expect(result.status).toBe(0)
    expect(result.stdout).toContain('Running hockey pilot env preflight')
    expect(result.stdout).toContain('fake k6 run ok')
    expect(result.stdout).toContain('Running k6 summary analyzer')
    expect(result.stdout).toContain('Per Endpoint')
    expect(result.stdout).toContain('Running hockey pilot summary gate')
    expect(result.stdout).toContain('Hockey pilot summary gate passed.')
    expect(existsSync(summaryPath)).toBe(true)
    expect(readFileSync(sidecarPath(summaryPath, 'analyzer'), 'utf8')).toContain('Per Endpoint')
    expect(readFileSync(sidecarPath(summaryPath, 'gate'), 'utf8')).toContain('Hockey pilot summary gate passed.')

    const manifest = JSON.parse(readFileSync(manifestPath(summaryPath), 'utf8'))
    expect(manifest.script).toBe('hockey-pilot')
    expect(manifest.result).toEqual({ status: 'passed', failedStep: null, exitCode: 0, k6ExitCode: 0 })
    expect(manifest.target).toBe('https://pilot.example.com')
    expect(manifest.businessId).toBe('business-1')
    expect(manifest.teamId).toBe('team-1')
    expect(manifest.clientIdCount).toBe(1)
    expect(manifest.coachAuthMode).toBe('LOAD_TEST_BYPASS_USER_EMAIL')
    expect(manifest.athleteAuthMode).toBe('ATHLETE_LOAD_TEST_BYPASS_USER_EMAIL')
    expect(manifest.weights).toEqual({
      read: '0.40',
      athlete: '0.25',
      dashboard: '0.20',
      export: '0.15',
    })
    expect(manifest.artifacts.summaryJson).toBe(summaryPath)
    expect(manifest.artifacts.analyzerOutput).toBe(sidecarPath(summaryPath, 'analyzer'))
    expect(manifest.artifacts.gateOutput).toBe(sidecarPath(summaryPath, 'gate'))
  })

  it('passes env file values to k6 while letting shell env override them', () => {
    const dir = tempDir()
    const envPath = writeEnvFile(dir, baseEnvLines(['HOCKEY_PILOT_ATHLETE_WEIGHT=0']))
    const fakeK6 = writeFakeK6(dir)

    const result = runRunner(['hockey-pilot'], {
      K6_ENV_PATH: envPath,
      K6_BIN: fakeK6.scriptPath,
      CLIENT_ID: 'client-from-shell',
    })

    const log = JSON.parse(readFileSync(fakeK6.logPath, 'utf8'))
    expect(result.status).toBe(0)
    expect(log.env.CLIENT_ID).toBe('client-from-shell')
    expect(log.env.HOCKEY_PILOT_ATHLETE_WEIGHT).toBe('0')
  })

  it('normalizes quoted env values and inline comments before passing them to k6', () => {
    const dir = tempDir()
    const envPath = writeEnvFile(dir, [
      'BASE_URL="https://pilot.example.com"',
      'CLIENT_ID=client-with-comment # picked athlete',
      'BUSINESS_ID=business-1',
      'TEAM_ID=team-1',
      'AUTH_COOKIE="session=value"',
      'HOCKEY_PILOT_ATHLETE_WEIGHT=0',
    ])
    const fakeK6 = writeFakeK6(dir)

    const result = runRunner(['hockey-pilot'], {
      K6_ENV_PATH: envPath,
      K6_BIN: fakeK6.scriptPath,
    })

    const log = JSON.parse(readFileSync(fakeK6.logPath, 'utf8'))
    expect(result.status).toBe(0)
    expect(log.env.CLIENT_ID).toBe('client-with-comment')
    expect(log.env.HOCKEY_PILOT_ATHLETE_WEIGHT).toBe('0')
  })

  it('uses K6_SUMMARY_EXPORT from the env file when the shell does not set it', () => {
    const dir = tempDir()
    const summaryPath = path.join(dir, 'summary-from-file.json')
    const envPath = writeEnvFile(dir, baseEnvLines([
      `K6_SUMMARY_EXPORT=${summaryPath}`,
    ]))
    const fakeK6 = writeFakeK6(dir)

    const result = runRunner(['hockey-pilot'], {
      K6_ENV_PATH: envPath,
      K6_BIN: fakeK6.scriptPath,
    })

    expect(result.status).toBe(0)
    expect(existsSync(summaryPath)).toBe(true)
    expect(existsSync(sidecarPath(summaryPath, 'analyzer'))).toBe(true)
    expect(existsSync(sidecarPath(summaryPath, 'gate'))).toBe(true)
    expect(existsSync(manifestPath(summaryPath))).toBe(true)
    expect(result.stdout).toContain('Running k6 summary analyzer')
    expect(result.stdout).toContain('Hockey pilot summary gate passed.')
  })

  it('stops before k6 when hockey preflight fails', () => {
    const dir = tempDir()
    const envPath = writeEnvFile(dir, baseEnvLines([
      'ATHLETE_LOAD_TEST_BYPASS_USER_EMAIL=',
    ]))
    const fakeK6 = writeFakeK6(dir)

    const result = runRunner(['hockey-pilot'], {
      K6_ENV_PATH: envPath,
      K6_BIN: fakeK6.scriptPath,
    })

    expect(result.status).toBe(1)
    expect(result.stderr).toContain('Athlete traffic is enabled but athlete auth is missing')
    expect(existsSync(fakeK6.logPath)).toBe(false)
  })

  it('captures evidence when k6 exits nonzero after writing a summary', () => {
    const dir = tempDir()
    const envPath = writeEnvFile(dir, baseEnvLines())
    const summaryPath = path.join(dir, 'summary.json')
    const fakeK6 = writeFakeK6(dir, { fail: true })

    const result = runRunner(['hockey-pilot'], {
      K6_ENV_PATH: envPath,
      K6_BIN: fakeK6.scriptPath,
      K6_SUMMARY_EXPORT: summaryPath,
    })

    expect(result.status).toBe(42)
    expect(result.stdout).toContain('Running k6 summary analyzer')
    expect(result.stdout).toContain('Running hockey pilot summary gate')

    const manifest = JSON.parse(readFileSync(manifestPath(summaryPath), 'utf8'))
    expect(manifest.result).toEqual({ status: 'failed', failedStep: 'k6', exitCode: 42, k6ExitCode: 42 })
  })

  it('saves analyzer and gate output when the summary gate fails', () => {
    const dir = tempDir()
    const envPath = writeEnvFile(dir, baseEnvLines())
    const summaryPath = path.join(dir, 'bad-summary.json')
    const fakeK6 = writeFakeK6(dir, { gateFail: true })

    const result = runRunner(['hockey-pilot'], {
      K6_ENV_PATH: envPath,
      K6_BIN: fakeK6.scriptPath,
      K6_SUMMARY_EXPORT: summaryPath,
    })

    expect(result.status).toBe(1)
    expect(readFileSync(sidecarPath(summaryPath, 'analyzer'), 'utf8')).toContain('HTTP failed')
    expect(readFileSync(sidecarPath(summaryPath, 'gate'), 'utf8')).toContain('Hockey pilot summary gate failed')

    const manifest = JSON.parse(readFileSync(manifestPath(summaryPath), 'utf8'))
    expect(manifest.result).toEqual({ status: 'failed', failedStep: 'summary-gate', exitCode: 1, k6ExitCode: 0 })
    expect(manifest.artifacts.gateOutput).toBe(sidecarPath(summaryPath, 'gate'))
  })
})

import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it, vi } from 'vitest'

const testDir = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
const { buildCommands, commandWarnings, isProductionLikeUrl, main, shellQuote, todayIsoDate } = require(path.join(testDir, 'qa-hockey-evidence-commands.cjs'))

describe('qa-hockey-evidence-commands', () => {
  it('builds browser and load evidence commands from pilot env', () => {
    const commands = buildCommands({
      GIT_COMMIT_SHA: 'abc123pilotsha',
      TRAINOMICS_QA_BASE_URL: 'https://trainomics-hockey-pilot.vercel.app',
      HOCKEY_PILOT_TARGET_COMMIT_SHA: 'abc123pilotsha',
      TRAINOMICS_QA_EMAIL: 'pilot-coach@trainomics.test',
      TRAINOMICS_QA_PASSWORD: 'secret pass',
      TRAINOMICS_QA_BUSINESS_SLUG: 'pilot-club',
      HOCKEY_PILOT_TEAM_COUNT: '4',
      HOCKEY_PILOT_ATHLETES_PER_TEAM: '22',
      HOCKEY_PILOT_STAFF_PER_TEAM: '3',
      HOCKEY_PILOT_EXPECTED_PEAK_USERS: '38',
      HOCKEY_PILOT_WARM_VUS: '8',
      HOCKEY_PILOT_STEADY_VUS: '24',
      HOCKEY_PILOT_PEAK_VUS: '40',
      HOCKEY_PILOT_WARM_DURATION: '1m',
      HOCKEY_PILOT_STEADY_DURATION: '5m',
      HOCKEY_PILOT_PEAK_DURATION: '3m',
      HOCKEY_PILOT_RAMP_DOWN_DURATION: '1m',
      HOCKEY_PILOT_READ_WEIGHT: '0.50',
      HOCKEY_PILOT_ATHLETE_WEIGHT: '0.20',
      HOCKEY_PILOT_DASHBOARD_WEIGHT: '0.20',
      HOCKEY_PILOT_EXPORT_WEIGHT: '0.10',
      HOCKEY_EXPORT_PRESET: 'team_summary',
      HOCKEY_PILOT_SUPPORT_OWNER: 'Henrik',
      HOCKEY_PILOT_SUPPORT_SLA_HOURS: '12',
      HOCKEY_PILOT_SUPPORT_NOTES_URL: 'https://notes.example.com/pilot',
      HOCKEY_PILOT_OPEN_CRITICAL_ISSUES: '0',
      HOCKEY_PILOT_INVITE_MODE: 'manual',
      EMAILS_PAUSED: 'true',
      HOCKEY_PILOT_MANUAL_INVITE_OWNER: 'Henrik',
      K6_SUMMARY_EXPORT: 'load-tests/evidence/hockey-pilot-2026-05-09.json',
    })

    expect(commands.currentCommit).toBe('abc123pilotsha')
    expect(commands.targetCommit).toBe('abc123pilotsha')
    expect(commands.browserCommand).toContain('TRAINOMICS_QA_BASE_URL=https://trainomics-hockey-pilot.vercel.app')
    expect(commands.browserCommand).toContain('TRAINOMICS_QA_EMAIL=pilot-coach@trainomics.test')
    expect(commands.browserCommand).toContain('TRAINOMICS_QA_PASSWORD="secret pass"')
    expect(commands.browserCommand).toContain('npm run qa:hockey-pilot-gates -- --include-browser')
    expect(commands.loadCommand).toContain('HOCKEY_PILOT_TEAM_COUNT=4')
    expect(commands.loadCommand).toContain('BASE_URL=https://trainomics-hockey-pilot.vercel.app')
    expect(commands.loadCommand).toContain('HOCKEY_PILOT_ATHLETES_PER_TEAM=22')
    expect(commands.loadCommand).toContain('HOCKEY_PILOT_STAFF_PER_TEAM=3')
    expect(commands.loadCommand).toContain('HOCKEY_PILOT_EXPECTED_PEAK_USERS=38')
    expect(commands.loadCommand).toContain('HOCKEY_PILOT_WARM_VUS=8')
    expect(commands.loadCommand).toContain('HOCKEY_PILOT_STEADY_VUS=24')
    expect(commands.loadCommand).toContain('HOCKEY_PILOT_PEAK_VUS=40')
    expect(commands.loadCommand).toContain('HOCKEY_PILOT_WARM_DURATION=1m')
    expect(commands.loadCommand).toContain('HOCKEY_PILOT_STEADY_DURATION=5m')
    expect(commands.loadCommand).toContain('HOCKEY_PILOT_PEAK_DURATION=3m')
    expect(commands.loadCommand).toContain('HOCKEY_PILOT_RAMP_DOWN_DURATION=1m')
    expect(commands.loadCommand).toContain('HOCKEY_PILOT_READ_WEIGHT=0.50')
    expect(commands.loadCommand).toContain('HOCKEY_PILOT_ATHLETE_WEIGHT=0.20')
    expect(commands.loadCommand).toContain('HOCKEY_PILOT_DASHBOARD_WEIGHT=0.20')
    expect(commands.loadCommand).toContain('HOCKEY_PILOT_EXPORT_WEIGHT=0.10')
    expect(commands.loadCommand).toContain('HOCKEY_EXPORT_PRESET=team_summary')
    expect(commands.loadCommand).toContain('HOCKEY_PILOT_SUPPORT_OWNER=Henrik')
    expect(commands.loadCommand).toContain('HOCKEY_PILOT_SUPPORT_NOTES_URL=https://notes.example.com/pilot')
    expect(commands.loadCommand).toContain('HOCKEY_PILOT_INVITE_MODE=manual')
    expect(commands.loadCommand).toContain('K6_SUMMARY_EXPORT=load-tests/evidence/hockey-pilot-2026-05-09.json')
    expect(commands.loadCommand).toContain('npm run qa:hockey-pilot-gates -- --include-load')
    expect(commands.warnings).toEqual([])
  })

  it('keeps an explicit target deployment commit when provided', () => {
    const commands = buildCommands({
      GIT_COMMIT_SHA: 'abc123pilotsha',
      HOCKEY_PILOT_TARGET_COMMIT_SHA: 'abc123',
    })

    expect(commands.currentCommit).toBe('abc123pilotsha')
    expect(commands.targetCommit).toBe('abc123')
    expect(commands.loadCommand).toContain('HOCKEY_PILOT_TARGET_COMMIT_SHA=abc123')
  })

  it('uses BASE_URL as a target URL fallback for load-focused env', () => {
    const commands = buildCommands({
      GIT_COMMIT_SHA: 'abc123pilotsha',
      BASE_URL: 'https://trainomics-load-pilot.vercel.app',
      HOCKEY_PILOT_TARGET_COMMIT_SHA: 'abc123',
    })

    expect(commands.deploymentUrl).toBe('https://trainomics-load-pilot.vercel.app')
    expect(commands.browserCommand).toContain('TRAINOMICS_QA_BASE_URL=https://trainomics-load-pilot.vercel.app')
    expect(commands.loadCommand).toContain('BASE_URL=https://trainomics-load-pilot.vercel.app')
  })

  it('uses today in the default evidence export path', () => {
    const commands = buildCommands({
      GIT_COMMIT_SHA: 'abc123pilotsha',
    })

    expect(commands.loadCommand).toContain(`K6_SUMMARY_EXPORT=load-tests/evidence/hockey-pilot-${todayIsoDate()}.json`)
  })

  it('uses the first hockey pilot wave as the default load shape', () => {
    const commands = buildCommands({
      GIT_COMMIT_SHA: 'abc123pilotsha',
    })

    expect(commands.loadCommand).toContain('HOCKEY_PILOT_TEAM_COUNT=6')
    expect(commands.loadCommand).toContain('HOCKEY_PILOT_ATHLETES_PER_TEAM=30')
    expect(commands.loadCommand).toContain('HOCKEY_PILOT_STAFF_PER_TEAM=5')
    expect(commands.loadCommand).toContain('HOCKEY_PILOT_EXPECTED_PEAK_USERS=75')
    expect(commands.loadCommand).toContain('HOCKEY_PILOT_PEAK_VUS=75')
    expect(commands.loadCommand).toContain('HOCKEY_PILOT_PEAK_DURATION=4m')
    expect(commands.loadCommand).toContain('HOCKEY_PILOT_READ_WEIGHT=0.40')
    expect(commands.loadCommand).toContain('HOCKEY_PILOT_ATHLETE_WEIGHT=0.25')
    expect(commands.loadCommand).toContain('HOCKEY_EXPORT_PRESET=aerobic_profile')
  })

  it('quotes shell values that contain spaces', () => {
    expect(shellQuote('Support Lead')).toBe('"Support Lead"')
    expect(shellQuote('https://pilot.example.com')).toBe('https://pilot.example.com')
  })

  it('reports placeholders that must be replaced before running', () => {
    expect(commandWarnings({
      deploymentUrl: 'https://pilot.example.com',
      qaEmail: 'coach@example.com',
      qaPassword: '...',
      supportOwner: 'Support Lead',
      targetCommit: 'vercel-deployment-commit-sha',
      targetCommitProvided: true,
    })).toEqual([
      'Set TRAINOMICS_QA_BASE_URL to the real production-like pilot URL.',
      'Set TRAINOMICS_QA_EMAIL to a real QA coach login.',
      'Set TRAINOMICS_QA_PASSWORD to the real QA coach password.',
      'Set HOCKEY_PILOT_SUPPORT_OWNER to a named person.',
      'Replace HOCKEY_PILOT_TARGET_COMMIT_SHA with the real Vercel deployment commit.',
    ])
  })

  it('reports non-production-like evidence URLs', () => {
    expect(isProductionLikeUrl('https://trainomics-hockey-pilot.vercel.app')).toBe(true)
    expect(isProductionLikeUrl('http://trainomics-hockey-pilot.vercel.app')).toBe(false)
    expect(isProductionLikeUrl('http://localhost:3000')).toBe(false)

    expect(commandWarnings({
      deploymentUrl: 'http://localhost:3000',
      qaEmail: 'pilot-coach@trainomics.test',
      qaPassword: 'secret',
      supportOwner: 'Henrik',
      targetCommit: 'abc123',
      targetCommitProvided: true,
    })).toEqual([
      'Use a production-like https URL for invite evidence.',
    ])
  })

  it('reports when the deployment commit was not explicitly provided', () => {
    expect(commandWarnings({
      deploymentUrl: 'https://trainomics-hockey-pilot.vercel.app',
      qaEmail: 'pilot-coach@trainomics.test',
      qaPassword: 'secret',
      supportOwner: 'Henrik',
      targetCommit: 'abc123',
      targetCommitProvided: false,
    })).toEqual([
      'Set HOCKEY_PILOT_TARGET_COMMIT_SHA from the Vercel deployment before invite evidence.',
    ])

    const commands = buildCommands({
      GIT_COMMIT_SHA: 'abc123pilotsha',
      TRAINOMICS_QA_BASE_URL: 'https://trainomics-hockey-pilot.vercel.app',
      HOCKEY_PILOT_TARGET_COMMIT_SHA: '   ',
      TRAINOMICS_QA_EMAIL: 'pilot-coach@trainomics.test',
      TRAINOMICS_QA_PASSWORD: 'secret',
      HOCKEY_PILOT_SUPPORT_OWNER: 'Henrik',
    })

    expect(commands.targetCommit).toBe('abc123pilotsha')
    expect(commands.warnings).toContain('Set HOCKEY_PILOT_TARGET_COMMIT_SHA from the Vercel deployment before invite evidence.')
  })

  it('prints inspect and evidence commands', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    let output = ''
    try {
      main({
        GIT_COMMIT_SHA: 'abc123pilotsha',
        TRAINOMICS_QA_BASE_URL: 'https://pilot.example.com',
      })
      output = log.mock.calls.map((call) => call.join(' ')).join('\n')
    } finally {
      log.mockRestore()
    }

    expect(output).toContain('vercel inspect https://pilot.example.com')
    expect(output).toContain('Replace before running:')
    expect(output).toContain('Set TRAINOMICS_QA_BASE_URL to the real production-like pilot URL.')
    expect(output).toContain('Browser evidence:')
    expect(output).toContain('Load evidence:')
  })
})

import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it, vi } from 'vitest'

const testDir = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
const { buildCommands, commandWarnings, main, shellQuote, todayIsoDate } = require(path.join(testDir, 'qa-hockey-evidence-commands.cjs'))

describe('qa-hockey-evidence-commands', () => {
  it('builds browser and load evidence commands from pilot env', () => {
    const commands = buildCommands({
      GIT_COMMIT_SHA: 'abc123pilotsha',
      TRAINOMICS_QA_BASE_URL: 'https://pilot.example.com',
      TRAINOMICS_QA_EMAIL: 'pilot-coach@trainomics.test',
      TRAINOMICS_QA_PASSWORD: 'secret pass',
      TRAINOMICS_QA_BUSINESS_SLUG: 'pilot-club',
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
    expect(commands.browserCommand).toContain('TRAINOMICS_QA_BASE_URL=https://pilot.example.com')
    expect(commands.browserCommand).toContain('TRAINOMICS_QA_EMAIL=pilot-coach@trainomics.test')
    expect(commands.browserCommand).toContain('TRAINOMICS_QA_PASSWORD="secret pass"')
    expect(commands.browserCommand).toContain('npm run qa:hockey-pilot-gates -- --include-browser')
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

  it('uses today in the default evidence export path', () => {
    const commands = buildCommands({
      GIT_COMMIT_SHA: 'abc123pilotsha',
    })

    expect(commands.loadCommand).toContain(`K6_SUMMARY_EXPORT=load-tests/evidence/hockey-pilot-${todayIsoDate()}.json`)
  })

  it('quotes shell values that contain spaces', () => {
    expect(shellQuote('Support Lead')).toBe('"Support Lead"')
    expect(shellQuote('https://pilot.example.com')).toBe('https://pilot.example.com')
  })

  it('reports placeholders that must be replaced before running', () => {
    expect(commandWarnings({
      qaEmail: 'coach@example.com',
      qaPassword: '...',
      supportOwner: 'Support Lead',
      targetCommit: 'vercel-deployment-commit-sha',
    })).toEqual([
      'Set TRAINOMICS_QA_EMAIL to a real QA coach login.',
      'Set TRAINOMICS_QA_PASSWORD to the real QA coach password.',
      'Set HOCKEY_PILOT_SUPPORT_OWNER to a named person.',
      'Replace HOCKEY_PILOT_TARGET_COMMIT_SHA with the real Vercel deployment commit.',
    ])
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
    expect(output).toContain('Browser evidence:')
    expect(output).toContain('Load evidence:')
  })
})

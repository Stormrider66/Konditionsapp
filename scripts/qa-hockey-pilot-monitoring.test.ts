import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const testDir = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
const { REQUIRED_CHECKS, readMonitoringPlan, validateMonitoringPlan } = require(path.join(testDir, 'qa-hockey-pilot-monitoring.cjs'))

describe('qa-hockey-pilot-monitoring', () => {
  it('builds the first 48-hour monitoring plan from env', () => {
    const plan = readMonitoringPlan({
      HOCKEY_PILOT_SUPPORT_OWNER: 'Henrik',
      HOCKEY_PILOT_SUPPORT_NOTES_URL: 'https://notes.example.com/hockey-pilot',
      HOCKEY_PILOT_INCIDENT_CHANNEL: '#hockey-pilot',
      HOCKEY_PILOT_FIRST_CHECK_MINUTES: '20',
      HOCKEY_PILOT_QUIET_HOURS_BEFORE_EXPANSION: '72',
    })

    expect(plan).toMatchObject({
      supportOwner: 'Henrik',
      supportNotesUrl: 'https://notes.example.com/hockey-pilot',
      incidentChannel: '#hockey-pilot',
      firstCheckMinutes: 20,
      quietHoursBeforeExpansion: 72,
    })
    expect(plan.requiredChecks).toEqual(REQUIRED_CHECKS)
  })

  it('passes when support ownership and monitoring cadence are ready', () => {
    const validation = validateMonitoringPlan(readMonitoringPlan({
      HOCKEY_PILOT_SUPPORT_OWNER: 'Henrik',
      HOCKEY_PILOT_SUPPORT_NOTES_URL: 'https://notes.example.com/hockey-pilot',
      HOCKEY_PILOT_INCIDENT_CHANNEL: '#hockey-pilot',
      HOCKEY_PILOT_FIRST_CHECK_MINUTES: '30',
      HOCKEY_PILOT_QUIET_HOURS_BEFORE_EXPANSION: '48',
    }))

    expect(validation).toEqual({
      ok: true,
      errors: [],
      warnings: [],
    })
  })

  it('fails when required monitoring ownership is missing', () => {
    const validation = validateMonitoringPlan(readMonitoringPlan({
      HOCKEY_PILOT_FIRST_CHECK_MINUTES: '10',
      HOCKEY_PILOT_QUIET_HOURS_BEFORE_EXPANSION: '24',
    }))

    expect(validation.ok).toBe(false)
    expect(validation.errors).toEqual([
      'Set HOCKEY_PILOT_SUPPORT_OWNER before post-invite monitoring.',
      'Set HOCKEY_PILOT_SUPPORT_NOTES_URL before post-invite monitoring.',
      'HOCKEY_PILOT_FIRST_CHECK_MINUTES must be at least 15.',
      'HOCKEY_PILOT_QUIET_HOURS_BEFORE_EXPANSION must be at least 48.',
    ])
    expect(validation.warnings).toEqual([
      'Set HOCKEY_PILOT_INCIDENT_CHANNEL so urgent pilot issues have one place to land.',
    ])
  })
})

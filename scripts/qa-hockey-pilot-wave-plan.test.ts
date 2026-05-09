import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const testDir = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
const { buildWavePlan, readPlan, validatePlan } = require(path.join(testDir, 'qa-hockey-pilot-wave-plan.cjs'))

describe('qa-hockey-pilot-wave-plan', () => {
  it('builds the default 3-6 team rollout waves', () => {
    expect(buildWavePlan(6)).toEqual([
      'Internal dry run',
      'Team 1',
      'Teams 2-3 after 48 quiet hours',
      'Teams 4-6 after rerunning the load gate',
    ])
  })

  it('keeps smaller pilots focused on the actual team count', () => {
    expect(buildWavePlan(2)).toEqual([
      'Internal dry run',
      'Team 1',
      'Team 2 after 48 quiet hours',
    ])
    expect(buildWavePlan(4)).toContain('Team 4 after rerunning the load gate')
  })

  it('reads pilot sizing from environment variables', () => {
    const plan = readPlan({
      HOCKEY_PILOT_TEAM_COUNT: '4',
      HOCKEY_PILOT_ATHLETES_PER_TEAM: '24',
      HOCKEY_PILOT_STAFF_PER_TEAM: '3',
      HOCKEY_PILOT_EXPECTED_PEAK_USERS: '45',
      HOCKEY_PILOT_SUPPORT_OWNER: 'Henrik',
      HOCKEY_PILOT_SUPPORT_SLA_HOURS: '12',
      HOCKEY_PILOT_OPEN_CRITICAL_ISSUES: '0',
    })

    expect(plan).toMatchObject({
      teamCount: 4,
      athletesPerTeam: 24,
      staffPerTeam: 3,
      expectedPeakUsers: 45,
      supportOwner: 'Henrik',
      supportSlaHours: 12,
      openCriticalIssues: 0,
      estimatedAthletes: 96,
      estimatedStaff: 12,
      estimatedUsers: 108,
    })
  })

  it('passes the default pilot plan with load-gate warnings', () => {
    const validation = validatePlan(readPlan({}))
    expect(validation.errors).toEqual([])
    expect(validation.warnings).toContain('Teams 4-6 require a fresh --include-load gate before inviting.')
    expect(validation.warnings).toContain('Set HOCKEY_PILOT_SUPPORT_OWNER before sending external invites.')
    expect(validation.warnings).toContain('Expected peak is above the normal pilot window; keep the 75-VU load evidence attached to the invite decision.')
  })

  it('fails plans that exceed the first pilot gate', () => {
    const validation = validatePlan(readPlan({
      HOCKEY_PILOT_TEAM_COUNT: '7',
      HOCKEY_PILOT_ATHLETES_PER_TEAM: '45',
      HOCKEY_PILOT_STAFF_PER_TEAM: '9',
      HOCKEY_PILOT_EXPECTED_PEAK_USERS: '90',
      HOCKEY_PILOT_SUPPORT_SLA_HOURS: '48',
      HOCKEY_PILOT_OPEN_CRITICAL_ISSUES: '1',
    }))

    expect(validation.errors).toEqual([
      'Pilot team count is 7; this gate is sized for up to 6 teams before the full 5,000-user checklist.',
      'Athletes per team is 45; this gate is sized for up to 40 athletes per team.',
      'Staff per team is 9; this gate is sized for up to 8 staff per team.',
      'Estimated pilot users is 378; keep this first pilot at or below 300 users.',
      'Expected peak users is 90; rerun and raise the load gate before inviting above 75 concurrent users.',
      'Support SLA is 48h; keep pilot response time at or below 24h.',
      'Open critical support issues is 1; close critical issues before inviting another wave.',
    ])
  })

  it('fails non-numeric pilot sizing clearly', () => {
    const validation = validatePlan(readPlan({
      HOCKEY_PILOT_TEAM_COUNT: 'many',
    }))

    expect(validation.errors).toEqual([
      'HOCKEY_PILOT_TEAM_COUNT must be a positive whole number.',
    ])
  })
})

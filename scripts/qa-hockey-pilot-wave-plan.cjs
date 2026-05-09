#!/usr/bin/env node

const DEFAULTS = {
  teamCount: 6,
  athletesPerTeam: 30,
  staffPerTeam: 5,
  expectedPeakUsers: 75,
  quietHoursBeforeExpansion: 48,
  supportSlaHours: 24,
  openCriticalIssues: 0,
}

const LIMITS = {
  maxTeams: 6,
  maxAthletesPerTeam: 40,
  maxStaffPerTeam: 8,
  maxEstimatedUsers: 300,
  maxPeakUsers: 75,
  minQuietHoursBeforeExpansion: 48,
  maxSupportSlaHours: 24,
  maxOpenCriticalIssues: 0,
}

function parsePositiveInteger(value, fallback) {
  if (value == null || value === '') return fallback
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : Number.NaN
}

function parseNonNegativeInteger(value, fallback) {
  if (value == null || value === '') return fallback
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : Number.NaN
}

function buildWavePlan(teamCount, quietHoursBeforeExpansion = DEFAULTS.quietHoursBeforeExpansion) {
  const waves = [
    {
      label: 'Internal dry run',
      gate: 'Local readiness, browser evidence, and load evidence pass before any external invite.',
    },
    {
      label: 'Team 1',
      gate: 'Invite one team only after owners and support notes are named.',
    },
  ]

  if (teamCount >= 2) {
    const end = Math.min(teamCount, 3)
    waves.push({
      label: end === 2 ? 'Team 2' : 'Teams 2-3',
      gate: `Invite after ${quietHoursBeforeExpansion} quiet hours with no pause criteria hit.`,
    })
  }

  if (teamCount >= 4) {
    waves.push({
      label: teamCount === 4 ? 'Team 4' : `Teams 4-${teamCount}`,
      gate: 'Rerun production-like browser and load evidence before inviting.',
    })
  }

  return waves
}

function readPlan(env = process.env) {
  const teamCount = parsePositiveInteger(env.HOCKEY_PILOT_TEAM_COUNT, DEFAULTS.teamCount)
  const athletesPerTeam = parsePositiveInteger(env.HOCKEY_PILOT_ATHLETES_PER_TEAM, DEFAULTS.athletesPerTeam)
  const staffPerTeam = parsePositiveInteger(env.HOCKEY_PILOT_STAFF_PER_TEAM, DEFAULTS.staffPerTeam)
  const expectedPeakUsers = parsePositiveInteger(env.HOCKEY_PILOT_EXPECTED_PEAK_USERS, DEFAULTS.expectedPeakUsers)
  const quietHoursBeforeExpansion = parsePositiveInteger(env.HOCKEY_PILOT_QUIET_HOURS_BEFORE_EXPANSION, DEFAULTS.quietHoursBeforeExpansion)
  const supportOwner = typeof env.HOCKEY_PILOT_SUPPORT_OWNER === 'string' && env.HOCKEY_PILOT_SUPPORT_OWNER.trim()
    ? env.HOCKEY_PILOT_SUPPORT_OWNER.trim()
    : null
  const supportSlaHours = parsePositiveInteger(env.HOCKEY_PILOT_SUPPORT_SLA_HOURS, DEFAULTS.supportSlaHours)
  const openCriticalIssues = parseNonNegativeInteger(env.HOCKEY_PILOT_OPEN_CRITICAL_ISSUES, DEFAULTS.openCriticalIssues)
  const estimatedAthletes = teamCount * athletesPerTeam
  const estimatedStaff = teamCount * staffPerTeam
  const estimatedUsers = estimatedAthletes + estimatedStaff

  return {
    teamCount,
    athletesPerTeam,
    staffPerTeam,
    expectedPeakUsers,
    quietHoursBeforeExpansion,
    supportOwner,
    supportSlaHours,
    openCriticalIssues,
    estimatedAthletes,
    estimatedStaff,
    estimatedUsers,
    waves: Number.isFinite(teamCount) ? buildWavePlan(teamCount, quietHoursBeforeExpansion) : [],
  }
}

function validatePlan(plan) {
  const errors = []
  const warnings = []

  for (const [label, value] of [
    ['HOCKEY_PILOT_TEAM_COUNT', plan.teamCount],
    ['HOCKEY_PILOT_ATHLETES_PER_TEAM', plan.athletesPerTeam],
    ['HOCKEY_PILOT_STAFF_PER_TEAM', plan.staffPerTeam],
    ['HOCKEY_PILOT_EXPECTED_PEAK_USERS', plan.expectedPeakUsers],
    ['HOCKEY_PILOT_QUIET_HOURS_BEFORE_EXPANSION', plan.quietHoursBeforeExpansion],
    ['HOCKEY_PILOT_SUPPORT_SLA_HOURS', plan.supportSlaHours],
  ]) {
    if (!Number.isFinite(value)) errors.push(`${label} must be a positive whole number.`)
  }
  if (!Number.isFinite(plan.openCriticalIssues)) {
    errors.push('HOCKEY_PILOT_OPEN_CRITICAL_ISSUES must be a non-negative whole number.')
  }

  if (errors.length > 0) return { errors, warnings }

  if (plan.teamCount > LIMITS.maxTeams) {
    errors.push(`Pilot team count is ${plan.teamCount}; this gate is sized for up to ${LIMITS.maxTeams} teams before the full 5,000-user checklist.`)
  }
  if (plan.athletesPerTeam > LIMITS.maxAthletesPerTeam) {
    errors.push(`Athletes per team is ${plan.athletesPerTeam}; this gate is sized for up to ${LIMITS.maxAthletesPerTeam} athletes per team.`)
  }
  if (plan.staffPerTeam > LIMITS.maxStaffPerTeam) {
    errors.push(`Staff per team is ${plan.staffPerTeam}; this gate is sized for up to ${LIMITS.maxStaffPerTeam} staff per team.`)
  }
  if (plan.estimatedUsers > LIMITS.maxEstimatedUsers) {
    errors.push(`Estimated pilot users is ${plan.estimatedUsers}; keep this first pilot at or below ${LIMITS.maxEstimatedUsers} users.`)
  }
  if (plan.expectedPeakUsers > LIMITS.maxPeakUsers) {
    errors.push(`Expected peak users is ${plan.expectedPeakUsers}; rerun and raise the load gate before inviting above ${LIMITS.maxPeakUsers} concurrent users.`)
  }
  if (plan.quietHoursBeforeExpansion < LIMITS.minQuietHoursBeforeExpansion) {
    errors.push(`Quiet hours before expansion is ${plan.quietHoursBeforeExpansion}; wait at least ${LIMITS.minQuietHoursBeforeExpansion} quiet hours before inviting the next wave.`)
  }
  if (plan.supportSlaHours > LIMITS.maxSupportSlaHours) {
    errors.push(`Support SLA is ${plan.supportSlaHours}h; keep pilot response time at or below ${LIMITS.maxSupportSlaHours}h.`)
  }
  if (plan.openCriticalIssues > LIMITS.maxOpenCriticalIssues) {
    errors.push(`Open critical support issues is ${plan.openCriticalIssues}; close critical issues before inviting another wave.`)
  }

  if (plan.teamCount >= 4) {
    warnings.push('Teams 4-6 require a fresh --include-load gate before inviting.')
  }
  if (!plan.supportOwner) {
    warnings.push('Set HOCKEY_PILOT_SUPPORT_OWNER before sending external invites.')
  }
  if (plan.expectedPeakUsers > 40) {
    warnings.push('Expected peak is above the normal pilot window; keep the 75-VU load evidence attached to the invite decision.')
  }

  return { errors, warnings }
}

function printPlan(plan, validation) {
  console.log('Hockey pilot wave plan')
  console.log(`Teams: ${plan.teamCount}`)
  console.log(`Estimated athletes: ${plan.estimatedAthletes}`)
  console.log(`Estimated staff: ${plan.estimatedStaff}`)
  console.log(`Estimated users: ${plan.estimatedUsers}`)
  console.log(`Expected peak users: ${plan.expectedPeakUsers}`)
  console.log(`Quiet hours before expansion: ${plan.quietHoursBeforeExpansion}`)
  console.log(`Support owner: ${plan.supportOwner ?? '-'}`)
  console.log(`Support SLA: ${plan.supportSlaHours}h`)
  console.log(`Open critical support issues: ${plan.openCriticalIssues}`)
  console.log('Invite waves:')
  for (const [index, wave] of plan.waves.entries()) {
    console.log(`${index + 1}. ${wave.label} - ${wave.gate}`)
  }
  for (const warning of validation.warnings) console.warn(`Warning: ${warning}`)
}

function main() {
  const plan = readPlan()
  const validation = validatePlan(plan)

  if (validation.errors.length > 0) {
    console.error('Hockey pilot wave plan failed:')
    for (const error of validation.errors) console.error(`- ${error}`)
    for (const warning of validation.warnings) console.warn(`Warning: ${warning}`)
    process.exitCode = 1
    return
  }

  printPlan(plan, validation)
  console.log('Hockey pilot wave plan passed.')
}

if (require.main === module) {
  main()
}

module.exports = {
  buildWavePlan,
  readPlan,
  validatePlan,
}

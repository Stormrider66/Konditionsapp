#!/usr/bin/env node

const DEFAULTS = {
  teamCount: 6,
  athletesPerTeam: 30,
  staffPerTeam: 5,
  expectedPeakUsers: 75,
}

const LIMITS = {
  maxTeams: 6,
  maxAthletesPerTeam: 40,
  maxStaffPerTeam: 8,
  maxEstimatedUsers: 300,
  maxPeakUsers: 75,
}

function parsePositiveInteger(value, fallback) {
  if (value == null || value === '') return fallback
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : Number.NaN
}

function buildWavePlan(teamCount) {
  const waves = [
    'Internal dry run',
    'Team 1',
  ]

  if (teamCount >= 2) {
    const end = Math.min(teamCount, 3)
    waves.push(end === 2 ? 'Team 2 after 48 quiet hours' : 'Teams 2-3 after 48 quiet hours')
  }

  if (teamCount >= 4) {
    waves.push(`Teams 4-${teamCount} after rerunning the load gate`)
  }

  return waves
}

function readPlan(env = process.env) {
  const teamCount = parsePositiveInteger(env.HOCKEY_PILOT_TEAM_COUNT, DEFAULTS.teamCount)
  const athletesPerTeam = parsePositiveInteger(env.HOCKEY_PILOT_ATHLETES_PER_TEAM, DEFAULTS.athletesPerTeam)
  const staffPerTeam = parsePositiveInteger(env.HOCKEY_PILOT_STAFF_PER_TEAM, DEFAULTS.staffPerTeam)
  const expectedPeakUsers = parsePositiveInteger(env.HOCKEY_PILOT_EXPECTED_PEAK_USERS, DEFAULTS.expectedPeakUsers)
  const estimatedAthletes = teamCount * athletesPerTeam
  const estimatedStaff = teamCount * staffPerTeam
  const estimatedUsers = estimatedAthletes + estimatedStaff

  return {
    teamCount,
    athletesPerTeam,
    staffPerTeam,
    expectedPeakUsers,
    estimatedAthletes,
    estimatedStaff,
    estimatedUsers,
    waves: Number.isFinite(teamCount) ? buildWavePlan(teamCount) : [],
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
  ]) {
    if (!Number.isFinite(value)) errors.push(`${label} must be a positive whole number.`)
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

  if (plan.teamCount >= 4) {
    warnings.push('Teams 4-6 require a fresh --include-load gate before inviting.')
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
  console.log('Invite waves:')
  for (const [index, wave] of plan.waves.entries()) {
    console.log(`${index + 1}. ${wave}`)
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

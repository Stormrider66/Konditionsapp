#!/usr/bin/env node

const REQUIRED_CHECKS = [
  'Review auth and invite errors in Vercel logs.',
  'Review Supabase auth and database errors.',
  'Check tenant-boundary reports for unexpected 401/403 or cross-team visibility.',
  'Run npm run qa:daily-metrics-backlog after the busiest team check-in window.',
  'Run npm run qa:cron-config and confirm scheduled jobs are not noisy or failing.',
  'Check hockey dashboard, test review, and SIMCA export complaints.',
  'Record support notes, owner, SLA, open critical issues, and next-wave decision.',
]

const DEFAULT_THRESHOLDS = {
  authErrorsPerHour: 3,
  serverErrorsPerHour: 5,
  slowHockeyRequestsPerHour: 5,
  supportCriticalIssues: 0,
}

function hasValue(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function intValue(value, fallback) {
  if (!hasValue(value)) return fallback
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : Number.NaN
}

function readMonitoringPlan(env = process.env) {
  return {
    supportOwner: hasValue(env.HOCKEY_PILOT_SUPPORT_OWNER) ? env.HOCKEY_PILOT_SUPPORT_OWNER.trim() : null,
    supportNotesUrl: hasValue(env.HOCKEY_PILOT_SUPPORT_NOTES_URL) ? env.HOCKEY_PILOT_SUPPORT_NOTES_URL.trim() : null,
    incidentChannel: hasValue(env.HOCKEY_PILOT_INCIDENT_CHANNEL) ? env.HOCKEY_PILOT_INCIDENT_CHANNEL.trim() : null,
    firstCheckMinutes: hasValue(env.HOCKEY_PILOT_FIRST_CHECK_MINUTES) ? Number.parseInt(env.HOCKEY_PILOT_FIRST_CHECK_MINUTES, 10) : 30,
    quietHoursBeforeExpansion: hasValue(env.HOCKEY_PILOT_QUIET_HOURS_BEFORE_EXPANSION) ? Number.parseInt(env.HOCKEY_PILOT_QUIET_HOURS_BEFORE_EXPANSION, 10) : 48,
    thresholds: {
      authErrorsPerHour: intValue(env.HOCKEY_PILOT_MAX_AUTH_ERRORS_PER_HOUR, DEFAULT_THRESHOLDS.authErrorsPerHour),
      serverErrorsPerHour: intValue(env.HOCKEY_PILOT_MAX_SERVER_ERRORS_PER_HOUR, DEFAULT_THRESHOLDS.serverErrorsPerHour),
      slowHockeyRequestsPerHour: intValue(env.HOCKEY_PILOT_MAX_SLOW_HOCKEY_REQUESTS_PER_HOUR, DEFAULT_THRESHOLDS.slowHockeyRequestsPerHour),
      supportCriticalIssues: intValue(env.HOCKEY_PILOT_MAX_SUPPORT_CRITICAL_ISSUES, DEFAULT_THRESHOLDS.supportCriticalIssues),
    },
    requiredChecks: REQUIRED_CHECKS,
  }
}

function validateMonitoringPlan(plan) {
  const errors = []
  const warnings = []

  if (!plan.supportOwner) errors.push('Set HOCKEY_PILOT_SUPPORT_OWNER before post-invite monitoring.')
  if (!plan.supportNotesUrl) errors.push('Set HOCKEY_PILOT_SUPPORT_NOTES_URL before post-invite monitoring.')
  if (!plan.incidentChannel) warnings.push('Set HOCKEY_PILOT_INCIDENT_CHANNEL so urgent pilot issues have one place to land.')
  if (!Number.isFinite(plan.firstCheckMinutes) || plan.firstCheckMinutes < 15) {
    errors.push('HOCKEY_PILOT_FIRST_CHECK_MINUTES must be at least 15.')
  }
  if (!Number.isFinite(plan.quietHoursBeforeExpansion) || plan.quietHoursBeforeExpansion < 48) {
    errors.push('HOCKEY_PILOT_QUIET_HOURS_BEFORE_EXPANSION must be at least 48.')
  }
  for (const [key, value] of Object.entries(plan.thresholds)) {
    if (!Number.isFinite(value) || value < 0) {
      errors.push(`Monitoring threshold ${key} must be a non-negative whole number.`)
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
  }
}

function printMonitoringPlan(plan, validation) {
  console.log('Hockey pilot post-invite monitoring')
  console.log(`Support owner: ${plan.supportOwner ?? '-'}`)
  console.log(`Support notes: ${plan.supportNotesUrl ?? '-'}`)
  console.log(`Incident channel: ${plan.incidentChannel ?? '-'}`)
  console.log(`First check after invite: ${plan.firstCheckMinutes}m`)
  console.log(`Quiet hours before next wave: ${plan.quietHoursBeforeExpansion}h`)
  console.log('Pause thresholds:')
  console.log(`- Auth/invite errors: >${plan.thresholds.authErrorsPerHour}/hour`)
  console.log(`- Server errors: >${plan.thresholds.serverErrorsPerHour}/hour`)
  console.log(`- Slow hockey requests: >${plan.thresholds.slowHockeyRequestsPerHour}/hour`)
  console.log(`- Critical support issues: >${plan.thresholds.supportCriticalIssues}`)
  console.log('First 48-hour checks:')
  for (const [index, check] of plan.requiredChecks.entries()) {
    console.log(`${index + 1}. ${check}`)
  }
  for (const warning of validation.warnings) console.warn(`Warning: ${warning}`)
}

function main() {
  const plan = readMonitoringPlan()
  const validation = validateMonitoringPlan(plan)
  printMonitoringPlan(plan, validation)

  if (validation.ok) {
    console.log('Hockey pilot monitoring plan passed.')
  } else {
    console.error('Hockey pilot monitoring plan failed:')
    for (const error of validation.errors) console.error(`- ${error}`)
    process.exitCode = 1
  }
}

if (require.main === module) {
  main()
}

module.exports = {
  DEFAULT_THRESHOLDS,
  REQUIRED_CHECKS,
  readMonitoringPlan,
  validateMonitoringPlan,
}

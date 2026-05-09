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

function hasValue(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function readMonitoringPlan(env = process.env) {
  return {
    supportOwner: hasValue(env.HOCKEY_PILOT_SUPPORT_OWNER) ? env.HOCKEY_PILOT_SUPPORT_OWNER.trim() : null,
    supportNotesUrl: hasValue(env.HOCKEY_PILOT_SUPPORT_NOTES_URL) ? env.HOCKEY_PILOT_SUPPORT_NOTES_URL.trim() : null,
    incidentChannel: hasValue(env.HOCKEY_PILOT_INCIDENT_CHANNEL) ? env.HOCKEY_PILOT_INCIDENT_CHANNEL.trim() : null,
    firstCheckMinutes: hasValue(env.HOCKEY_PILOT_FIRST_CHECK_MINUTES) ? Number.parseInt(env.HOCKEY_PILOT_FIRST_CHECK_MINUTES, 10) : 30,
    quietHoursBeforeExpansion: hasValue(env.HOCKEY_PILOT_QUIET_HOURS_BEFORE_EXPANSION) ? Number.parseInt(env.HOCKEY_PILOT_QUIET_HOURS_BEFORE_EXPANSION, 10) : 48,
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
  REQUIRED_CHECKS,
  readMonitoringPlan,
  validateMonitoringPlan,
}

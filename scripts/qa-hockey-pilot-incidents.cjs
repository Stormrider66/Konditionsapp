#!/usr/bin/env node

const INCIDENT_PLAYBOOK = [
  {
    trigger: 'Auth or invite failures',
    firstAction: 'Pause new invites, capture affected email/domain, and check Supabase Auth plus Vercel logs.',
    pauseAction: 'Keep EMAILS_PAUSED=true or switch to manual invites until a successful browser evidence rerun.',
  },
  {
    trigger: 'Tenant access or cross-team visibility',
    firstAction: 'Stop invites immediately, record affected users/business slugs, and rerun tenant-boundary checks.',
    pauseAction: 'Do not resume until the issue is fixed, reviewed, and browser evidence passes on the target deployment.',
  },
  {
    trigger: 'Hockey dashboard or export slowdown',
    firstAction: 'Collect the load manifest, analyzer output, endpoint timings, and affected team/export preset.',
    pauseAction: 'Pause the next wave until production-like load evidence passes again.',
  },
  {
    trigger: 'Daily metrics or cron backlog',
    firstAction: 'Run qa:daily-metrics-backlog and qa:cron-config, then inspect failed/stale jobs.',
    pauseAction: 'Pause invites if athletes or coaches see stale readiness/check-in data.',
  },
  {
    trigger: 'Support volume spike',
    firstAction: 'Group support notes by symptom, owner, and affected team before changing invite timing.',
    pauseAction: 'Do not invite the next wave while open critical issues are above zero.',
  },
]

function hasValue(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function readIncidentPlan(env = process.env) {
  return {
    supportOwner: hasValue(env.HOCKEY_PILOT_SUPPORT_OWNER) ? env.HOCKEY_PILOT_SUPPORT_OWNER.trim() : null,
    technicalOwner: hasValue(env.HOCKEY_PILOT_TECHNICAL_OWNER) ? env.HOCKEY_PILOT_TECHNICAL_OWNER.trim() : null,
    rollbackOwner: hasValue(env.HOCKEY_PILOT_ROLLBACK_OWNER) ? env.HOCKEY_PILOT_ROLLBACK_OWNER.trim() : null,
    incidentChannel: hasValue(env.HOCKEY_PILOT_INCIDENT_CHANNEL) ? env.HOCKEY_PILOT_INCIDENT_CHANNEL.trim() : null,
    supportNotesUrl: hasValue(env.HOCKEY_PILOT_SUPPORT_NOTES_URL) ? env.HOCKEY_PILOT_SUPPORT_NOTES_URL.trim() : null,
    openCriticalIssues: hasValue(env.HOCKEY_PILOT_OPEN_CRITICAL_ISSUES) ? Number.parseInt(env.HOCKEY_PILOT_OPEN_CRITICAL_ISSUES, 10) : 0,
    playbook: INCIDENT_PLAYBOOK,
  }
}

function validateIncidentPlan(plan) {
  const errors = []

  if (!plan.supportOwner) errors.push('Set HOCKEY_PILOT_SUPPORT_OWNER before incident response is ready.')
  if (!plan.technicalOwner) errors.push('Set HOCKEY_PILOT_TECHNICAL_OWNER before incident response is ready.')
  if (!plan.rollbackOwner) errors.push('Set HOCKEY_PILOT_ROLLBACK_OWNER before incident response is ready.')
  if (!plan.incidentChannel) errors.push('Set HOCKEY_PILOT_INCIDENT_CHANNEL before incident response is ready.')
  if (!plan.supportNotesUrl) errors.push('Set HOCKEY_PILOT_SUPPORT_NOTES_URL before incident response is ready.')
  if (!Number.isFinite(plan.openCriticalIssues) || plan.openCriticalIssues < 0) {
    errors.push('HOCKEY_PILOT_OPEN_CRITICAL_ISSUES must be a non-negative whole number.')
  } else if (plan.openCriticalIssues > 0) {
    errors.push(`Open critical support issues is ${plan.openCriticalIssues}; pause new invites until it is 0.`)
  }

  return {
    ok: errors.length === 0,
    errors,
  }
}

function printIncidentPlan(plan, validation) {
  console.log('Hockey pilot incident playbook')
  console.log(`Support owner: ${plan.supportOwner ?? '-'}`)
  console.log(`Technical owner: ${plan.technicalOwner ?? '-'}`)
  console.log(`Rollback owner: ${plan.rollbackOwner ?? '-'}`)
  console.log(`Incident channel: ${plan.incidentChannel ?? '-'}`)
  console.log(`Support notes: ${plan.supportNotesUrl ?? '-'}`)
  console.log(`Open critical support issues: ${plan.openCriticalIssues}`)
  console.log('Incident actions:')
  for (const [index, item] of plan.playbook.entries()) {
    console.log(`${index + 1}. ${item.trigger}`)
    console.log(`   First action: ${item.firstAction}`)
    console.log(`   Pause/rollback: ${item.pauseAction}`)
  }

  if (validation.ok) {
    console.log('Hockey pilot incident playbook passed.')
  } else {
    console.error('Hockey pilot incident playbook failed:')
    for (const error of validation.errors) console.error(`- ${error}`)
  }
}

function main() {
  const plan = readIncidentPlan()
  const validation = validateIncidentPlan(plan)
  printIncidentPlan(plan, validation)
  if (!validation.ok) process.exitCode = 1
}

if (require.main === module) {
  main()
}

module.exports = {
  INCIDENT_PLAYBOOK,
  readIncidentPlan,
  validateIncidentPlan,
}

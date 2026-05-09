#!/usr/bin/env node
const { execSync } = require('child_process')

function gitOutput(command) {
  try {
    return execSync(command, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      shell: true,
    }).trim()
  } catch {
    return null
  }
}

function value(env, keys, fallback) {
  for (const key of keys) {
    if (env[key]) return env[key]
  }
  return fallback
}

function shellQuote(valueToQuote) {
  const raw = String(valueToQuote ?? '')
  if (/^[A-Za-z0-9_./:@%+=,-]+$/.test(raw)) return raw
  return `"${raw.replace(/(["\\$`])/g, '\\$1')}"`
}

function envPair(key, rawValue) {
  return `${key}=${shellQuote(rawValue)}`
}

function isPlaceholder(valueToCheck) {
  const normalized = String(valueToCheck || '').trim().toLowerCase()
  return ['...', 'coach@example.com', 'support lead', 'vercel-deployment-commit-sha'].includes(normalized)
}

function commandWarnings(values) {
  const warnings = []
  if (isPlaceholder(values.qaEmail)) warnings.push('Set TRAINOMICS_QA_EMAIL to a real QA coach login.')
  if (isPlaceholder(values.qaPassword)) warnings.push('Set TRAINOMICS_QA_PASSWORD to the real QA coach password.')
  if (isPlaceholder(values.supportOwner)) warnings.push('Set HOCKEY_PILOT_SUPPORT_OWNER to a named person.')
  if (isPlaceholder(values.targetCommit)) warnings.push('Replace HOCKEY_PILOT_TARGET_COMMIT_SHA with the real Vercel deployment commit.')
  return warnings
}

function todayIsoDate(now = new Date()) {
  return now.toISOString().slice(0, 10)
}

function buildCommands(env = process.env) {
  const currentCommit = value(env, ['GIT_COMMIT_SHA'], gitOutput('git rev-parse HEAD') || 'current-git-commit-sha')
  const deploymentUrl = value(env, ['TRAINOMICS_QA_BASE_URL', 'VERCEL_DEPLOYMENT_URL'], 'https://pilot.example.com')
  const targetCommit = value(env, ['HOCKEY_PILOT_TARGET_COMMIT_SHA'], currentCommit)
  const businessSlug = value(env, ['TRAINOMICS_QA_BUSINESS_SLUG', 'E2E_BUSINESS_SLUG'], 'skelleftea-aik')
  const qaEmail = value(env, ['TRAINOMICS_QA_EMAIL', 'E2E_COACH_EMAIL'], 'coach@example.com')
  const qaPassword = value(env, ['TRAINOMICS_QA_PASSWORD', 'E2E_COACH_PASSWORD'], '...')
  const teamCount = value(env, ['HOCKEY_PILOT_TEAM_COUNT'], '6')
  const athletesPerTeam = value(env, ['HOCKEY_PILOT_ATHLETES_PER_TEAM'], '30')
  const staffPerTeam = value(env, ['HOCKEY_PILOT_STAFF_PER_TEAM'], '5')
  const expectedPeakUsers = value(env, ['HOCKEY_PILOT_EXPECTED_PEAK_USERS'], '75')
  const supportOwner = value(env, ['HOCKEY_PILOT_SUPPORT_OWNER'], 'Support Lead')
  const supportSlaHours = value(env, ['HOCKEY_PILOT_SUPPORT_SLA_HOURS'], '24')
  const supportNotesUrl = value(env, ['HOCKEY_PILOT_SUPPORT_NOTES_URL'], '')
  const openCriticalIssues = value(env, ['HOCKEY_PILOT_OPEN_CRITICAL_ISSUES'], '0')
  const inviteMode = value(env, ['HOCKEY_PILOT_INVITE_MODE'], 'manual')
  const emailsPaused = value(env, ['EMAILS_PAUSED'], inviteMode === 'manual' ? 'true' : 'false')
  const manualInviteOwner = value(env, ['HOCKEY_PILOT_MANUAL_INVITE_OWNER'], 'Henrik')
  const summaryExport = value(env, ['K6_SUMMARY_EXPORT'], `load-tests/evidence/hockey-pilot-${todayIsoDate()}.json`)
  const warnings = commandWarnings({
    qaEmail,
    qaPassword,
    supportOwner,
    targetCommit,
  })

  const browserCommand = [
    envPair('TRAINOMICS_QA_BASE_URL', deploymentUrl),
    envPair('TRAINOMICS_QA_EMAIL', qaEmail),
    envPair('TRAINOMICS_QA_PASSWORD', qaPassword),
    envPair('TRAINOMICS_QA_BUSINESS_SLUG', businessSlug),
    envPair('HOCKEY_PILOT_TARGET_COMMIT_SHA', targetCommit),
    'npm run qa:hockey-pilot-gates -- --include-browser',
  ].join(' ')

  const loadCommand = [
    envPair('HOCKEY_PILOT_TEAM_COUNT', teamCount),
    envPair('HOCKEY_PILOT_ATHLETES_PER_TEAM', athletesPerTeam),
    envPair('HOCKEY_PILOT_STAFF_PER_TEAM', staffPerTeam),
    envPair('HOCKEY_PILOT_EXPECTED_PEAK_USERS', expectedPeakUsers),
    envPair('HOCKEY_PILOT_SUPPORT_OWNER', supportOwner),
    envPair('HOCKEY_PILOT_SUPPORT_SLA_HOURS', supportSlaHours),
    ...(supportNotesUrl ? [envPair('HOCKEY_PILOT_SUPPORT_NOTES_URL', supportNotesUrl)] : []),
    envPair('HOCKEY_PILOT_OPEN_CRITICAL_ISSUES', openCriticalIssues),
    envPair('HOCKEY_PILOT_TARGET_COMMIT_SHA', targetCommit),
    envPair('HOCKEY_PILOT_INVITE_MODE', inviteMode),
    envPair('EMAILS_PAUSED', emailsPaused),
    envPair('HOCKEY_PILOT_MANUAL_INVITE_OWNER', manualInviteOwner),
    envPair('K6_SUMMARY_EXPORT', summaryExport),
    'npm run qa:hockey-pilot-gates -- --include-load',
  ].join(' ')

  return {
    currentCommit,
    deploymentUrl,
    targetCommit,
    warnings,
    browserCommand,
    loadCommand,
  }
}

function main(env = process.env) {
  const commands = buildCommands(env)

  console.log('Hockey pilot evidence commands')
  console.log(`Current evidence commit: ${commands.currentCommit}`)
  console.log(`Target deployment URL: ${commands.deploymentUrl}`)
  console.log(`Target deployment commit: ${commands.targetCommit}`)
  if (commands.warnings.length > 0) {
    console.log('')
    console.log('Replace before running:')
    for (const warning of commands.warnings) console.log(`- ${warning}`)
  }
  console.log('')
  console.log('Confirm the deployment commit first:')
  console.log(`vercel inspect ${shellQuote(commands.deploymentUrl)}`)
  console.log('')
  console.log('Browser evidence:')
  console.log(commands.browserCommand)
  console.log('')
  console.log('Load evidence:')
  console.log(commands.loadCommand)
}

if (require.main === module) {
  main()
}

module.exports = {
  buildCommands,
  commandWarnings,
  main,
  shellQuote,
  todayIsoDate,
}

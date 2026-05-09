#!/usr/bin/env node
const { spawnSync } = require('child_process')

function shouldIncludeBrowserQa(argv = process.argv, env = process.env) {
  return argv.includes('--include-browser') || env.HOCKEY_PILOT_GATES_INCLUDE_BROWSER === 'true'
}

function shouldIncludeLoadQa(argv = process.argv, env = process.env) {
  return argv.includes('--include-load') || env.HOCKEY_PILOT_GATES_INCLUDE_LOAD === 'true'
}

function gateModeEnv({ includeBrowserQa = false, includeLoadQa = false } = {}) {
  return [
    'deterministic',
    includeBrowserQa ? 'browser' : null,
    includeLoadQa ? 'load' : null,
  ].filter(Boolean).join(',')
}

function buildChecks({ includeBrowserQa = false, includeLoadQa = false } = {}) {
  const commonEnv = {
    HOCKEY_PILOT_GATE_MODES: gateModeEnv({ includeBrowserQa, includeLoadQa }),
  }
  const checks = [
    {
      label: 'Pilot tooling and local readiness',
      command: 'npm',
      args: ['run', 'qa:hockey-pilot-readiness'],
      env: commonEnv,
    },
    {
      label: 'Launch configuration',
      command: 'npm',
      args: ['run', 'qa:launch-config'],
      env: commonEnv,
    },
    {
      label: 'Pilot invite wave plan',
      command: 'npm',
      args: ['run', 'qa:hockey-pilot-wave-plan'],
      env: commonEnv,
    },
    {
      label: 'Tenant boundary regression checks',
      command: 'npm',
      args: ['run', 'qa:hockey-pilot-tenant-boundary'],
      env: commonEnv,
    },
    {
      label: 'Cron configuration',
      command: 'npm',
      args: ['run', 'qa:cron-config'],
      env: commonEnv,
    },
    {
      label: 'Daily metrics backlog',
      command: 'npm',
      args: ['run', 'qa:daily-metrics-backlog'],
      env: commonEnv,
    },
  ]

  if (includeBrowserQa) {
    checks.splice(
      4,
      0,
      {
        label: 'Hockey browser QA environment',
        command: 'npm',
        args: ['run', 'qa:hockey-browser-env'],
        env: commonEnv,
      },
      {
        label: 'Hockey cockpit browser QA',
        command: 'npm',
        args: ['run', 'qa:hockey'],
        env: commonEnv,
      }
    )
  }

  if (includeLoadQa) {
    checks.push(
      {
        label: 'Hockey pilot load run',
        command: 'npm',
        args: ['run', 'load:k6:hockey-pilot'],
        env: commonEnv,
      },
      {
        label: 'Daily metrics backlog after load',
        command: 'npm',
        args: ['run', 'qa:daily-metrics-backlog'],
        env: commonEnv,
      }
    )
  }

  return checks
}

function formatCommand(check) {
  return [check.command, ...(check.args || [])].join(' ')
}

function nextStepMessages({ includeBrowserQa = false, includeLoadQa = false } = {}) {
  const messages = []
  if (!includeBrowserQa) {
    messages.push('Browser cockpit QA was skipped. Run with a production-like target: TRAINOMICS_QA_BASE_URL="https://pilot.example.com" npm run qa:hockey-pilot-gates -- --include-browser')
  }
  if (!includeLoadQa) {
    messages.push('Pilot load run was skipped. Run with evidence export: HOCKEY_PILOT_SUPPORT_OWNER="Support Lead" HOCKEY_PILOT_SUPPORT_SLA_HOURS=24 HOCKEY_PILOT_OPEN_CRITICAL_ISSUES=0 K6_SUMMARY_EXPORT=load-tests/evidence/hockey-pilot-YYYY-MM-DD.json npm run qa:hockey-pilot-gates -- --include-load')
  }
  return messages
}

function runCheck(check) {
  console.log(`\n== ${check.label} ==\n`)
  const result = spawnSync(check.command, check.args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, ...(check.env || {}) },
  })

  if (result.status !== 0) {
    console.error(`\n${check.label} failed.`)
    return result.status || 1
  }

  return 0
}

function runChecks(checks, run = runCheck) {
  for (const check of checks) {
    const status = run(check)
    if (status !== 0) {
      return {
        ok: false,
        status,
        failedCheck: check,
      }
    }
  }

  return {
    ok: true,
    status: 0,
  }
}

function main() {
  const includeBrowserQa = shouldIncludeBrowserQa()
  const includeLoadQa = shouldIncludeLoadQa()
  const checks = buildChecks({ includeBrowserQa, includeLoadQa })
  const result = runChecks(checks)
  if (!result.ok) {
    console.error('\nHockey pilot gate checks failed.')
    console.error(`Failed check: ${result.failedCheck.label}`)
    console.error(`Command: ${formatCommand(result.failedCheck)}`)
    console.error(`Gate modes: ${result.failedCheck.env?.HOCKEY_PILOT_GATE_MODES || 'deterministic'}`)
    process.exitCode = result.status
    return
  }

  console.log('\nHockey pilot gate checks passed.')
  for (const message of nextStepMessages({ includeBrowserQa, includeLoadQa })) console.log(message)
}

if (require.main === module) {
  main()
}

module.exports = {
  buildChecks,
  formatCommand,
  gateModeEnv,
  nextStepMessages,
  runChecks,
  shouldIncludeBrowserQa,
  shouldIncludeLoadQa,
}

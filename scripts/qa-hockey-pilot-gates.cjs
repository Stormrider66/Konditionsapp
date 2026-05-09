#!/usr/bin/env node
const { spawnSync } = require('child_process')

function shouldIncludeBrowserQa(argv = process.argv, env = process.env) {
  return argv.includes('--include-browser') || env.HOCKEY_PILOT_GATES_INCLUDE_BROWSER === 'true'
}

function buildChecks({ includeBrowserQa = false } = {}) {
  const checks = [
    {
      label: 'Pilot tooling and local readiness',
      command: 'npm',
      args: ['run', 'qa:hockey-pilot-readiness'],
    },
    {
      label: 'Launch configuration',
      command: 'npm',
      args: ['run', 'qa:launch-config'],
    },
    {
      label: 'Cron configuration',
      command: 'npm',
      args: ['run', 'qa:cron-config'],
    },
    {
      label: 'Daily metrics backlog',
      command: 'npm',
      args: ['run', 'qa:daily-metrics-backlog'],
    },
  ]

  if (includeBrowserQa) {
    checks.splice(2, 0, {
      label: 'Hockey cockpit browser QA',
      command: 'npm',
      args: ['run', 'qa:hockey'],
    })
  }

  return checks
}

function runCheck(check) {
  console.log(`\n== ${check.label} ==\n`)
  const result = spawnSync(check.command, check.args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  })

  if (result.status !== 0) {
    console.error(`\n${check.label} failed.`)
    return result.status || 1
  }

  return 0
}

function runChecks(checks) {
  for (const check of checks) {
    const status = runCheck(check)
    if (status !== 0) return status
  }
  return 0
}

function main() {
  const includeBrowserQa = shouldIncludeBrowserQa()
  const checks = buildChecks({ includeBrowserQa })
  const status = runChecks(checks)
  if (status !== 0) {
    process.exitCode = status
    return
  }

  console.log('\nHockey pilot gate checks passed.')
  if (!includeBrowserQa) {
    console.log('Browser cockpit QA was skipped. Add --include-browser when a target app and QA credentials are ready.')
  }
}

if (require.main === module) {
  main()
}

module.exports = {
  buildChecks,
  shouldIncludeBrowserQa,
}

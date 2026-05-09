#!/usr/bin/env node
const fs = require('fs')
const path = require('path')

const REQUIRED_CRONS = [
  { path: '/api/cron/process-daily-metrics', schedule: '* * * * *' },
  { path: '/api/cron/link-workouts', schedule: '*/15 * * * *' },
  { path: '/api/cron/calculate-acwr', schedule: '0 3 * * *' },
  { path: '/api/cron/expire-trials', schedule: '0 2 * * *' },
  { path: '/api/cron/trial-warnings', schedule: '0 9 * * *' },
  { path: '/api/cron/reset-ai-usage', schedule: '5 0 1 * *' },
  { path: '/api/cron/reset-budgets', schedule: '0 0 1 * *' },
]

function loadVercelConfig(configPath = path.join(process.cwd(), 'vercel.json')) {
  return JSON.parse(fs.readFileSync(configPath, 'utf8'))
}

function cronPathToRouteFile(cronPath) {
  return path.join(process.cwd(), 'app', `${cronPath.replace(/^\/api\//, 'api/')}`, 'route.ts')
}

function evaluateCronConfig(config, options = {}) {
  const routeExists = options.routeExists || ((cronPath) => fs.existsSync(cronPathToRouteFile(cronPath)))
  const crons = Array.isArray(config.crons) ? config.crons : []
  const cronByPath = new Map(crons.map((cron) => [cron.path, cron]))
  const errors = []
  const warnings = []
  const seen = new Set()

  for (const cron of crons) {
    if (!cron.path || !cron.schedule) {
      errors.push(`Invalid cron entry: ${JSON.stringify(cron)}`)
      continue
    }
    if (seen.has(cron.path)) {
      errors.push(`Duplicate cron path: ${cron.path}`)
    }
    seen.add(cron.path)
    if (!routeExists(cron.path)) {
      errors.push(`Cron route file is missing for ${cron.path}`)
    }
  }

  for (const required of REQUIRED_CRONS) {
    const cron = cronByPath.get(required.path)
    if (!cron) {
      errors.push(`Required cron is missing: ${required.path}`)
      continue
    }
    if (cron.schedule !== required.schedule) {
      errors.push(
        `Required cron ${required.path} has schedule "${cron.schedule}", expected "${required.schedule}"`
      )
    }
  }

  if (crons.length > 0 && crons.length > 30) {
    warnings.push(`Configured cron count is high (${crons.length}); watch Vercel plan limits and noisy jobs.`)
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    cronCount: crons.length,
  }
}

function printReport(result) {
  console.log('Cron config check')
  console.log(`Configured crons: ${result.cronCount}`)
  for (const warning of result.warnings) console.warn(`Warning: ${warning}`)
  if (result.ok) {
    console.log('Cron config check passed.')
  } else {
    console.error('Cron config check failed:')
    for (const error of result.errors) console.error(`- ${error}`)
  }
}

function main() {
  const config = loadVercelConfig()
  const result = evaluateCronConfig(config)
  printReport(result)
  if (!result.ok) process.exitCode = 1
}

if (require.main === module) {
  try {
    main()
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  }
}

module.exports = {
  REQUIRED_CRONS,
  cronPathToRouteFile,
  evaluateCronConfig,
}

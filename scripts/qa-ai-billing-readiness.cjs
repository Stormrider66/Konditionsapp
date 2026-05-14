#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const { evaluateCronConfig } = require('./qa-cron-config.cjs')

const REQUIRED_SCHEMA_MARKERS = [
  { file: 'prisma/schema/ai.prisma', marker: 'model AIAllowanceAccount' },
  { file: 'prisma/schema/ai.prisma', marker: 'model AITopUpPurchase' },
  { file: 'prisma/schema/ai.prisma', marker: 'clientId String?' },
  { file: 'prisma/schema/billing.prisma', marker: 'customAiAllowanceSek Float?' },
  { file: 'prisma/schema/core.prisma', marker: 'eliteAiAllowanceSek Float?' },
]

const REQUIRED_MIGRATIONS = [
  'prisma/migrations/20260513_ai_allowance_accounts/migration.sql',
  'prisma/migrations/20260513_ai_billing_reconciliation/migration.sql',
  'prisma/migrations/20260514_elite_ai_allowance/migration.sql',
  'prisma/migrations/20260514_ai_billing_rls/migration.sql',
]

const REQUIRED_GUARD_TESTS = [
  'app/api/ai/food-scan/route.test.ts',
  'app/api/ai/wod/route.test.ts',
  'app/api/athlete/live-voice-coaching/init/route.test.ts',
  'app/api/video-analysis/[id]/analyze/route.test.ts',
]

const REQUIRED_NON_STRIPE_ENV = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'DATABASE_URL',
  'CRON_SECRET',
]

function fileContains(rootDir, relativePath, marker) {
  const fullPath = path.join(rootDir, relativePath)
  if (!fs.existsSync(fullPath)) return false
  return fs.readFileSync(fullPath, 'utf8').includes(marker)
}

function checkAiBillingReadiness({
  rootDir = process.cwd(),
  env = process.env,
  vercelConfig,
  fileExists = (relativePath) => fs.existsSync(path.join(rootDir, relativePath)),
  markerExists = (relativePath, marker) => fileContains(rootDir, relativePath, marker),
} = {}) {
  const errors = []
  const warnings = []
  const notes = []

  for (const item of REQUIRED_SCHEMA_MARKERS) {
    if (!markerExists(item.file, item.marker)) {
      errors.push(`Missing schema marker "${item.marker}" in ${item.file}`)
    }
  }

  for (const migration of REQUIRED_MIGRATIONS) {
    if (!fileExists(migration)) {
      errors.push(`Missing AI billing migration: ${migration}`)
    }
  }

  for (const guardTest of REQUIRED_GUARD_TESTS) {
    if (!fileExists(guardTest)) {
      errors.push(`Missing high-cost AI allowance guard test: ${guardTest}`)
    }
  }

  const config = vercelConfig ?? JSON.parse(fs.readFileSync(path.join(rootDir, 'vercel.json'), 'utf8'))
  const cronResult = evaluateCronConfig(config, {
    routeExists: (cronPath) => fileExists(path.join('app', `${cronPath.replace(/^\/api\//, 'api/')}`, 'route.ts')),
  })
  errors.push(...cronResult.errors)
  warnings.push(...cronResult.warnings)

  for (const key of REQUIRED_NON_STRIPE_ENV) {
    if (!env[key]) warnings.push(`${key} is not set in this environment; verify it exists in preview/production before launch.`)
  }

  if (!env.STRIPE_SECRET_KEY) {
    notes.push('Stripe is not enabled. Athlete subscription and top-up payment APIs should return BILLING_DISABLED, while AI credit caps still run.')
  } else {
    const requiredStripeEnv = [
      'STRIPE_WEBHOOK_SECRET',
      'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
      'STRIPE_ATHLETE_STANDARD_MONTHLY',
      'STRIPE_ATHLETE_STANDARD_YEARLY',
      'STRIPE_ATHLETE_PRO_MONTHLY',
      'STRIPE_ATHLETE_PRO_YEARLY',
    ]
    for (const key of requiredStripeEnv) {
      if (!env[key]) errors.push(`${key} is required when STRIPE_SECRET_KEY is set.`)
    }
  }

  if (env.EMAILS_PAUSED !== 'true') {
    warnings.push('EMAILS_PAUSED is not true. Keep outbound email paused until launch emails are intentionally enabled.')
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    notes,
    cronCount: cronResult.cronCount,
    stripeEnabled: Boolean(env.STRIPE_SECRET_KEY),
  }
}

function printReport(result) {
  console.log('AI billing readiness check')
  console.log(`Stripe enabled: ${result.stripeEnabled ? 'yes' : 'no'}`)
  console.log(`Configured crons: ${result.cronCount}`)
  for (const note of result.notes) console.log(`Note: ${note}`)
  for (const warning of result.warnings) console.warn(`Warning: ${warning}`)
  if (result.ok) {
    console.log('AI billing readiness check passed.')
  } else {
    console.error('AI billing readiness check failed:')
    for (const error of result.errors) console.error(`- ${error}`)
  }
}

function main() {
  const result = checkAiBillingReadiness()
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
  REQUIRED_GUARD_TESTS,
  REQUIRED_MIGRATIONS,
  REQUIRED_NON_STRIPE_ENV,
  REQUIRED_SCHEMA_MARKERS,
  checkAiBillingReadiness,
}

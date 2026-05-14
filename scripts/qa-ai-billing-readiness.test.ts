import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const testDir = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
const {
  REQUIRED_MIGRATIONS,
  REQUIRED_SCHEMA_MARKERS,
  checkAiBillingReadiness,
} = require(path.join(testDir, 'qa-ai-billing-readiness.cjs'))

const requiredCrons = [
  { path: '/api/cron/process-daily-metrics', schedule: '* * * * *' },
  { path: '/api/cron/link-workouts', schedule: '*/15 * * * *' },
  { path: '/api/cron/calculate-acwr', schedule: '0 3 * * *' },
  { path: '/api/cron/expire-trials', schedule: '0 2 * * *' },
  { path: '/api/cron/trial-warnings', schedule: '0 9 * * *' },
  { path: '/api/cron/reset-ai-usage', schedule: '5 0 1 * *' },
  { path: '/api/cron/reset-budgets', schedule: '0 0 1 * *' },
]

const baseEnv = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://supabase.example.test',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon',
  SUPABASE_SERVICE_ROLE_KEY: 'service',
  DATABASE_URL: 'postgres://example',
  CRON_SECRET: 'secret',
  EMAILS_PAUSED: 'true',
}

function passingOptions(overrides: Partial<Parameters<typeof checkAiBillingReadiness>[0]> = {}) {
  return {
    env: baseEnv,
    vercelConfig: { crons: requiredCrons },
    fileExists: (relativePath: string) => (
      REQUIRED_MIGRATIONS.includes(relativePath) ||
      requiredCrons.some((cron) => relativePath === `app/${cron.path.replace(/^\/api\//, 'api/')}/route.ts`)
    ),
    markerExists: (relativePath: string, marker: string) => (
      REQUIRED_SCHEMA_MARKERS.some((item: { file: string; marker: string }) => (
        item.file === relativePath && item.marker === marker
      ))
    ),
    ...overrides,
  }
}

describe('qa-ai-billing-readiness', () => {
  it('passes when AI billing schema, migrations, crons, and non-Stripe env are present', () => {
    const result = checkAiBillingReadiness(passingOptions())

    expect(result.ok).toBe(true)
    expect(result.errors).toEqual([])
    expect(result.stripeEnabled).toBe(false)
    expect(result.notes).toEqual([
      'Stripe is not enabled. Athlete subscription and top-up payment APIs should return BILLING_DISABLED, while AI credit caps still run.',
    ])
  })

  it('requires Stripe details only when Stripe is enabled', () => {
    const result = checkAiBillingReadiness(passingOptions({
      env: {
        ...baseEnv,
        STRIPE_SECRET_KEY: 'sk_test_mock',
      },
    }))

    expect(result.ok).toBe(false)
    expect(result.errors).toEqual([
      'STRIPE_WEBHOOK_SECRET is required when STRIPE_SECRET_KEY is set.',
      'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is required when STRIPE_SECRET_KEY is set.',
      'STRIPE_ATHLETE_STANDARD_MONTHLY is required when STRIPE_SECRET_KEY is set.',
      'STRIPE_ATHLETE_STANDARD_YEARLY is required when STRIPE_SECRET_KEY is set.',
      'STRIPE_ATHLETE_PRO_MONTHLY is required when STRIPE_SECRET_KEY is set.',
      'STRIPE_ATHLETE_PRO_YEARLY is required when STRIPE_SECRET_KEY is set.',
    ])
  })

  it('fails when an AI billing migration or required cron is missing', () => {
    const result = checkAiBillingReadiness(passingOptions({
      vercelConfig: { crons: requiredCrons.slice(0, -1) },
      fileExists: (relativePath: string) => (
        relativePath !== 'prisma/migrations/20260514_ai_billing_rls/migration.sql' &&
        (
          REQUIRED_MIGRATIONS.includes(relativePath) ||
          requiredCrons.some((cron) => relativePath === `app/${cron.path.replace(/^\/api\//, 'api/')}/route.ts`)
        )
      ),
    }))

    expect(result.ok).toBe(false)
    expect(result.errors).toContain('Missing AI billing migration: prisma/migrations/20260514_ai_billing_rls/migration.sql')
    expect(result.errors).toContain('Required cron is missing: /api/cron/reset-budgets')
  })
})

/**
 * Environment variable validation
 *
 * Validates that all required environment variables are set.
 * Import this module early (e.g. in instrumentation.ts) to fail fast on missing config.
 */

interface EnvVar {
  name: string
  required: boolean
  /** If true, only required in production */
  productionOnly?: boolean
}

const ENV_VARS: EnvVar[] = [
  // Core - always required
  { name: 'NEXT_PUBLIC_SUPABASE_URL', required: true },
  { name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', required: true },
  { name: 'SUPABASE_SERVICE_ROLE_KEY', required: true },
  { name: 'DATABASE_URL', required: true },

  // Payments - optional until Stripe is configured
  { name: 'STRIPE_SECRET_KEY', required: false },
  { name: 'STRIPE_WEBHOOK_SECRET', required: false },
  { name: 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', required: false },

  // App URL - required in production for redirects
  { name: 'NEXT_PUBLIC_APP_URL', required: true, productionOnly: true },
]

export interface EnvValidationResult {
  valid: boolean
  missing: string[]
  warnings: string[]
}

export function validateEnv(): EnvValidationResult {
  const isProduction = process.env.NODE_ENV === 'production'
  const missing: string[] = []
  const warnings: string[] = []

  for (const v of ENV_VARS) {
    if (!v.required) continue

    const value = process.env[v.name]
    const isSet = value !== undefined && value !== ''

    if (v.productionOnly && !isProduction) {
      if (!isSet) {
        warnings.push(`${v.name} is not set (required in production)`)
      }
      continue
    }

    if (!isSet) {
      missing.push(v.name)
    }
  }

  return {
    valid: missing.length === 0,
    missing,
    warnings,
  }
}

/**
 * Validate environment variables and log results.
 * Throws in production if required vars are missing.
 * Logs warnings in development.
 */
export function assertEnv(): void {
  const { valid, missing, warnings } = validateEnv()
  const isProduction = process.env.NODE_ENV === 'production'

  if (warnings.length > 0) {
    console.warn(
      `[env] Warnings:\n${warnings.map((w) => `  - ${w}`).join('\n')}`
    )
  }

  if (!valid) {
    const message = `Missing required environment variables:\n${missing.map((m) => `  - ${m}`).join('\n')}`

    if (isProduction) {
      throw new Error(message)
    }

    console.error(`[env] ${message}`)
  }
}

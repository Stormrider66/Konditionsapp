import fs from 'node:fs'
import path from 'node:path'

const dotenvLocalPath = path.join(process.cwd(), '.env.local')

export function normalizeEnvValue(rawValue: string) {
  let value = rawValue.trim()

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1)
  }

  const inlineCommentIndex = value.search(/\s#/)
  if (inlineCommentIndex !== -1) {
    value = value.slice(0, inlineCommentIndex).trim()
  }

  return value
}

function loadLocalEnv() {
  if (!fs.existsSync(dotenvLocalPath)) return

  const contents = fs.readFileSync(dotenvLocalPath, 'utf8')
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const separatorIndex = line.indexOf('=')
    if (separatorIndex === -1) continue
    const key = line.slice(0, separatorIndex).trim()
    const value = normalizeEnvValue(line.slice(separatorIndex + 1))
    if (!process.env[key]) process.env[key] = value
  }
}

export function isHttpsProductionUrl(value: string | undefined) {
  if (!value) return false
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && !['localhost', '127.0.0.1', '::1'].includes(url.hostname)
  } catch {
    return false
  }
}

export function checkLaunchConfig(env: Record<string, string | undefined>) {
  const errors: string[] = []
  const warnings: string[] = []
  const inviteMode = env.HOCKEY_PILOT_INVITE_MODE
  const emailsPaused = env.EMAILS_PAUSED === 'true'

  if (inviteMode !== 'live' && inviteMode !== 'manual') {
    errors.push('Set HOCKEY_PILOT_INVITE_MODE to "live" or "manual" before pilot onboarding.')
  }

  if (inviteMode === 'live') {
    if (emailsPaused) errors.push('EMAILS_PAUSED must not be true when HOCKEY_PILOT_INVITE_MODE=live.')
    if (!env.RESEND_API_KEY) errors.push('RESEND_API_KEY is required for live invite email.')
    if (!env.NEXT_PUBLIC_SUPABASE_URL) errors.push('NEXT_PUBLIC_SUPABASE_URL is required for invite auth links.')
    if (!env.SUPABASE_SERVICE_ROLE_KEY) errors.push('SUPABASE_SERVICE_ROLE_KEY is required to generate invite auth links.')
    if (!isHttpsProductionUrl(env.NEXT_PUBLIC_APP_URL)) {
      errors.push('NEXT_PUBLIC_APP_URL must be a production https URL for live invite links.')
    }
  }

  if (inviteMode === 'manual') {
    if (!emailsPaused) {
      errors.push('EMAILS_PAUSED must be true when HOCKEY_PILOT_INVITE_MODE=manual.')
    }
    if (!env.HOCKEY_PILOT_MANUAL_INVITE_OWNER) {
      errors.push('HOCKEY_PILOT_MANUAL_INVITE_OWNER is required for manual invite follow-up.')
    }
  }

  if (env.USE_JWT_CLAIMS !== 'true') {
    warnings.push('USE_JWT_CLAIMS is not true; middleware may use slower DB lookup fallback during pilot traffic.')
  }

  return {
    errors,
    warnings,
    inviteMode,
  }
}

function main() {
  loadLocalEnv()

  const { errors, warnings, inviteMode } = checkLaunchConfig(process.env)

  if (errors.length > 0) {
    console.error('Hockey pilot launch config failed:')
    for (const error of errors) console.error(`- ${error}`)
    for (const warning of warnings) console.warn(`Warning: ${warning}`)
    process.exitCode = 1
    return
  }

  console.log(`Hockey pilot launch config passed (${inviteMode} invite mode).`)
  for (const warning of warnings) console.warn(`Warning: ${warning}`)
}

if (process.env.NODE_ENV !== 'test') {
  main()
}

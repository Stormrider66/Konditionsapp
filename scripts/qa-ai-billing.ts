import fs from 'node:fs'
import path from 'node:path'
import { chromium, expect, type Page } from '@playwright/test'

const dotenvLocalPath = path.join(process.cwd(), '.env.local')
const evidenceDir = path.join(process.cwd(), 'test-results', 'ai-billing-qa')

type LoginTarget = {
  email: string
  password: string
}

function normalizeEnvValue(rawValue: string) {
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

function readLogin(prefix: string, fallbackPrefix?: string): LoginTarget | null {
  const email = process.env[`${prefix}_EMAIL`] ?? (fallbackPrefix ? process.env[`${fallbackPrefix}_EMAIL`] : undefined)
  const password = process.env[`${prefix}_PASSWORD`] ?? (fallbackPrefix ? process.env[`${fallbackPrefix}_PASSWORD`] : undefined)

  if (!email || !password) return null
  return { email, password }
}

function expectsExhaustedAthlete(env = process.env): boolean {
  return env.TRAINOMICS_QA_EXPECT_EXHAUSTED === 'true' || env.E2E_EXPECT_AI_EXHAUSTED === 'true'
}

async function login(page: Page, baseUrl: string, target: LoginTarget) {
  await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded', timeout: 120_000 })
  await expect(page.locator('input[name="email"]')).toBeVisible({ timeout: 60_000 })
  await page.fill('input[name="email"]', target.email)
  await page.fill('input[name="password"]', target.password)
  await page.getByRole('button', { name: /logga in|log in/i }).click()
  await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {})
}

async function assertNoCustomerFacingAiBudgetFootguns(page: Page) {
  const body = await page.locator('body').innerText({ timeout: 30_000 })
  expect(body).not.toMatch(/unlimited AI|obegränsad AI|obegränsat AI/i)
  expect(body).not.toMatch(/token-budget|token budget|tokens är/i)
}

async function qaAthleteSubscription(
  page: Page,
  baseUrl: string,
  target: LoginTarget,
  options: { expectExhausted?: boolean } = {},
) {
  await login(page, baseUrl, target)
  await page.goto(`${baseUrl}/athlete/subscription`, { waitUntil: 'domcontentloaded', timeout: 120_000 })
  await expect(page.getByText(/AI-krediter/i)).toBeVisible({ timeout: 60_000 })
  await expect(page.getByText(/Så fungerar AI-krediter/i)).toBeVisible({ timeout: 60_000 })
  await expect(page.getByText(/Elite/i)).toBeVisible({ timeout: 60_000 })
  await expect(page.getByText(/coach\/PT|Custom AI-krediter/i)).toBeVisible({ timeout: 60_000 })
  await expect(page.getByText(/199/)).toBeVisible({ timeout: 60_000 })
  await expect(page.getByText(/399/)).toBeVisible({ timeout: 60_000 })
  await expect(page.getByText(/SEK krediter/i).first()).toBeVisible({ timeout: 60_000 })
  if (await page.getByText(/Betalning är inte aktiverad ännu/i).count()) {
    await expect(page.getByRole('button', { name: /Kommer snart|Snart/i }).first()).toBeVisible({ timeout: 60_000 })
  }
  if (options.expectExhausted) {
    await expect(page.getByText(/Slut på AI-krediter/i)).toBeVisible({ timeout: 60_000 })
    await expect(page.getByText(/AI-krediterna är slut för perioden/i)).toBeVisible({ timeout: 60_000 })
    await expect(page.getByText(/0 kr kvar/i).first()).toBeVisible({ timeout: 60_000 })
  }
  await assertNoCustomerFacingAiBudgetFootguns(page)
  await page.screenshot({ path: path.join(evidenceDir, 'athlete-subscription.png'), fullPage: true })
}

async function qaAdminAiCosts(page: Page, baseUrl: string, target: LoginTarget) {
  await login(page, baseUrl, target)
  await page.goto(`${baseUrl}/admin`, { waitUntil: 'domcontentloaded', timeout: 120_000 })
  await expect(page.getByRole('button', { name: /AI Costs/i })).toBeVisible({ timeout: 60_000 })
  await page.getByRole('button', { name: /AI Costs/i }).click()
  await expect(page.getByText(/Feature Mix/i)).toBeVisible({ timeout: 60_000 })
  await expect(page.getByText(/Food scanner/i)).toBeVisible({ timeout: 60_000 })
  await expect(page.getByText(/Top-Up Revenue/i)).toBeVisible({ timeout: 60_000 })
  await expect(page.getByText(/Provider Invoice Reconciliation/i)).toBeVisible({ timeout: 60_000 })
  await expect(page.getByText(/Google invoice/i)).toBeVisible({ timeout: 60_000 })
  await expect(page.getByText(/Margin Risk Users/i)).toBeVisible({ timeout: 60_000 })
  await expect(page.getByText(/Action/i).first()).toBeVisible({ timeout: 60_000 })
  await assertNoCustomerFacingAiBudgetFootguns(page)
  await page.screenshot({ path: path.join(evidenceDir, 'admin-ai-costs.png'), fullPage: true })
}

async function qaAdminAllowanceOverrides(page: Page, baseUrl: string, target: LoginTarget) {
  await login(page, baseUrl, target)
  await page.goto(`${baseUrl}/admin`, { waitUntil: 'domcontentloaded', timeout: 120_000 })
  await expect(page.getByRole('button', { name: /users|användare/i })).toBeVisible({ timeout: 60_000 })
  await page.getByRole('button', { name: /users|användare/i }).click()
  await expect(page.getByText(/AI SEK/i)).toBeVisible({ timeout: 60_000 })
  const overrideInputs = page.getByTitle(/Tomt värde använder planens eller företagets standard/i)
  if (await overrideInputs.count()) {
    await expect(overrideInputs.first()).toBeVisible({ timeout: 60_000 })
  }
  await page.screenshot({ path: path.join(evidenceDir, 'admin-ai-allowance-overrides.png'), fullPage: true })
}

async function qaBusinessEliteSettings(page: Page, baseUrl: string, businessSlug: string, target: LoginTarget) {
  await login(page, baseUrl, target)
  await page.goto(`${baseUrl}/${businessSlug}/coach/admin`, { waitUntil: 'domcontentloaded', timeout: 120_000 })
  await expect(page.getByRole('tab', { name: /Settings/i })).toBeVisible({ timeout: 60_000 })
  await page.getByRole('tab', { name: /Settings/i }).click()
  await expect(page.getByText(/Elite Pricing/i)).toBeVisible({ timeout: 60_000 })
  await expect(page.getByLabel(/Included AI credits \/ month/i)).toBeVisible({ timeout: 60_000 })
  await page.screenshot({ path: path.join(evidenceDir, 'business-elite-ai-allowance.png'), fullPage: true })
}

async function main() {
  loadLocalEnv()
  fs.mkdirSync(evidenceDir, { recursive: true })

  const baseUrl = process.env.TRAINOMICS_QA_BASE_URL ?? process.env.E2E_BASE_URL ?? 'http://localhost:3000'
  const athleteLogin = readLogin('TRAINOMICS_QA_ATHLETE', 'E2E_ATHLETE')
  const adminLogin = readLogin('TRAINOMICS_QA_ADMIN', 'E2E_ADMIN')
  const businessAdminLogin = readLogin('TRAINOMICS_QA_BUSINESS_ADMIN', 'E2E_BUSINESS_ADMIN')
  const businessSlug = process.env.TRAINOMICS_QA_BUSINESS_SLUG ?? process.env.E2E_BUSINESS_SLUG
  const expectExhausted = expectsExhaustedAthlete()

  if (!athleteLogin && !adminLogin && !businessAdminLogin) {
    throw new Error(
      [
        'Set at least one browser QA login:',
        '- TRAINOMICS_QA_ATHLETE_EMAIL and TRAINOMICS_QA_ATHLETE_PASSWORD',
        '- TRAINOMICS_QA_ADMIN_EMAIL and TRAINOMICS_QA_ADMIN_PASSWORD',
        '- TRAINOMICS_QA_BUSINESS_ADMIN_EMAIL, TRAINOMICS_QA_BUSINESS_ADMIN_PASSWORD, and TRAINOMICS_QA_BUSINESS_SLUG',
        `Base URL defaults to ${baseUrl}; override with TRAINOMICS_QA_BASE_URL if needed.`,
      ].join('\n'),
    )
  }

  const browser = await chromium.launch({ headless: true })
  const findings: string[] = []

  try {
    if (athleteLogin) {
      const page = await browser.newPage()
      page.on('console', (message) => {
        if (message.type() === 'error') findings.push(`athlete console: ${message.text()}`)
      })
      page.on('pageerror', (error) => findings.push(`athlete pageerror: ${error.message}`))
      await qaAthleteSubscription(page, baseUrl, athleteLogin, { expectExhausted })
      await page.close()
    }

    if (adminLogin) {
      const page = await browser.newPage()
      page.on('console', (message) => {
        if (message.type() === 'error') findings.push(`admin console: ${message.text()}`)
      })
      page.on('pageerror', (error) => findings.push(`admin pageerror: ${error.message}`))
      await qaAdminAiCosts(page, baseUrl, adminLogin)
      await qaAdminAllowanceOverrides(page, baseUrl, adminLogin)
      await page.close()
    }

    if (businessAdminLogin) {
      if (!businessSlug) {
        throw new Error('Set TRAINOMICS_QA_BUSINESS_SLUG when using TRAINOMICS_QA_BUSINESS_ADMIN_EMAIL/PASSWORD.')
      }

      const page = await browser.newPage()
      page.on('console', (message) => {
        if (message.type() === 'error') findings.push(`business admin console: ${message.text()}`)
      })
      page.on('pageerror', (error) => findings.push(`business admin pageerror: ${error.message}`))
      await qaBusinessEliteSettings(page, baseUrl, businessSlug, businessAdminLogin)
      await page.close()
    }

    if (findings.length > 0) {
      throw new Error(`Browser QA completed with console/page errors:\n${findings.join('\n')}`)
    }

    console.log(`AI billing browser QA passed. Evidence: ${evidenceDir}`)
  } finally {
    await browser.close()
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})

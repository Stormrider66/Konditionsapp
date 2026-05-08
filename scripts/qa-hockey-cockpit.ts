import fs from 'node:fs'
import path from 'node:path'
import { chromium, expect } from '@playwright/test'

const dotenvLocalPath = path.join(process.cwd(), '.env.local')

function loadLocalEnv() {
  if (!fs.existsSync(dotenvLocalPath)) return

  const contents = fs.readFileSync(dotenvLocalPath, 'utf8')
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const separatorIndex = line.indexOf('=')
    if (separatorIndex === -1) continue
    const key = line.slice(0, separatorIndex).trim()
    const value = line.slice(separatorIndex + 1).trim().replace(/^"(.*)"$/, '$1')
    if (!process.env[key]) process.env[key] = value
  }
}

async function main() {
  loadLocalEnv()

  const baseUrl = process.env.TRAINOMICS_QA_BASE_URL ?? process.env.E2E_BASE_URL ?? 'http://localhost:3000'
  const businessSlug = process.env.TRAINOMICS_QA_BUSINESS_SLUG ?? process.env.E2E_BUSINESS_SLUG ?? 'skelleftea-aik'
  const email = process.env.TRAINOMICS_QA_EMAIL ?? process.env.E2E_COACH_EMAIL
  const password = process.env.TRAINOMICS_QA_PASSWORD ?? process.env.E2E_COACH_PASSWORD

  if (!email || !password) {
    throw new Error('Set TRAINOMICS_QA_EMAIL and TRAINOMICS_QA_PASSWORD, or E2E_COACH_EMAIL and E2E_COACH_PASSWORD.')
  }

  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  const findings: string[] = []

  try {
    page.on('console', (message) => {
      if (message.type() === 'error') findings.push(`console: ${message.text()}`)
    })
    page.on('pageerror', (error) => findings.push(`pageerror: ${error.message}`))

    await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded', timeout: 120_000 })
    await expect(page.locator('input[name="email"]')).toBeVisible({ timeout: 120_000 })
    await page.fill('input[name="email"]', email)
    await page.fill('input[name="password"]', password)
    await page.getByRole('button', { name: /logga in|log in/i }).click()
    await page.waitForLoadState('networkidle', { timeout: 120_000 }).catch(() => {})
    await page.evaluate(async () => {
      await fetch('/api/coach/role-preview', { method: 'DELETE', credentials: 'include' }).catch(() => null)
    })

    const hockeyTestsPath = `/${businessSlug}/coach/hockey-tests`
    await page.goto(`${baseUrl}${hockeyTestsPath}`, { waitUntil: 'domcontentloaded', timeout: 120_000 })
    await expect(page.getByText('Fysiska tester - Ishockey')).toBeVisible({ timeout: 60_000 })
    await page.getByText('Uthållighet', { exact: true }).click()
    await expect(page.getByText('VO2max / ramp')).toBeVisible()
    await expect(page.getByText('7x40m Uthållighet')).toBeVisible()
    await expect(page.getByText('LT1 fart')).toBeVisible()
    await expect(page.getByText('LT2 laktat')).toBeVisible()

    const teamLink = page.locator(`a[href*="/${businessSlug}/coach/teams/"][href$="/multivariate"]`)
    const teamLinkCount = await teamLink.count()
    if (teamLinkCount > 0) {
      const href = await teamLink.first().getAttribute('href')
      const teamId = href?.match(/\/teams\/([^/]+)\/multivariate/)?.[1]
      if (teamId) {
        const hockeyTestsApi = await page.evaluate(
          async ({ teamId, businessSlug }) => {
            const res = await fetch(`/api/coach/hockey-tests?teamId=${teamId}`, {
              credentials: 'include',
              headers: { 'x-business-slug': businessSlug },
            })
            return {
              ok: res.ok,
              status: res.status,
              body: await res.json().catch(() => null),
            }
          },
          { teamId, businessSlug },
        )
        expect(hockeyTestsApi.status).toBe(200)
        expect(Array.isArray(hockeyTestsApi.body?.tests)).toBe(true)
        expect(hockeyTestsApi.body.tests.length).toBeGreaterThan(0)
        const firstClientId = hockeyTestsApi.body.tests.find((test: { clientId?: string }) => test.clientId)?.clientId
        expect(firstClientId).toBeTruthy()

        const testPackageApi = await page.evaluate(
          async ({ teamId, businessSlug }) => {
            const res = await fetch(`/api/teams/${teamId}/hockey-test-package`, {
              credentials: 'include',
              headers: { 'x-business-slug': businessSlug },
            })
            return {
              ok: res.ok,
              status: res.status,
              body: await res.json().catch(() => null),
            }
          },
          { teamId, businessSlug },
        )
        expect(testPackageApi.status).toBe(200)
        expect(testPackageApi.body?.success).toBe(true)
        expect(Array.isArray(testPackageApi.body?.package?.items)).toBe(true)
        expect(testPackageApi.body.package.items.length).toBeGreaterThan(0)

        const athleteSummaryApi = await page.evaluate(
          async ({ clientId }) => {
            const res = await fetch(`/api/clients/${clientId}/hockey-tests/summary`, {
              credentials: 'include',
            })
            return {
              ok: res.ok,
              status: res.status,
              body: await res.json().catch(() => null),
            }
          },
          { clientId: firstClientId },
        )
        expect(athleteSummaryApi.status).toBe(200)
        expect(athleteSummaryApi.body?.success).toBe(true)
        expect(Array.isArray(athleteSummaryApi.body?.data?.history)).toBe(true)
        expect(athleteSummaryApi.body.data.history.length).toBeGreaterThan(0)

        await page.goto(`${baseUrl}/${businessSlug}/coach/teams/${teamId}/tests`, { waitUntil: 'domcontentloaded', timeout: 120_000 })
        await expect(page.getByRole('heading', { name: 'Tester' })).toBeVisible({ timeout: 60_000 })
        await expect(page.getByText('Hockey testmatris')).toBeVisible({ timeout: 60_000 })
        await expect(page.getByText('Development pathway')).toBeVisible({ timeout: 60_000 })
        await expect(page.getByText('Normer och percentiler')).toBeVisible({ timeout: 60_000 })

        const exportApi = await page.evaluate(
          async ({ teamId, businessSlug }) => {
            const res = await fetch(`/api/teams/${teamId}/hockey-tests/export?preset=aerobic_profile`, {
              credentials: 'include',
              headers: { 'x-business-slug': businessSlug },
            })
            return {
              ok: res.ok,
              status: res.status,
              body: await res.text(),
            }
          },
          { teamId, businessSlug },
        )
        expect(exportApi.status).toBe(200)
        expect(exportApi.body).toContain('vo2_max_ml_kg_min')
        expect(exportApi.body).toContain('lt2_speed_kmh')
      }
    }

    if (findings.length > 0) {
      throw new Error(`Hockey cockpit rendered with browser errors:\n${findings.join('\n')}`)
    }

    console.log('Hockey cockpit QA passed.')
  } finally {
    await browser.close()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})

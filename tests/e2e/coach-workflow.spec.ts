import { test, expect } from '@playwright/test'

const COACH_EMAIL = process.env.E2E_COACH_EMAIL || 'coach@test.com'
const COACH_PASSWORD = process.env.E2E_COACH_PASSWORD || 'password'

async function loginAsCoach(page: any) {
  await page.goto('/login')
  await page.fill('input[name="email"]', COACH_EMAIL)
  await page.fill('input[name="password"]', COACH_PASSWORD)
  await page.getByRole('button', { name: /logga in/i }).click()
  await page.waitForURL('**/coach/**', { timeout: 15_000 })
}

test.describe('Coach Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsCoach(page)
  })

  test('creates a training program', async ({ page }) => {
    await page.goto('/coach/programs/new')

    await expect(page.locator('h1')).toContainText(/nytt program/i)

    await page.getByRole('combobox', { name: /atlet/i }).selectOption('test-athlete')
    await page.getByRole('combobox', { name: /mål/i }).selectOption('MARATHON')
    await page.getByRole('combobox', { name: /metod/i }).selectOption('POLARIZED')
    await page.getByLabel(/antal veckor/i).fill('12')
    await page.getByLabel(/pass per vecka/i).fill('5')

    await page.getByRole('button', { name: /generera program/i }).click()
    await page.waitForURL('**/coach/programs/**', { timeout: 30_000 })

    await expect(page.locator('h1')).toContainText(/program/i)
    await expect(page.getByText(/POLARIZED/i)).toBeVisible()
  })

  test('views athlete readiness dashboard', async ({ page }) => {
    await page.goto('/coach/athletes/test-athlete/readiness')

    const readinessChart = page.locator('[data-testid="readiness-chart"]')
    await expect(readinessChart).toBeVisible()
    await expect(page.locator(/\/10 readiness/i)).toBeVisible()
  })
})


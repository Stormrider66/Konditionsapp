import { test, expect } from '@playwright/test'
import { AUTH_STATE_PATHS, waitForPageReady } from './helpers'

test.use({ storageState: AUTH_STATE_PATHS.athlete })
test.describe.configure({ mode: 'serial' })

test.describe('Authenticated Athlete AI', () => {
  test.setTimeout(180_000)

  test('Athlete settings render AI model controls for signed-in athletes', async ({ page }) => {
    await page.goto('/athlete/settings', { waitUntil: 'domcontentloaded', timeout: 120_000 })
    await waitForPageReady(page)

    await expect(page.getByRole('heading', { name: /Inställningar/i })).toBeVisible({ timeout: 120_000 })
    await expect(page.getByRole('heading', { name: /AI-modell/i })).toBeVisible({ timeout: 120_000 })
    await expect(page.getByRole('heading', { name: /AI & Kostnader/i })).toBeVisible({ timeout: 120_000 })
    await expect(page.getByRole('link', { name: /AI-kostnader & din plan/i })).toBeVisible({ timeout: 120_000 })
  })

  test('Athlete AI info page shows current plan details', async ({ page }) => {
    await page.goto('/athlete/settings/ai-info', { waitUntil: 'domcontentloaded', timeout: 120_000 })
    await waitForPageReady(page)

    await expect(page.getByRole('heading', { name: /AI & Din Plan/i })).toBeVisible({ timeout: 120_000 })
    await expect(page.getByRole('heading', { name: /^Din plan$/i })).toBeVisible({ timeout: 120_000 })
    await expect(page.getByRole('heading', { name: /^Jämför planer$/i })).toBeVisible({ timeout: 120_000 })
  })
})

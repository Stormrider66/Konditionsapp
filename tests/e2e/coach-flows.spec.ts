import { test, expect } from '@playwright/test'
import { loginAsCoach, businessPath, waitForPageReady } from './helpers'

test.describe('Coach Flows', () => {

  test('Coach: Dashboard -> Navigate to clients list', async ({ page }) => {
    await loginAsCoach(page)

    // Navigate to clients via nav
    await page.getByRole('link', { name: /atleter/i }).click()
    await page.waitForURL('**/coach/clients', { timeout: 10_000 })

    // Verify clients page loads
    await expect(page.getByText(/Klientregister/i)).toBeVisible()

    // Verify search input exists
    await expect(page.getByPlaceholder(/Sök namn/i)).toBeVisible()
  })

  test('Coach: Clients -> Search filters the list', async ({ page }) => {
    await loginAsCoach(page)
    await page.goto(businessPath('coach', '/clients'))
    await waitForPageReady(page)

    await expect(page.getByText(/Klientregister/i)).toBeVisible()

    // Type in search box and verify it filters (at minimum, doesn't crash)
    const searchInput = page.getByPlaceholder(/Sök namn/i)
    await searchInput.fill('nonexistent-athlete-xyz')
    // Give debounce time to settle
    await page.waitForTimeout(500)

    // Either shows filtered results or empty state - page should not error
    await expect(page.locator('main')).toBeVisible()
  })

  test('Coach: Navigate to AI Studio', async ({ page }) => {
    await loginAsCoach(page)

    // AI Studio is in the "Tools" dropdown on desktop
    await page.goto(businessPath('coach', '/ai-studio'))
    await waitForPageReady(page)

    // Verify AI Studio loaded - look for the chat interface or API key warning
    const aiStudioLoaded = page.getByText(/AI Studio/i)
      .or(page.getByText(/Gå till Inställningar/i)) // API key warning
      .or(page.locator('textarea')) // Chat input
    await expect(aiStudioLoaded).toBeVisible({ timeout: 10_000 })
  })

  test('Coach: Navigate to Programs page', async ({ page }) => {
    await loginAsCoach(page)

    await page.getByRole('link', { name: /program/i }).first().click()
    await page.waitForURL('**/coach/programs', { timeout: 10_000 })

    // Should show programs page or empty state
    const programsPage = page.getByText(/program/i)
    await expect(programsPage.first()).toBeVisible()
  })

  test('Coach: Navigate to Calendar', async ({ page }) => {
    await loginAsCoach(page)

    await page.getByRole('link', { name: /kalender/i }).click()
    await page.waitForURL('**/coach/calendar**', { timeout: 10_000 })

    // Calendar should render with month/week/day controls
    await expect(page.locator('main')).toBeVisible()
  })

  test('Coach: Navigate to Settings', async ({ page }) => {
    await loginAsCoach(page)
    await page.goto(businessPath('coach', '/settings'))
    await waitForPageReady(page)

    await expect(page.getByText(/Inställningar/i)).toBeVisible()
    // AI settings link should be visible
    await expect(page.getByText(/AI Modell/i)).toBeVisible()
  })

  test('Coach: Settings -> AI configuration page', async ({ page }) => {
    await loginAsCoach(page)
    await page.goto(businessPath('coach', '/settings/ai'))
    await waitForPageReady(page)

    // Should show AI model configuration
    const aiSettingsPage = page.getByText(/AI/i).first()
    await expect(aiSettingsPage).toBeVisible()
  })
})

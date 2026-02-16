import { test, expect } from '@playwright/test'
import { loginAsAthlete, businessPath, waitForPageReady } from './helpers'

test.describe('Athlete Flows', () => {

  test('Athlete: Dashboard loads with key sections', async ({ page }) => {
    await loginAsAthlete(page)

    // Greeting
    await expect(page.getByText(/Hej,/i)).toBeVisible()

    // Today's workout section
    await expect(page.getByText(/Dagens pass/i)).toBeVisible()
  })

  test('Athlete: Navigate to Programs page', async ({ page }) => {
    await loginAsAthlete(page)
    await page.goto(businessPath('athlete', '/programs'))
    await waitForPageReady(page)

    // Should show programs heading or empty state
    const programsVisible = page.getByText(/Mina Program/i)
      .or(page.getByText(/Inga program ännu/i))
    await expect(programsVisible).toBeVisible()
  })

  test('Athlete: Navigate to Calendar', async ({ page }) => {
    await loginAsAthlete(page)

    await page.getByRole('link', { name: /kalender/i }).click()
    await page.waitForURL('**/athlete/calendar**', { timeout: 10_000 })

    // Calendar should render
    await expect(page.locator('main')).toBeVisible()
  })

  test('Athlete: Navigate to Workout Logging page', async ({ page }) => {
    await loginAsAthlete(page)
    await page.goto(businessPath('athlete', '/log-workout'))
    await waitForPageReady(page)

    // Should show the input method selection
    await expect(page.getByText(/Logga ett pass/i)).toBeVisible()

    // Verify input method cards are visible
    await expect(page.getByText(/Skriv/i)).toBeVisible()
    await expect(page.getByText(/Formulär/i)).toBeVisible()
  })

  test('Athlete: Workout Logging -> Text input page', async ({ page }) => {
    await loginAsAthlete(page)
    await page.goto(businessPath('athlete', '/log-workout'))
    await waitForPageReady(page)

    // Click the text input card
    await page.getByText(/Skriv/i).click()
    await page.waitForURL('**/log-workout/text', { timeout: 10_000 })

    // Should show a text input area
    await expect(page.locator('textarea').or(page.locator('input[type="text"]'))).toBeVisible()
  })

  test('Athlete: Navigate to Test History', async ({ page }) => {
    await loginAsAthlete(page)
    await page.goto(businessPath('athlete', '/tests'))
    await waitForPageReady(page)

    // Should show test history or empty state
    await expect(page.locator('main')).toBeVisible()
  })

  test('Athlete: Navigate to Profile', async ({ page }) => {
    await loginAsAthlete(page)
    await page.goto(businessPath('athlete', '/profile'))
    await waitForPageReady(page)

    // Should show profile page with user info
    await expect(page.locator('main')).toBeVisible()
  })

  test('Athlete: Navigate to Settings', async ({ page }) => {
    await loginAsAthlete(page)
    await page.goto(businessPath('athlete', '/settings'))
    await waitForPageReady(page)

    await expect(page.getByText(/Inställningar/i)).toBeVisible()
  })
})

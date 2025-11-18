import { test, expect, Page } from '@playwright/test'

const ATHLETE_EMAIL = process.env.E2E_ATHLETE_EMAIL || 'athlete@test.com'
const ATHLETE_PASSWORD = process.env.E2E_ATHLETE_PASSWORD || 'password'
const COACH_EMAIL = process.env.E2E_COACH_EMAIL || 'coach@test.com'
const COACH_PASSWORD = process.env.E2E_COACH_PASSWORD || 'password'

async function loginAsAthlete(page: Page) {
  await page.goto('/login')
  await page.fill('input[name="email"]', ATHLETE_EMAIL)
  await page.fill('input[name="password"]', ATHLETE_PASSWORD)
  await page.getByRole('button', { name: /logga in/i }).click()
  await page.waitForURL('**/athlete/dashboard', { timeout: 15_000 })
}

async function loginAsCoach(page: Page) {
  await page.goto('/login')
  await page.fill('input[name="email"]', COACH_EMAIL)
  await page.fill('input[name="password"]', COACH_PASSWORD)
  await page.getByRole('button', { name: /logga in/i }).click()
  await page.waitForURL('**/coach/dashboard', { timeout: 15_000 })
}

// Helper to handle Radix UI Sliders
async function setSlider(page: Page, labelRegex: RegExp, arrowKey: 'ArrowRight' | 'ArrowLeft', times: number) {
    // Find the slider container associated with the label
    // This selector strategy assumes the label and slider are close siblings or parent/child
    // Adjust based on your specific DOM structure if needed
    const sliderContainer = page.locator('div').filter({ hasText: labelRegex }).last()
    const thumb = sliderContainer.getByRole('slider')
    await thumb.focus()
    // Reset to min first if needed, but default is usually reliable
    for (let i = 0; i < times; i++) {
        await page.keyboard.press(arrowKey)
    }
}

test.describe('Critical User Flows', () => {
  
  test('Athlete: Login -> Daily Check-in (Good Day) -> Dashboard', async ({ page }) => {
    await loginAsAthlete(page)

    // Verify Dashboard Load
    await expect(page.getByText(/Hej,/i)).toBeVisible()
    await expect(page.getByText(/Dagens pass/i)).toBeVisible()

    // Navigate to Check-in
    // Note: Ideally use a stable testid, e.g. data-testid="nav-check-in"
    await page.goto('/athlete/check-in')
    
    await expect(page.getByText(/Daglig incheckning/i)).toBeVisible()

    // Fill Wellness Form (Good values)
    // Sleep Quality (1-10): Set to 8 (Good)
    await setSlider(page, /^Sleep Quality/, 'ArrowRight', 7) // 1 + 7 = 8

    // Sleep Duration (0-12): Set to 8 hours
    await setSlider(page, /^Sleep Duration/, 'ArrowRight', 16) // 0 + 16*0.5 = 8

    // Muscle Soreness (1-10): 1 = No Soreness. Keep at 1 or slight bump
    await setSlider(page, /^Muscle Soreness/, 'ArrowRight', 1) // 1 + 1 = 2 (Very low soreness)

    // Stress (1-10): 1 = No Stress. Keep at 1.
    
    // Mood (1-10): Set to 8
    await setSlider(page, /^Mood/, 'ArrowRight', 7) // 1 + 7 = 8

    // Submit
    await page.getByRole('button', { name: /Submit Check-In/i }).click()

    // Verify Feedback
    await expect(page.getByText(/Readiness Score:/i)).toBeVisible({ timeout: 10000 })
    await expect(page.getByText(/Rekommendation:/i)).toBeVisible()
    
    // Should be Green/Default alert
    const alert = page.locator('div[role="alert"]')
    await expect(alert).toHaveClass(/bg-background|text-foreground/) // Default variant check
    await expect(alert).not.toHaveClass(/destructive/)
  })

  test('Athlete: Login -> Daily Check-in (Bad Day) -> Warnings', async ({ page }) => {
    await loginAsAthlete(page)
    await page.goto('/athlete/check-in')

    // Fill Wellness Form (Bad values)
    // Sleep Quality: 2 (Poor)
    await setSlider(page, /^Sleep Quality/, 'ArrowRight', 1)

    // Sleep Duration: 4 hours (Critically low)
    await setSlider(page, /^Sleep Duration/, 'ArrowRight', 8) // 0.5 * 8 = 4

    // Muscle Soreness: 9 (Extreme)
    await setSlider(page, /^Muscle Soreness/, 'ArrowRight', 8) // 1 + 8 = 9

    // Stress: 9 (Extreme)
    await setSlider(page, /^Stress Level/, 'ArrowRight', 8)

    // Submit
    await page.getByRole('button', { name: /Submit Check-In/i }).click()

    // Verify Feedback
    await expect(page.getByText(/Readiness Score:/i)).toBeVisible()
    
    // Check for Red/Destructive alert
    const alert = page.locator('div[role="alert"]')
    await expect(alert).toHaveClass(/destructive/)

    // Check for "Orsaker" list
    await expect(page.getByText(/Orsaker:/i)).toBeVisible()
    await expect(page.getByText(/soreness/i)).toBeVisible() // Backend message usually contains "soreness"
  })

  test('Coach: Login -> Dashboard', async ({ page }) => {
    await loginAsCoach(page)
    await expect(page.getByText(/Coach Dashboard/i).or(page.getByText(/Översikt/i))).toBeVisible()
  })
})

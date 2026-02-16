import { test, expect } from '@playwright/test'
import { loginAsAthlete, loginAsCoach, setSlider } from './helpers'

test.describe('Critical User Flows', () => {

  test('Athlete: Login -> Daily Check-in (Good Day) -> Dashboard', async ({ page }) => {
    await loginAsAthlete(page)

    // Verify Dashboard Load
    await expect(page.getByText(/Hej,/i)).toBeVisible()
    await expect(page.getByText(/Dagens pass/i)).toBeVisible()

    // Navigate to Check-in
    await page.goto('/athlete/check-in')

    await expect(page.getByText(/Daglig incheckning/i)).toBeVisible()

    // Fill Wellness Form (Good values)
    await setSlider(page, /^Sleep Quality/, 'ArrowRight', 7) // 1 + 7 = 8
    await setSlider(page, /^Sleep Duration/, 'ArrowRight', 16) // 0 + 16*0.5 = 8
    await setSlider(page, /^Muscle Soreness/, 'ArrowRight', 1) // 1 + 1 = 2
    await setSlider(page, /^Mood/, 'ArrowRight', 7) // 1 + 7 = 8

    // Submit
    await page.getByRole('button', { name: /Submit Check-In/i }).click()

    // Verify Feedback
    await expect(page.getByText(/Readiness Score:/i)).toBeVisible({ timeout: 10000 })
    await expect(page.getByText(/Rekommendation:/i)).toBeVisible()

    // Should be Green/Default alert
    const alert = page.locator('div[role="alert"]')
    await expect(alert).toHaveClass(/bg-background|text-foreground/)
    await expect(alert).not.toHaveClass(/destructive/)
  })

  test('Athlete: Login -> Daily Check-in (Bad Day) -> Warnings', async ({ page }) => {
    await loginAsAthlete(page)
    await page.goto('/athlete/check-in')

    // Fill Wellness Form (Bad values)
    await setSlider(page, /^Sleep Quality/, 'ArrowRight', 1)
    await setSlider(page, /^Sleep Duration/, 'ArrowRight', 8) // 0.5 * 8 = 4
    await setSlider(page, /^Muscle Soreness/, 'ArrowRight', 8) // 1 + 8 = 9
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
    await expect(page.getByText(/soreness/i)).toBeVisible()
  })

  test('Coach: Login -> Dashboard', async ({ page }) => {
    await loginAsCoach(page)
    await expect(page.getByText(/Coach Dashboard/i).or(page.getByText(/Översikt/i))).toBeVisible()
  })
})

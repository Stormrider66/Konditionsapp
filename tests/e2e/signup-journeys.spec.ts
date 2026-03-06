import { test, expect } from '@playwright/test'

test.describe('Public Signup Journeys', () => {
  test.setTimeout(120_000)

  test('Legacy register page redirects into the signup chooser', async ({ page }) => {
    await page.goto('/register', { waitUntil: 'domcontentloaded', timeout: 120_000 })
    await expect(page).toHaveURL(/\/signup/, { timeout: 120_000 })
    await expect(page.getByText(/Skapa ditt konto/i)).toBeVisible({ timeout: 120_000 })
  })

  test('Signup chooser forwards athlete invite codes', async ({ page }) => {
    await page.goto('/signup?invite=athlete-invite-123', { waitUntil: 'domcontentloaded', timeout: 120_000 })
    await expect(page.getByText(/Create athlete account/i)).toBeVisible({ timeout: 120_000 })
    await expect(page.locator('#inviteCode')).toHaveValue('athlete-invite-123', { timeout: 120_000 })
  })

  test('Signup chooser forwards business invitations to coach signup', async ({ page }) => {
    await page.goto('/signup?invitation=business-invite-456', { waitUntil: 'domcontentloaded', timeout: 120_000 })
    await expect(page.getByText(/Registrera dig som Coach/i)).toBeVisible({ timeout: 120_000 })
    await expect(page).toHaveURL(/\/signup\/coach\?invitation=business-invite-456/, { timeout: 120_000 })
  })

  test('Athlete signup page renders tier selection and form fields', async ({ page }) => {
    await page.goto('/signup/athlete', { waitUntil: 'domcontentloaded', timeout: 120_000 })

    await expect(page.getByText(/Välj din plan/i)).toBeVisible({ timeout: 120_000 })
    await expect(page.locator('#name')).toBeVisible({ timeout: 120_000 })
    await expect(page.locator('#email')).toBeVisible({ timeout: 120_000 })
    await expect(page.getByText(/399 kr\/mån/i)).toBeVisible({ timeout: 120_000 })
  })

  test('Coach signup page renders self-athlete option', async ({ page }) => {
    await page.goto('/signup/coach', { waitUntil: 'domcontentloaded', timeout: 120_000 })

    await expect(page.locator('#name')).toBeVisible({ timeout: 120_000 })
    await expect(page.locator('#email')).toBeVisible({ timeout: 120_000 })
    await expect(page.locator('#createAthleteProfile')).toBeVisible({ timeout: 120_000 })
    await expect(page.getByText(/I also want to use the app as an athlete/i)).toBeVisible({ timeout: 120_000 })
  })
})

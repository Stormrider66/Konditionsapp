import { test, expect } from '@playwright/test'
import { login, TEST_ACCOUNTS, TEST_BUSINESS_SLUG } from './helpers'

test.describe('Authentication & Navigation Guards', () => {

  test('Unauthenticated user is redirected to login', async ({ page }) => {
    await page.goto('/athlete/dashboard')
    await expect(page).toHaveURL(/\/login/)
  })

  test('Unauthenticated API request returns 401', async ({ request }) => {
    const response = await request.get('/api/athlete/profile')
    expect(response.status()).toBe(401)
  })

  test('Login page renders correctly', async ({ page }) => {
    await page.goto('/login')

    await expect(page.locator('input[name="email"]')).toBeVisible()
    await expect(page.locator('input[name="password"]')).toBeVisible()
    await expect(page.getByRole('button', { name: /logga in/i })).toBeVisible()
  })

  test('Invalid login shows error', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[name="email"]', 'nonexistent@example.com')
    await page.fill('input[name="password"]', 'wrongpassword')
    await page.getByRole('button', { name: /logga in/i }).click()

    // Should show an error message (not redirect to dashboard)
    await page.waitForTimeout(2000)
    const currentUrl = page.url()
    expect(currentUrl).toContain('/login')
  })

  test('Authenticated coach is redirected away from /login', async ({ page }) => {
    // Login first
    await login(page, TEST_ACCOUNTS.coach.email, TEST_ACCOUNTS.coach.password)
    await page.waitForURL('**/coach/dashboard', { timeout: 15_000 })

    // Visiting /login should redirect to dashboard
    await page.goto('/login')
    await page.waitForTimeout(3000)
    const url = page.url()
    expect(url).not.toMatch(/\/login$/)
  })

  test('Business-scoped route with wrong slug redirects', async ({ page }) => {
    await login(page, TEST_ACCOUNTS.coach.email, TEST_ACCOUNTS.coach.password)
    await page.waitForURL('**/coach/dashboard', { timeout: 15_000 })

    // Try accessing a non-existent business
    await page.goto('/nonexistent-business-slug/coach/dashboard')
    await page.waitForTimeout(3000)

    // Should redirect to own business or home
    const url = page.url()
    expect(url).not.toContain('nonexistent-business-slug')
  })

  test('Health check endpoint responds', async ({ request }) => {
    const response = await request.get('/api/health')
    expect(response.status()).toBe(200)

    const body = await response.json()
    expect(body.status).toBeDefined()
    expect(body.checks).toBeDefined()
    expect(body.checks.database).toBeDefined()
  })
})

test.describe('Public Pages', () => {

  test('Pricing page loads', async ({ page }) => {
    await page.goto('/pricing')
    await expect(page.locator('main')).toBeVisible()
    // Should show pricing plan cards
    await expect(page.getByText(/Starter|Professional|Business|Enterprise/i).first()).toBeVisible()
  })

  test('Home page loads', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('main').or(page.locator('body'))).toBeVisible()
  })
})

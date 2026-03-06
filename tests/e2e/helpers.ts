/**
 * Shared E2E test helpers and configuration
 */
import { type Page, expect } from '@playwright/test'
import { AUTH_STATE_PATHS } from './auth-state'

// ---------------------------------------------------------------------------
// Test accounts – override via environment variables for CI
// ---------------------------------------------------------------------------
export const TEST_ACCOUNTS = {
  athlete: {
    email: process.env.E2E_ATHLETE_EMAIL || 'athlete@test.com',
    password: process.env.E2E_ATHLETE_PASSWORD || 'password',
  },
  coach: {
    email: process.env.E2E_COACH_EMAIL || 'coach@test.com',
    password: process.env.E2E_COACH_PASSWORD || 'password',
  },
  physio: {
    email: process.env.E2E_PHYSIO_EMAIL || 'physio@test.com',
    password: process.env.E2E_PHYSIO_PASSWORD || 'password',
  },
} as const

// The business slug used for business-scoped routes in tests.
export const TEST_BUSINESS_SLUG = process.env.E2E_BUSINESS_SLUG || 'testbusiness'
export { AUTH_STATE_PATHS }

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

async function waitForHydratedSubmit(page: Page) {
  await page.waitForLoadState('networkidle', { timeout: 120_000 }).catch(() => {})
  await page.waitForFunction(() => {
    const button = document.querySelector('button[type="submit"]')
    if (!button) return false
    const keys = Object.keys(button)
    return keys.some((key) => key.startsWith('__reactProps$') || key.startsWith('__reactFiber$'))
  }, undefined, { timeout: 120_000 })
}

export async function waitForSupabaseAuthCookie(page: Page, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    const cookies = await page.context().cookies()
    const hasAuthCookie = cookies.some((cookie) => cookie.name.includes('auth-token') && Boolean(cookie.value))

    if (hasAuthCookie) {
      return
    }

    await page.waitForTimeout(1_000)
  }

  throw new Error('Timed out waiting for Supabase auth cookie')
}

export async function login(page: Page, email: string, password: string) {
  const loginButton = page.getByRole('button', { name: /logga in|log in/i })
  await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 120_000 })
  await expect(page.locator('input[name="email"]')).toBeVisible({ timeout: 120_000 })
  await expect(page.locator('input[name="password"]')).toBeVisible({ timeout: 120_000 })
  await expect(loginButton).toBeVisible({ timeout: 120_000 })
  await waitForHydratedSubmit(page)
  await page.fill('input[name="email"]', email)
  await page.fill('input[name="password"]', password)
  await loginButton.click()
}

export async function loginToPath(page: Page, email: string, password: string, path: string) {
  await login(page, email, password)
  await waitForSupabaseAuthCookie(page)
  await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 120_000 })
  await expectUrlContains(page, path)
}

export async function loginAsAthlete(page: Page) {
  await loginToPath(page, TEST_ACCOUNTS.athlete.email, TEST_ACCOUNTS.athlete.password, '/athlete/dashboard')
}

export async function loginAsCoach(page: Page) {
  await loginToPath(page, TEST_ACCOUNTS.coach.email, TEST_ACCOUNTS.coach.password, '/coach/dashboard')
}

export async function loginAsPhysio(page: Page) {
  await loginToPath(page, TEST_ACCOUNTS.physio.email, TEST_ACCOUNTS.physio.password, '/physio/dashboard')
}

// ---------------------------------------------------------------------------
// URL helpers
// ---------------------------------------------------------------------------

/** Build a business-scoped path, e.g. /testbusiness/coach/clients */
export function businessPath(role: 'coach' | 'athlete' | 'physio', path: string) {
  const clean = path.startsWith('/') ? path : `/${path}`
  return `/${TEST_BUSINESS_SLUG}/${role}${clean}`
}

// ---------------------------------------------------------------------------
// UI interaction helpers
// ---------------------------------------------------------------------------

/**
 * Set a Radix UI Slider value by pressing arrow keys.
 * @param labelRegex - regex matching the label text near the slider
 * @param arrowKey   - direction to press
 * @param times      - how many presses
 */
export async function setSlider(
  page: Page,
  labelRegex: RegExp,
  arrowKey: 'ArrowRight' | 'ArrowLeft',
  times: number,
) {
  const sliderContainer = page.locator('div').filter({ hasText: labelRegex }).last()
  const thumb = sliderContainer.getByRole('slider')
  await thumb.focus()
  for (let i = 0; i < times; i++) {
    await page.keyboard.press(arrowKey)
  }
}

/**
 * Wait for a navigation/page load to settle (network idle + DOM stable).
 */
export async function waitForPageReady(page: Page) {
  await page.waitForLoadState('domcontentloaded', { timeout: 30_000 })
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
}

/**
 * Assert that the current URL contains the given path segment.
 */
export async function expectUrlContains(page: Page, segment: string) {
  await expect(page).toHaveURL(new RegExp(segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
}

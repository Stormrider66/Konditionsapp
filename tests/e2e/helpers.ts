/**
 * Shared E2E test helpers and configuration
 */
import { type Page, expect } from '@playwright/test'

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

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

export async function login(page: Page, email: string, password: string) {
  await page.goto('/login')
  await page.fill('input[name="email"]', email)
  await page.fill('input[name="password"]', password)
  await page.getByRole('button', { name: /logga in/i }).click()
}

export async function loginAsAthlete(page: Page) {
  await login(page, TEST_ACCOUNTS.athlete.email, TEST_ACCOUNTS.athlete.password)
  await page.waitForURL('**/athlete/dashboard', { timeout: 15_000 })
}

export async function loginAsCoach(page: Page) {
  await login(page, TEST_ACCOUNTS.coach.email, TEST_ACCOUNTS.coach.password)
  await page.waitForURL('**/coach/dashboard', { timeout: 15_000 })
}

export async function loginAsPhysio(page: Page) {
  await login(page, TEST_ACCOUNTS.physio.email, TEST_ACCOUNTS.physio.password)
  await page.waitForURL('**/physio/dashboard', { timeout: 15_000 })
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
  await page.waitForLoadState('networkidle', { timeout: 15_000 })
}

/**
 * Assert that the current URL contains the given path segment.
 */
export async function expectUrlContains(page: Page, segment: string) {
  await expect(page).toHaveURL(new RegExp(segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
}

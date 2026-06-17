import { test, expect } from '@playwright/test'
import { prisma } from '../../lib/prisma'
import { loginToPath, waitForPageReady } from './helpers'
import { ensureCoachOpsReviewFixture } from './auth-provisioning'

test.describe.configure({ mode: 'serial' })

test.describe('Authenticated Coach Ops review gate', () => {
  test.setTimeout(240_000)

  test('coach can act on pain alert and approve flagged test data', async ({ page }) => {
    const fixture = await ensureCoachOpsReviewFixture()
    const dashboardPath = `/${fixture.businessSlug}/coach/dashboard`

    await loginToPath(page, fixture.account.email, fixture.account.password, dashboardPath)
    await waitForPageReady(page)

    await expect(page.getByText('Coach Command Center')).toBeVisible({ timeout: 120_000 })
    await page.getByRole('button', { name: /Show queue/i }).click()

    await expect(page.getByText('Post-workout pain reported').first()).toBeVisible({ timeout: 120_000 })
    await expect(page.getByText('Test data needs review').first()).toBeVisible({ timeout: 120_000 })

    await page.getByRole('button', { name: /Pain \/ injury/i }).click()
    await expect(page.getByText('Post-workout pain reported').first()).toBeVisible()
    await page.getByRole('button', { name: /Snooze alert for 24 hours/i }).first().click()

    await expect.poll(async () => {
      const alert = await prisma.coachAlert.findUnique({
        where: { id: fixture.painAlertId },
        select: { status: true, snoozedUntil: true },
      })
      return alert?.status === 'SNOOZED' && alert.snoozedUntil ? 'SNOOZED' : alert?.status
    }).toBe('SNOOZED')

    await page.goto(`/${fixture.businessSlug}/coach/tests/review`, {
      waitUntil: 'domcontentloaded',
      timeout: 120_000,
    })
    await waitForPageReady(page)

    await expect(page.getByRole('heading', { name: /Test review queue/i })).toBeVisible({ timeout: 120_000 })
    await expect(page.getByText('E2E Coach Ops Athlete')).toBeVisible()
    await expect(page.getByText(/Lactate dropped unexpectedly/i)).toBeVisible()

    await page.locator(`a[href="/${fixture.businessSlug}/coach/tests/${fixture.reviewTestId}#quality-review"]`).click()
    await waitForPageReady(page)

    const reviewBanner = page.locator('#quality-review')
    await expect(reviewBanner).toContainText(/Test data needs review/i, { timeout: 120_000 })
    await reviewBanner.locator('textarea').fill('Approved during E2E coach ops smoke test.')
    await reviewBanner.getByRole('button', { name: /Approve/i }).click()

    await expect.poll(async () => {
      const reviewed = await prisma.test.findUnique({
        where: { id: fixture.reviewTestId },
        select: { qualityReviewStatus: true, qualityReviewNote: true },
      })
      return reviewed?.qualityReviewStatus
    }).toBe('APPROVED')

    await expect(reviewBanner).toContainText(/Test data approved/i, { timeout: 120_000 })
  })
})

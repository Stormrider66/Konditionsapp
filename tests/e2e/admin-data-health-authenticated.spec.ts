import { test, expect } from '@playwright/test'
import { AUTH_STATE_PATHS, waitForPageReady } from './helpers'
import { fulfillJson, mockAdminStats } from './admin-dashboard-mocks'

test.use({ storageState: AUTH_STATE_PATHS.admin })
test.describe.configure({ mode: 'serial' })

test.describe('Authenticated Admin Data Health', () => {
  test.setTimeout(360_000)

  test('Platform admin can open the athlete integrity panel', async ({ page }) => {
    await page.goto('/admin', { waitUntil: 'domcontentloaded', timeout: 240_000 })
    await waitForPageReady(page)

    const dataHealthTab = page.getByRole('tab', { name: /Data Health/i })
    await expect(dataHealthTab).toBeVisible({ timeout: 120_000 })
    await dataHealthTab.click()

    const panel = page.getByRole('tabpanel', { name: /Data Health/i })
    await expect(panel).toBeVisible({ timeout: 120_000 })
    await expect(panel.getByText(/^Athlete Integrity$/)).toBeVisible({ timeout: 120_000 })
    await expect(panel.getByRole('button', { name: /Refresh audit/i })).toBeVisible({ timeout: 120_000 })
    await expect(panel.getByRole('button', { name: /Repair fixable issues/i })).toBeVisible({ timeout: 120_000 })
    await expect(panel.getByText(/Tracked users/i)).toBeVisible({ timeout: 120_000 })
    await expect(panel.getByText(/Open issues/i)).toBeVisible({ timeout: 120_000 })
    await expect(panel.getByText(/Auto-fixable/i)).toBeVisible({ timeout: 120_000 })
  })

  test('Platform admin can trigger repair from the athlete integrity panel', async ({ page }) => {
    const initialReport = {
      generatedAt: '2026-03-06T12:00:00.000Z',
      summary: {
        scannedUsers: 1,
        athleteUsers: 1,
        selfAthleteUsers: 0,
        totalIssues: 2,
        fixableIssues: 2,
        byCode: {
          ATHLETE_MISSING_AGENT_PREFERENCES: 1,
          ATHLETE_MISSING_SPORT_PROFILE: 1,
        },
      },
      issues: [
        {
          id: 'issue-1',
          code: 'ATHLETE_MISSING_AGENT_PREFERENCES',
          severity: 'warning',
          fixable: true,
          userId: 'user-fixable-1',
          clientId: 'client-fixable-1',
          role: 'ATHLETE',
          email: 'e2e-repair-target@trainomics.test',
          message: 'Agent preferences are missing',
        },
        {
          id: 'issue-2',
          code: 'ATHLETE_MISSING_SPORT_PROFILE',
          severity: 'warning',
          fixable: true,
          userId: 'user-fixable-1',
          clientId: 'client-fixable-1',
          role: 'ATHLETE',
          email: 'e2e-repair-target@trainomics.test',
          message: 'Sport profile is missing',
        },
      ],
    } as const

    const repairedResult = {
      generatedAt: '2026-03-06T12:01:00.000Z',
      targetedIssueCount: 2,
      repairedCount: 1,
      failedCount: 0,
      repairs: [
        {
          key: 'user-fixable-1:client-fixable-1',
          userId: 'user-fixable-1',
          clientId: 'client-fixable-1',
          issueCodes: ['ATHLETE_MISSING_AGENT_PREFERENCES', 'ATHLETE_MISSING_SPORT_PROFILE'],
          status: 'applied',
          message: 'Applied athlete default repairs',
        },
      ],
      reportAfter: {
        generatedAt: '2026-03-06T12:01:00.000Z',
        summary: {
          scannedUsers: 1,
          athleteUsers: 1,
          selfAthleteUsers: 0,
          totalIssues: 0,
          fixableIssues: 0,
          byCode: {},
        },
        issues: [],
      },
    } as const

    let currentReport = initialReport
    let lastRepairRequestBody: unknown = null

    await mockAdminStats(page)

    await page.route('**/api/admin/data-health/athlete-integrity*', async (route) => {
      const request = route.request()

      if (request.method() === 'GET') {
        await fulfillJson(route, {
          success: true,
          data: currentReport,
        })
        return
      }

      if (request.method() === 'POST') {
        lastRepairRequestBody = JSON.parse(request.postData() || '{}')
        currentReport = repairedResult.reportAfter

        await fulfillJson(route, {
          success: true,
          data: repairedResult,
        })
        return
      }

      await route.fallback()
    })

    await page.goto('/admin', { waitUntil: 'domcontentloaded', timeout: 240_000 })
    await waitForPageReady(page)

    const dataHealthTab = page.getByRole('tab', { name: /Data Health/i })
    await expect(dataHealthTab).toBeVisible({ timeout: 120_000 })
    await dataHealthTab.click()

    const panel = page.getByRole('tabpanel', { name: /Data Health/i })
    const repairButton = panel.getByRole('button', { name: /Repair fixable issues/i })
    const targetIssueCell = panel.getByRole('cell', { name: /e2e-repair-target@trainomics\.test/i }).first()

    await expect(targetIssueCell).toBeVisible({ timeout: 120_000 })
    await expect(repairButton).toBeEnabled({ timeout: 120_000 })

    await repairButton.click()

    await expect(panel.getByText(/Repaired 1 grouped records\. Failed repairs: 0\./i)).toBeVisible({
      timeout: 120_000,
    })
    await expect(panel.getByText(/No athlete integrity issues detected in the current scan\./i)).toBeVisible({
      timeout: 120_000,
    })
    await expect(repairButton).toBeDisabled({ timeout: 120_000 })
    await expect(targetIssueCell).not.toBeVisible()
    expect(lastRepairRequestBody).toEqual({ limit: 250 })
  })
})

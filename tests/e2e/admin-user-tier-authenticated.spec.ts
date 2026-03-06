import { test, expect } from '@playwright/test'
import { AUTH_STATE_PATHS, waitForPageReady } from './helpers'
import { fulfillJson, mockAdminBusinesses, mockAdminStats } from './admin-dashboard-mocks'

test.use({ storageState: AUTH_STATE_PATHS.admin })
test.describe.configure({ mode: 'serial' })

test.describe('Authenticated Admin User Management', () => {
  test.setTimeout(240_000)

  test('Platform admin can change an athlete tier from the users tab', async ({ page }) => {
    let currentTier = 'FREE'
    const updatePayloads: Array<Record<string, unknown>> = []

    await mockAdminStats(page)
    await mockAdminBusinesses(page)

    await page.route('**/api/admin/users*', async (route) => {
      const request = route.request()
      const url = new URL(request.url())

      if (request.method() === 'GET' && url.pathname === '/api/admin/users') {
        await fulfillJson(route, {
          success: true,
          data: {
            users: [
              {
                id: 'user-athlete-1',
                email: 'e2e-managed-athlete@trainomics.test',
                name: 'E2E Managed Athlete',
                role: 'ATHLETE',
                adminRole: null,
                language: 'sv',
                createdAt: '2026-03-06T12:00:00.000Z',
                subscription: {
                  tier: currentTier,
                  status: 'ACTIVE',
                  maxAthletes: null,
                },
                clientsCount: 0,
                businesses: [],
              },
            ],
            pagination: {
              page: 1,
              totalPages: 1,
              total: 1,
            },
          },
        })
        return
      }

      if (request.method() === 'PUT' && url.pathname === '/api/admin/users') {
        const payload = JSON.parse(request.postData() || '{}') as Record<string, unknown>
        updatePayloads.push(payload)

        if (payload.userId === 'user-athlete-1' && typeof payload.tier === 'string') {
          currentTier = payload.tier
        }

        await fulfillJson(route, { success: true })
        return
      }

      await route.fallback()
    })

    await page.goto('/admin', { waitUntil: 'domcontentloaded', timeout: 240_000 })
    await waitForPageReady(page)

    const usersTab = page.getByRole('tab', { name: /Users/i })
    await expect(usersTab).toBeVisible({ timeout: 120_000 })
    await usersTab.click()

    const userRow = page.getByRole('row').filter({ hasText: /e2e-managed-athlete@trainomics\.test/i })
    await expect(userRow).toBeVisible({ timeout: 120_000 })

    const tierSelect = userRow.getByRole('combobox').nth(2)
    await expect(tierSelect).toContainText(/Free/i)

    await tierSelect.click()
    await page.getByRole('option', { name: /^Pro$/i }).click()

    await expect.poll(() => updatePayloads.length).toBe(1)
    expect(updatePayloads[0]).toMatchObject({
      userId: 'user-athlete-1',
      tier: 'PRO',
    })

    await expect(userRow.getByRole('combobox').nth(2)).toContainText(/Pro/i, { timeout: 120_000 })
  })
})

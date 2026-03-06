import type { Page, Route } from '@playwright/test'

const ADMIN_STATS_FIXTURE = {
  period: {
    start: '2026-01-01T00:00:00.000Z',
    end: '2026-01-31T23:59:59.999Z',
    days: 30,
  },
  users: {
    total: 2,
    newThisPeriod: 0,
    byRole: {
      ADMIN: 1,
      ATHLETE: 1,
    },
  },
  subscriptions: {
    byTier: {
      FREE: 1,
      BASIC: 0,
      PRO: 0,
      ENTERPRISE: 0,
    },
    byStatus: {
      ACTIVE: 1,
    },
  },
  clients: {
    total: 1,
    newThisPeriod: 0,
  },
  content: {
    totalTests: 0,
    testsThisPeriod: 0,
    totalPrograms: 0,
    programsThisPeriod: 0,
  },
  activity: {
    totalWorkoutLogs: 0,
    workoutLogsThisPeriod: 0,
  },
  referrals: {
    totalCodes: 0,
    totalReferrals: 0,
    completedReferrals: 0,
    conversionRate: 0,
  },
  charts: {
    dailyRegistrations: [{ date: '2026-01-01', count: 1 }],
  },
} as const

async function fulfillJson(route: Route, data: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(data),
  })
}

export async function mockAdminStats(page: Page) {
  await page.route('**/api/admin/stats?*', async (route) => {
    await fulfillJson(route, {
      success: true,
      data: ADMIN_STATS_FIXTURE,
    })
  })
}

export async function mockAdminBusinesses(
  page: Page,
  businesses: Array<{ id: string; name: string }> = []
) {
  await page.route('**/api/admin/businesses?*', async (route) => {
    await fulfillJson(route, {
      success: true,
      data: {
        businesses,
        pagination: {
          page: 1,
          totalPages: 1,
          total: businesses.length,
        },
      },
    })
  })
}

export { fulfillJson }

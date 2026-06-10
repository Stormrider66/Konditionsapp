/**
 * Platform-admin bypass + ENTERPRISE unlimited sentinel in subscription gates.
 *
 * Both bugs have bitten before (commit 9e475b3c): gates that compute limits
 * directly block platform admins, and `maxAthletes === -1` (ENTERPRISE =
 * unlimited) reads as "limit reached" in naive comparisons. Pin the two
 * shared helpers all athlete-limit / PRO-tier gates now route through.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    subscription: { findUnique: vi.fn() },
    client: { findUnique: vi.fn() },
  },
}))

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

import { prisma } from '@/lib/prisma'
import { hasReachedAthleteLimit } from '@/lib/auth/subscription'
import { hasProTierAccess } from '@/lib/subscription/require-feature-access'

const COACH = { role: 'COACH', adminRole: null }
const ADMIN_ROLE = { role: 'ADMIN', adminRole: null }
const SUPPORT = { role: 'COACH', adminRole: 'SUPPORT' }

describe('hasReachedAthleteLimit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(prisma.user.findUnique).mockResolvedValue(COACH as never)
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue(null)
  })

  it('bypasses for role=ADMIN even when over the limit', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(ADMIN_ROLE as never)
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue({ maxAthletes: 50, currentAthletes: 53 } as never)
    expect(await hasReachedAthleteLimit('u1')).toBe(false)
  })

  it('bypasses for any non-null adminRole', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(SUPPORT as never)
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue({ maxAthletes: 5, currentAthletes: 5 } as never)
    expect(await hasReachedAthleteLimit('u1')).toBe(false)
  })

  it('treats maxAthletes === -1 as unlimited', async () => {
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue({ maxAthletes: -1, currentAthletes: 9999 } as never)
    expect(await hasReachedAthleteLimit('u1')).toBe(false)
  })

  it('treats a missing subscription as limit reached for regular coaches', async () => {
    expect(await hasReachedAthleteLimit('u1')).toBe(true)
  })

  it('blocks a regular coach at the limit and allows under it', async () => {
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue({ maxAthletes: 50, currentAthletes: 50 } as never)
    expect(await hasReachedAthleteLimit('u1')).toBe(true)
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue({ maxAthletes: 50, currentAthletes: 49 } as never)
    expect(await hasReachedAthleteLimit('u1')).toBe(false)
  })
})

describe('hasProTierAccess', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(prisma.user.findUnique).mockResolvedValue(COACH as never)
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue(null)
  })

  it('grants platform admins regardless of subscription', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(ADMIN_ROLE as never)
    expect(await hasProTierAccess('u1')).toBe(true)
    expect(prisma.subscription.findUnique).not.toHaveBeenCalled()
  })

  it('grants PRO and ENTERPRISE tiers', async () => {
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue({ tier: 'PRO' } as never)
    expect(await hasProTierAccess('u1')).toBe(true)
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue({ tier: 'ENTERPRISE' } as never)
    expect(await hasProTierAccess('u1')).toBe(true)
  })

  it('denies lower tiers and missing subscriptions for regular coaches', async () => {
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue({ tier: 'BASIC' } as never)
    expect(await hasProTierAccess('u1')).toBe(false)
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue(null)
    expect(await hasProTierAccess('u1')).toBe(false)
  })
})

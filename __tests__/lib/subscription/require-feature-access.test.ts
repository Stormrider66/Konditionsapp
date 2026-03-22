import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockCheckAthleteFeatureAccess = vi.hoisted(() => vi.fn())
const mockLoggerWarn = vi.hoisted(() => vi.fn())

vi.mock('@/lib/subscription/feature-access', () => ({
  checkAthleteFeatureAccess: mockCheckAthleteFeatureAccess,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    subscription: {
      findUnique: vi.fn(),
    },
  },
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    warn: mockLoggerWarn,
  },
}))

import { requireFeatureAccess } from '@/lib/subscription/require-feature-access'

describe('requireFeatureAccess', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('logs a warning when athlete feature access is denied', async () => {
    mockCheckAthleteFeatureAccess.mockResolvedValue({
      allowed: false,
      code: 'FEATURE_DISABLED',
      reason: 'Feature disabled',
      upgradeUrl: '/athlete/subscription',
    })

    const response = await requireFeatureAccess('client-1', 'nutrition_planning')
    const body = await response?.json()

    expect(response?.status).toBe(403)
    expect(body).toMatchObject({
      code: 'FEATURE_DISABLED',
      feature: 'nutrition_planning',
    })
    expect(mockLoggerWarn).toHaveBeenCalledWith(
      'Athlete feature access denied',
      expect.objectContaining({
        clientId: 'client-1',
        code: 'FEATURE_DISABLED',
        feature: 'nutrition_planning',
        reason: 'Feature disabled',
        upgradeUrl: '/athlete/subscription',
      })
    )
  })

  it('does not log when athlete feature access is allowed', async () => {
    mockCheckAthleteFeatureAccess.mockResolvedValue({ allowed: true })

    const response = await requireFeatureAccess('client-2', 'nutrition_planning')

    expect(response).toBeNull()
    expect(mockLoggerWarn).not.toHaveBeenCalled()
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockEnsureAthleteClientDefaultsTx = vi.hoisted(() => vi.fn())
const mockBuildSelfAthleteSubscriptionSeedForUser = vi.hoisted(() => vi.fn())

const mockPrisma = vi.hoisted(() => ({
  user: {
    findMany: vi.fn(),
  },
  client: {
    findMany: vi.fn(),
  },
  $transaction: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

vi.mock('@/lib/user-provisioning', () => ({
  buildAthleteSubscriptionSeedFromCoachSubscription: vi.fn((subscription: { tier: string; status: string; trialEndsAt: Date | null }) => {
    if (subscription.status === 'TRIAL') {
      return {
        tier: 'PRO',
        status: 'TRIAL',
        paymentSource: 'DIRECT',
        trialEndsAt: subscription.trialEndsAt,
      }
    }

    return {
      tier: subscription.tier === 'BASIC' ? 'STANDARD' : subscription.tier,
      status: subscription.status,
      paymentSource: 'DIRECT',
      trialEndsAt: null,
    }
  }),
  buildSelfAthleteSubscriptionSeedForUser: mockBuildSelfAthleteSubscriptionSeedForUser,
  ensureAthleteClientDefaultsTx: mockEnsureAthleteClientDefaultsTx,
}))

import {
  auditAthleteDataHealth,
  repairAthleteDataHealth,
} from '@/lib/data-health/athlete-integrity'

describe('athlete-integrity data health', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('audits missing athlete defaults and redundant coach subscriptions', async () => {
    mockPrisma.user.findMany.mockResolvedValue([
      {
        id: 'athlete-1',
        email: 'athlete@example.com',
        name: 'Athlete',
        role: 'ATHLETE',
        selfAthleteClientId: null,
        subscription: {
          tier: 'PRO',
          status: 'ACTIVE',
          trialEndsAt: null,
        },
        athleteAccount: {
          clientId: 'client-1',
          client: {
            id: 'client-1',
            athleteSubscription: null,
            agentPreferences: null,
            sportProfile: null,
          },
        },
      },
    ])
    mockPrisma.client.findMany.mockResolvedValue([])

    const report = await auditAthleteDataHealth()

    expect(report.summary.totalIssues).toBe(4)
    expect(report.summary.fixableIssues).toBe(4)
    expect(report.summary.byCode.ATHLETE_MISSING_SUBSCRIPTION).toBe(1)
    expect(report.summary.byCode.ATHLETE_MISSING_AGENT_PREFERENCES).toBe(1)
    expect(report.summary.byCode.ATHLETE_MISSING_SPORT_PROFILE).toBe(1)
    expect(report.summary.byCode.ATHLETE_REDUNDANT_COACH_SUBSCRIPTION).toBe(1)
  })

  it('marks conflicting bogus coach subscriptions as manual review', async () => {
    mockPrisma.user.findMany.mockResolvedValue([
      {
        id: 'athlete-2',
        email: 'athlete2@example.com',
        name: 'Athlete Two',
        role: 'ATHLETE',
        selfAthleteClientId: null,
        subscription: {
          tier: 'PRO',
          status: 'ACTIVE',
          trialEndsAt: null,
        },
        athleteAccount: {
          clientId: 'client-2',
          client: {
            id: 'client-2',
            athleteSubscription: {
              id: 'ath-sub-2',
              tier: 'FREE',
              status: 'ACTIVE',
              trialEndsAt: null,
            },
            agentPreferences: { id: 'prefs-2' },
            sportProfile: { id: 'sport-2' },
          },
        },
      },
    ])
    mockPrisma.client.findMany.mockResolvedValue([])

    const report = await auditAthleteDataHealth()

    expect(report.summary.totalIssues).toBe(1)
    expect(report.issues[0]).toMatchObject({
      code: 'ATHLETE_CONFLICTING_COACH_SUBSCRIPTION',
      fixable: false,
    })
  })

  it('repairs grouped client issues in one transaction', async () => {
    mockPrisma.user.findMany
      .mockResolvedValueOnce([
        {
          id: 'athlete-3',
          email: 'athlete3@example.com',
          name: 'Athlete Three',
          role: 'ATHLETE',
          selfAthleteClientId: null,
          subscription: {
            tier: 'PRO',
            status: 'ACTIVE',
            trialEndsAt: null,
          },
          athleteAccount: {
            clientId: 'client-3',
            client: {
              id: 'client-3',
              athleteSubscription: null,
              agentPreferences: null,
              sportProfile: null,
            },
          },
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'athlete-3',
          email: 'athlete3@example.com',
          name: 'Athlete Three',
          role: 'ATHLETE',
          selfAthleteClientId: null,
          subscription: null,
          athleteAccount: {
            clientId: 'client-3',
            client: {
              id: 'client-3',
              athleteSubscription: {
                id: 'ath-sub-3',
                tier: 'PRO',
                status: 'ACTIVE',
                trialEndsAt: null,
              },
              agentPreferences: { id: 'prefs-3' },
              sportProfile: { id: 'sport-3' },
            },
          },
        },
      ])

    mockPrisma.client.findMany.mockResolvedValue([])

    const tx = {
      subscription: {
        delete: vi.fn(),
      },
    }

    mockPrisma.$transaction.mockImplementation(async (callback: (tx: typeof tx) => Promise<unknown>) => callback(tx))

    const result = await repairAthleteDataHealth()

    expect(mockEnsureAthleteClientDefaultsTx).toHaveBeenCalledTimes(1)
    expect(mockEnsureAthleteClientDefaultsTx).toHaveBeenCalledWith(tx, 'client-3', {
      subscriptionSeed: {
        tier: 'PRO',
        status: 'ACTIVE',
        paymentSource: 'DIRECT',
        trialEndsAt: null,
      },
    })
    expect(tx.subscription.delete).toHaveBeenCalledWith({
      where: { userId: 'athlete-3' },
    })
    expect(result.targetedIssueCount).toBe(4)
    expect(result.repairedCount).toBe(1)
    expect(result.reportAfter.summary.totalIssues).toBe(0)
  })
})

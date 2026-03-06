import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockRequireAdmin = vi.hoisted(() => vi.fn())
const mockParsePagination = vi.hoisted(() => vi.fn())
const mockLogRoleChange = vi.hoisted(() => vi.fn())
const mockLogAuditEvent = vi.hoisted(() => vi.fn())
const mockGetIpFromRequest = vi.hoisted(() => vi.fn())
const mockGetUserAgentFromRequest = vi.hoisted(() => vi.fn())
const mockEnsureAthleteClientDefaultsTx = vi.hoisted(() => vi.fn())

const mockPrisma = vi.hoisted(() => ({
  $transaction: vi.fn(),
  user: {
    findMany: vi.fn(),
    count: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  subscription: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
  },
  athleteSubscription: {
    findUnique: vi.fn(),
    create: vi.fn(),
    upsert: vi.fn(),
  },
  athleteAccount: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  client: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
  },
  businessMember: {
    findFirst: vi.fn(),
  },
}))

vi.mock('@/lib/auth-utils', () => ({
  requireAdmin: mockRequireAdmin,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

vi.mock('@/lib/utils/parse', () => ({
  parsePagination: mockParsePagination,
}))

vi.mock('@/lib/audit/log', () => ({
  logRoleChange: mockLogRoleChange,
  logAuditEvent: mockLogAuditEvent,
  getIpFromRequest: mockGetIpFromRequest,
  getUserAgentFromRequest: mockGetUserAgentFromRequest,
}))

vi.mock('@/lib/user-provisioning', () => ({
  ensureAthleteClientDefaultsTx: mockEnsureAthleteClientDefaultsTx,
}))

vi.mock('@/lib/subscription/feature-access', () => ({
  ATHLETE_TIER_FEATURES: {
    FREE: {
      ai_chat: { enabled: true, limit: 10 },
      video_analysis: { enabled: false },
      strava: { enabled: false },
      garmin: { enabled: false },
    },
    STANDARD: {
      ai_chat: { enabled: true, limit: 50 },
      video_analysis: { enabled: false },
      strava: { enabled: true },
      garmin: { enabled: true },
    },
    PRO: {
      ai_chat: { enabled: true, limit: -1 },
      video_analysis: { enabled: true },
      strava: { enabled: true },
      garmin: { enabled: true },
    },
    ELITE: {
      ai_chat: { enabled: true, limit: -1 },
      video_analysis: { enabled: true },
      strava: { enabled: true },
      garmin: { enabled: true },
    },
  },
}))

import { GET, PUT } from '@/app/api/admin/users/route'

describe('admin users route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdmin.mockResolvedValue({ id: 'admin-1' })
    mockParsePagination.mockReturnValue({ page: 1, limit: 20, skip: 0 })
    mockGetIpFromRequest.mockReturnValue('127.0.0.1')
    mockGetUserAgentFromRequest.mockReturnValue('vitest')
    mockEnsureAthleteClientDefaultsTx.mockResolvedValue(undefined)
    mockPrisma.$transaction.mockImplementation(async (callback: (tx: typeof mockPrisma) => Promise<unknown>) => callback(mockPrisma as any))
  })

  it('GET returns athlete subscription tier for athlete users', async () => {
    mockPrisma.user.findMany.mockResolvedValue([
      {
        id: 'user-1',
        email: 'athlete@example.com',
        name: 'Athlete User',
        role: 'ATHLETE',
        adminRole: null,
        language: 'sv',
        createdAt: new Date('2026-03-05T00:00:00Z'),
        updatedAt: new Date('2026-03-05T00:00:00Z'),
        subscription: {
          tier: 'PRO',
          status: 'ACTIVE',
          maxAthletes: 100,
          stripeCurrentPeriodEnd: null,
        },
        athleteAccount: {
          clientId: 'client-1',
          client: {
            athleteSubscription: {
              tier: 'FREE',
              status: 'ACTIVE',
              trialEndsAt: null,
            },
          },
        },
        businessMemberships: [],
        _count: {
          clients: 1,
        },
      },
    ])
    mockPrisma.user.count.mockResolvedValue(1)

    const response = await GET(new NextRequest('http://localhost/api/admin/users'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.data.users[0].subscription).toEqual({
      tier: 'FREE',
      status: 'ACTIVE',
      maxAthletes: null,
      stripeCurrentPeriodEnd: null,
    })
  })

  it('PUT updates athlete subscription for athlete tiers', async () => {
    mockPrisma.athleteAccount.findUnique.mockResolvedValue({ clientId: 'client-1' })
    mockPrisma.athleteSubscription.findUnique.mockResolvedValue({ id: 'sub-1' })

    mockPrisma.user.findUnique
      .mockResolvedValueOnce({
        role: 'ATHLETE',
        adminRole: null,
        subscription: { tier: 'PRO' },
        athleteAccount: {
          clientId: 'client-1',
          client: {
            athleteSubscription: { tier: 'FREE' },
          },
        },
      })
      .mockResolvedValueOnce({
        id: 'user-1',
        email: 'athlete@example.com',
        name: 'Athlete User',
        role: 'ATHLETE',
        subscription: { tier: 'PRO', status: 'ACTIVE', maxAthletes: 100 },
        athleteAccount: {
          client: {
            athleteSubscription: { tier: 'STANDARD', status: 'ACTIVE' },
          },
        },
      })

    const request = new NextRequest('http://localhost/api/admin/users', {
      method: 'PUT',
      body: JSON.stringify({
        userId: '11111111-1111-4111-8111-111111111111',
        tier: 'STANDARD',
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const response = await PUT(request)
    const body = await response.json()

    expect(mockPrisma.athleteSubscription.upsert).toHaveBeenCalledWith({
      where: { clientId: 'client-1' },
      update: {
        tier: 'STANDARD',
        status: 'ACTIVE',
        trialEndsAt: null,
        aiChatEnabled: true,
        aiChatMessagesLimit: 50,
        videoAnalysisEnabled: false,
        garminEnabled: true,
        stravaEnabled: true,
        workoutLoggingEnabled: true,
        dailyCheckInEnabled: true,
      },
      create: {
        clientId: 'client-1',
        paymentSource: 'DIRECT',
        tier: 'STANDARD',
        status: 'ACTIVE',
        trialEndsAt: null,
        aiChatEnabled: true,
        aiChatMessagesLimit: 50,
        videoAnalysisEnabled: false,
        garminEnabled: true,
        stravaEnabled: true,
        workoutLoggingEnabled: true,
        dailyCheckInEnabled: true,
      },
    })
    expect(mockPrisma.subscription.upsert).not.toHaveBeenCalled()
    expect(body.data.subscription).toEqual({
      tier: 'STANDARD',
      status: 'ACTIVE',
      maxAthletes: null,
    })
  })
})

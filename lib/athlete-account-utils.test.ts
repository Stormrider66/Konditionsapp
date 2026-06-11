import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockCreateSupabaseUser = vi.hoisted(() => vi.fn())
const mockDeleteSupabaseUser = vi.hoisted(() => vi.fn())

const mockTx = vi.hoisted(() => ({
  user: {
    create: vi.fn(),
  },
  athleteAccount: {
    create: vi.fn(),
  },
  athleteSubscription: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  agentPreferences: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  sportProfile: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  subscription: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  businessMember: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
}))

const mockPrisma = vi.hoisted(() => ({
  client: {
    findUnique: vi.fn(),
  },
  athleteAccount: {
    findUnique: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
  },
  $transaction: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminSupabaseClient: vi.fn(() => ({
    auth: {
      admin: {
        createUser: mockCreateSupabaseUser,
        deleteUser: mockDeleteSupabaseUser,
      },
    },
  })),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

import { createAthleteAccountForClient } from '@/lib/athlete-account-utils'

describe('createAthleteAccountForClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockPrisma.client.findUnique.mockResolvedValue({
      id: 'client-1',
      name: 'Athlete Example',
      email: 'athlete@example.com',
    })
    mockPrisma.athleteAccount.findUnique.mockResolvedValue(null)
    mockPrisma.user.findUnique.mockImplementation(async ({ where }: { where: { email?: string; id?: string } }) => {
      if (where.email) return null
      if (where.id === 'coach-1') return { id: 'coach-1', language: 'sv' }
      return null
    })

    mockCreateSupabaseUser.mockResolvedValue({
      data: { user: { id: 'athlete-user-1' } },
      error: null,
    })
    mockDeleteSupabaseUser.mockResolvedValue({})

    mockPrisma.$transaction.mockImplementation(async (callback: (tx: typeof mockTx) => unknown) => callback(mockTx))

    mockTx.user.create.mockResolvedValue({
      id: 'athlete-user-1',
      email: 'athlete@example.com',
      name: 'Athlete Example',
      role: 'ATHLETE',
      language: 'sv',
    })
    mockTx.athleteAccount.create.mockResolvedValue({
      id: 'aa-1',
      clientId: 'client-1',
      userId: 'athlete-user-1',
      client: { id: 'client-1', name: 'Athlete Example' },
      user: { id: 'athlete-user-1', email: 'athlete@example.com' },
    })
    mockTx.athleteSubscription.findUnique.mockResolvedValue(null)
    mockTx.agentPreferences.findUnique.mockResolvedValue(null)
    mockTx.sportProfile.findUnique.mockResolvedValue(null)
    mockTx.subscription.findUnique.mockResolvedValue({ userId: 'coach-1' })
    mockTx.subscription.update.mockResolvedValue({})
    mockTx.businessMember.findUnique.mockResolvedValue(null)
    mockTx.businessMember.create.mockResolvedValue({})
  })

  it('creates athlete subscription, preferences, and sport profile for coach-created accounts', async () => {
    const result = await createAthleteAccountForClient('client-1', 'coach-1')

    expect(result.success).toBe(true)
    expect(mockTx.athleteSubscription.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        clientId: 'client-1',
        tier: 'STANDARD',
        status: 'TRIAL',
        paymentSource: 'DIRECT',
        businessId: null,
        customAiAllowanceSek: null,
        aiChatEnabled: true,
        aiChatMessagesLimit: -1,
        videoAnalysisEnabled: false,
        garminEnabled: true,
        stravaEnabled: true,
        workoutLoggingEnabled: true,
        dailyCheckInEnabled: true,
        trialEndsAt: expect.any(Date),
      }),
    })
    expect(mockTx.agentPreferences.create).toHaveBeenCalledWith({
      data: {
        clientId: 'client-1',
        autonomyLevel: 'ADVISORY',
        allowWorkoutModification: false,
        allowRestDayInjection: false,
        maxIntensityReduction: 10,
        dailyBriefingEnabled: false,
        proactiveNudgesEnabled: false,
      },
    })
    expect(mockTx.sportProfile.create).toHaveBeenCalledWith({
      data: {
        clientId: 'client-1',
        primarySport: 'RUNNING',
        onboardingCompleted: false,
        onboardingStep: 0,
      },
    })
  })

  it('does NOT create a BusinessMember when the parent client has no businessId', async () => {
    // Default mock has no businessId on the client → independent coach path.
    await createAthleteAccountForClient('client-1', 'coach-1')
    expect(mockTx.businessMember.create).not.toHaveBeenCalled()
  })

  it('auto-adds the new athlete user as a BusinessMember when client.businessId is set', async () => {
    mockPrisma.client.findUnique.mockResolvedValueOnce({
      id: 'client-1',
      name: 'Athlete Example',
      email: 'athlete@example.com',
      businessId: 'biz-1',
    })

    await createAthleteAccountForClient('client-1', 'coach-1')

    expect(mockTx.businessMember.findUnique).toHaveBeenCalledWith({
      where: {
        businessId_userId: {
          businessId: 'biz-1',
          userId: 'athlete-user-1',
        },
      },
      select: { id: true },
    })
    expect(mockTx.businessMember.create).toHaveBeenCalledWith({
      data: {
        businessId: 'biz-1',
        userId: 'athlete-user-1',
        role: 'MEMBER',
        isActive: true,
        acceptedAt: expect.any(Date),
      },
    })
  })

  it('honors a coach-supplied tier override (FREE) instead of defaulting to STANDARD/trial', async () => {
    await createAthleteAccountForClient('client-1', 'coach-1', { tier: 'FREE' })

    expect(mockTx.athleteSubscription.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tier: 'FREE',
        status: 'ACTIVE',
        trialEndsAt: null,
        workoutLoggingEnabled: false,
        dailyCheckInEnabled: false,
      }),
    })
  })
})

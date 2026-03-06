import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockGetUser = vi.hoisted(() => vi.fn())
const mockDeleteUser = vi.hoisted(() => vi.fn())
const mockCreateSelfAthleteProfileTx = vi.hoisted(() => vi.fn())
const mockGetCoachTrialSubscriptionData = vi.hoisted(() => vi.fn())
const mockSendWelcomeEmail = vi.hoisted(() => vi.fn())

const mockPrisma = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
  },
  $transaction: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: mockGetUser,
    },
  }),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminSupabaseClient: vi.fn(() => ({
    auth: {
      admin: {
        deleteUser: mockDeleteUser,
      },
    },
  })),
}))

vi.mock('@/lib/user-provisioning', () => ({
  createSelfAthleteProfileTx: mockCreateSelfAthleteProfileTx,
  getCoachTrialSubscriptionData: mockGetCoachTrialSubscriptionData,
}))

vi.mock('@/lib/email', () => ({
  sendWelcomeEmail: mockSendWelcomeEmail,
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

import { POST } from '@/app/api/auth/signup-coach/route'

describe('signup-coach route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: 'auth-coach-1',
          email: 'coach@example.com',
        },
      },
    })
    mockDeleteUser.mockResolvedValue({})
    mockGetCoachTrialSubscriptionData.mockReturnValue({
      userId: 'auth-coach-1',
      tier: 'FREE',
      status: 'TRIAL',
      maxAthletes: 1,
      trialEndsAt: new Date('2026-03-20T00:00:00.000Z'),
    })
    mockSendWelcomeEmail.mockResolvedValue(undefined)
  })

  it('creates a coach user and optional self-athlete profile', async () => {
    mockPrisma.user.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)

    const tx = {
      user: {
        create: vi.fn().mockResolvedValue({
          id: 'auth-coach-1',
          email: 'coach@example.com',
          name: 'Coach Example',
        }),
        update: vi.fn(),
      },
      subscription: {
        create: vi.fn().mockResolvedValue({ id: 'sub-1' }),
      },
    }

    mockPrisma.$transaction.mockImplementation(async (callback: (tx: typeof tx) => Promise<unknown>) => callback(tx))

    const request = new NextRequest('http://localhost/api/auth/signup-coach', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Coach Example',
        createAthleteProfile: true,
        gender: 'MALE',
        birthDate: '1990-01-01T00:00:00.000Z',
        height: 180,
        weight: 78,
      }),
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(201)
    expect(tx.user.create).toHaveBeenCalledWith({
      data: {
        id: 'auth-coach-1',
        email: 'coach@example.com',
        name: 'Coach Example',
        role: 'COACH',
        language: 'sv',
      },
    })
    expect(tx.subscription.create).toHaveBeenCalledWith({
      data: {
        userId: 'auth-coach-1',
        tier: 'FREE',
        status: 'TRIAL',
        maxAthletes: 1,
        trialEndsAt: new Date('2026-03-20T00:00:00.000Z'),
      },
    })
    expect(mockCreateSelfAthleteProfileTx).toHaveBeenCalledWith(tx, {
      userId: 'auth-coach-1',
      name: 'Coach Example',
      email: 'coach@example.com',
      gender: 'MALE',
      birthDate: new Date('1990-01-01T00:00:00.000Z'),
      height: 180,
      weight: 78,
      subscriptionSeed: {
        tier: 'PRO',
        status: 'TRIAL',
        paymentSource: 'DIRECT',
        trialEndsAt: new Date('2026-03-20T00:00:00.000Z'),
      },
    })
    expect(mockSendWelcomeEmail).toHaveBeenCalledWith('coach@example.com', 'Coach Example', 'sv')
    expect(body.data).toEqual({
      id: 'auth-coach-1',
      role: 'COACH',
    })
  })

  it('validates athlete profile fields when self-athlete setup is requested', async () => {
    const request = new NextRequest('http://localhost/api/auth/signup-coach', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Coach Example',
        createAthleteProfile: true,
      }),
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toBe('Invalid input')
    expect(mockPrisma.$transaction).not.toHaveBeenCalled()
    expect(mockCreateSelfAthleteProfileTx).not.toHaveBeenCalled()
  })
})

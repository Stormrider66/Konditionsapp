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

import { POST } from '@/app/api/auth/signup-physio/route'

describe('signup-physio route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: 'auth-physio-1',
          email: 'physio@example.com',
        },
      },
    })
    mockDeleteUser.mockResolvedValue({})
    mockGetCoachTrialSubscriptionData.mockReturnValue({
      userId: 'auth-physio-1',
      tier: 'FREE',
      status: 'TRIAL',
      maxAthletes: 1,
      trialEndsAt: new Date('2026-03-20T00:00:00.000Z'),
    })
    mockSendWelcomeEmail.mockResolvedValue(undefined)
  })

  it('creates a physio user and optional self-athlete profile', async () => {
    mockPrisma.user.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)

    const tx = {
      user: {
        create: vi.fn().mockResolvedValue({
          id: 'auth-physio-1',
          email: 'physio@example.com',
          name: 'Physio Example',
        }),
        update: vi.fn(),
      },
      subscription: {
        create: vi.fn().mockResolvedValue({ id: 'sub-1' }),
      },
    }

    mockPrisma.$transaction.mockImplementation(async (callback: (tx: typeof tx) => Promise<unknown>) => callback(tx))

    const request = new NextRequest('http://localhost/api/auth/signup-physio', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Physio Example',
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
        id: 'auth-physio-1',
        email: 'physio@example.com',
        name: 'Physio Example',
        role: 'PHYSIO',
        language: 'sv',
      },
    })
    expect(mockCreateSelfAthleteProfileTx).toHaveBeenCalled()
    expect(body.data).toEqual({
      id: 'auth-physio-1',
      role: 'PHYSIO',
    })
  })

  it('validates athlete profile fields when self-athlete setup is requested', async () => {
    const request = new NextRequest('http://localhost/api/auth/signup-physio', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Physio Example',
        createAthleteProfile: true,
      }),
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toBe('Invalid input')
    expect(mockPrisma.$transaction).not.toHaveBeenCalled()
  })
})

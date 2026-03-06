import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockRateLimitJsonResponse = vi.hoisted(() => vi.fn())
const mockGetRequestIp = vi.hoisted(() => vi.fn())
const mockCreateCheckoutSession = vi.hoisted(() => vi.fn())
const mockSignUp = vi.hoisted(() => vi.fn())

const mockPrisma = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
  },
  invitation: {
    findUnique: vi.fn(),
  },
  $transaction: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

vi.mock('@/lib/api/rate-limit', () => ({
  rateLimitJsonResponse: mockRateLimitJsonResponse,
  getRequestIp: mockGetRequestIp,
}))

vi.mock('@/lib/payments/stripe', () => ({
  createCheckoutSession: mockCreateCheckoutSession,
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      signUp: mockSignUp,
    },
  }),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

import { POST } from '@/app/api/auth/signup-athlete/route'

describe('signup-athlete route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetRequestIp.mockReturnValue('127.0.0.1')
    mockRateLimitJsonResponse.mockResolvedValue(null)
    mockPrisma.invitation.findUnique.mockResolvedValue(null)
  })

  it('keeps new signups on free tier while starting paid checkout', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null)
    mockSignUp.mockResolvedValue({
      data: {
        user: { id: 'auth-user-1' },
      },
      error: null,
    })

    const tx = {
      user: {
        create: vi.fn().mockResolvedValue({
          id: 'auth-user-1',
          email: 'athlete@example.com',
          name: 'Athlete Example',
          role: 'ATHLETE',
        }),
      },
      client: {
        create: vi.fn().mockResolvedValue({
          id: 'client-1',
          name: 'Athlete Example',
          isDirect: true,
        }),
      },
      athleteSubscription: {
        create: vi.fn().mockResolvedValue({
          id: 'sub-1',
          tier: 'FREE',
        }),
      },
      agentPreferences: {
        create: vi.fn().mockResolvedValue({ id: 'prefs-1' }),
      },
      sportProfile: {
        create: vi.fn().mockResolvedValue({ id: 'sport-1' }),
      },
      athleteAccount: {
        create: vi.fn().mockResolvedValue({ id: 'account-1' }),
      },
      invitation: {
        update: vi.fn(),
      },
    }

    mockPrisma.$transaction.mockImplementation(async (callback: (tx: typeof tx) => Promise<unknown>) => callback(tx))
    mockCreateCheckoutSession.mockResolvedValue('https://stripe.test/session')

    const request = new NextRequest('http://localhost/api/auth/signup-athlete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        origin: 'http://localhost:3000',
      },
      body: JSON.stringify({
        email: 'athlete@example.com',
        password: 'password123',
        name: 'Athlete Example',
        tier: 'PRO',
        aiCoached: true,
      }),
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(201)
    expect(tx.athleteSubscription.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        clientId: 'client-1',
        tier: 'FREE',
        status: 'ACTIVE',
        paymentSource: 'DIRECT',
        aiChatEnabled: true,
        aiChatMessagesLimit: 10,
      }),
    })
    expect(mockCreateCheckoutSession).toHaveBeenCalledWith(
      'client-1',
      'PRO',
      'MONTHLY',
      'http://localhost:3000/athlete/onboarding?upgraded=true',
      'http://localhost:3000/athlete/onboarding',
    )
    expect(body.subscription.tier).toBe('FREE')
    expect(body.redirectUrl).toBe('https://stripe.test/session')
  })

  it('rejects duplicate emails before creating auth users', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'existing-user',
    })

    const request = new NextRequest('http://localhost/api/auth/signup-athlete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'athlete@example.com',
        password: 'password123',
        name: 'Athlete Example',
      }),
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toBe('An account with this email already exists')
    expect(mockSignUp).not.toHaveBeenCalled()
  })
})

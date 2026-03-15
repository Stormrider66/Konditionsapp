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
  business: {
    findFirst: vi.fn(),
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
    mockPrisma.business.findFirst.mockResolvedValue(null)
    mockPrisma.invitation.findUnique.mockResolvedValue(null)
  })

  it('provisions selected paid tier directly during beta signup', async () => {
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
          tier: 'PRO',
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
        tier: 'PRO',
        status: 'ACTIVE',
        paymentSource: 'DIRECT',
        aiChatEnabled: true,
        aiChatMessagesLimit: -1,
        videoAnalysisEnabled: true,
        garminEnabled: true,
        stravaEnabled: true,
        workoutLoggingEnabled: true,
        dailyCheckInEnabled: true,
      }),
    })
    expect(mockCreateCheckoutSession).not.toHaveBeenCalled()
    expect(body.subscription.tier).toBe('PRO')
    expect(body.redirectUrl).toBe('/athlete/onboarding')
  })

  it('links athlete to selected business and returns branded onboarding redirect', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null)
    mockPrisma.business.findFirst.mockResolvedValue({
      id: 'business-1',
      slug: 'star-by-thomson',
      type: 'GYM',
    })
    mockSignUp.mockResolvedValue({
      data: {
        user: { id: 'auth-user-3' },
      },
      error: null,
    })

    const tx = {
      user: {
        create: vi.fn().mockResolvedValue({
          id: 'auth-user-3',
          email: 'gymathlete@example.com',
          name: 'Gym Athlete',
          role: 'ATHLETE',
        }),
      },
      client: {
        create: vi.fn().mockResolvedValue({
          id: 'client-3',
          name: 'Gym Athlete',
          isDirect: true,
        }),
      },
      athleteSubscription: {
        create: vi.fn().mockResolvedValue({
          id: 'sub-3',
          tier: 'FREE',
        }),
      },
      agentPreferences: {
        create: vi.fn().mockResolvedValue({ id: 'prefs-3' }),
      },
      sportProfile: {
        create: vi.fn().mockResolvedValue({ id: 'sport-3' }),
      },
      athleteAccount: {
        create: vi.fn().mockResolvedValue({ id: 'account-3' }),
      },
      businessMember: {
        create: vi.fn().mockResolvedValue({ id: 'membership-1' }),
      },
      invitation: {
        update: vi.fn(),
      },
    }

    mockPrisma.$transaction.mockImplementation(async (callback: (tx: typeof tx) => Promise<unknown>) => callback(tx))

    const request = new NextRequest('http://localhost/api/auth/signup-athlete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        origin: 'http://localhost:3000',
      },
      body: JSON.stringify({
        email: 'gymathlete@example.com',
        password: 'password123',
        name: 'Gym Athlete',
        tier: 'FREE',
        businessId: '11111111-1111-4111-8111-111111111111',
      }),
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(201)
    expect(tx.client.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'auth-user-3',
        businessId: 'business-1',
        name: 'Gym Athlete',
        email: 'gymathlete@example.com',
      }),
    })
    expect(tx.businessMember.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        businessId: 'business-1',
        userId: 'auth-user-3',
        role: 'MEMBER',
      }),
    })
    expect(body.redirectUrl).toBe('/star-by-thomson/athlete/onboarding')
  })

  it('accepts BASIC as a legacy alias for STANDARD during signup', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null)
    mockSignUp.mockResolvedValue({
      data: {
        user: { id: 'auth-user-2' },
      },
      error: null,
    })

    const tx = {
      user: {
        create: vi.fn().mockResolvedValue({
          id: 'auth-user-2',
          email: 'basic@example.com',
          name: 'Basic Athlete',
          role: 'ATHLETE',
        }),
      },
      client: {
        create: vi.fn().mockResolvedValue({
          id: 'client-2',
          name: 'Basic Athlete',
          isDirect: true,
        }),
      },
      athleteSubscription: {
        create: vi.fn().mockResolvedValue({
          id: 'sub-2',
          tier: 'STANDARD',
        }),
      },
      agentPreferences: {
        create: vi.fn().mockResolvedValue({ id: 'prefs-2' }),
      },
      sportProfile: {
        create: vi.fn().mockResolvedValue({ id: 'sport-2' }),
      },
      athleteAccount: {
        create: vi.fn().mockResolvedValue({ id: 'account-2' }),
      },
      invitation: {
        update: vi.fn(),
      },
    }

    mockPrisma.$transaction.mockImplementation(async (callback: (tx: typeof tx) => Promise<unknown>) => callback(tx))

    const request = new NextRequest('http://localhost/api/auth/signup-athlete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        origin: 'http://localhost:3000',
      },
      body: JSON.stringify({
        email: 'basic@example.com',
        password: 'password123',
        name: 'Basic Athlete',
        tier: 'BASIC',
      }),
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(201)
    expect(tx.athleteSubscription.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        clientId: 'client-2',
        tier: 'STANDARD',
        aiChatEnabled: true,
        aiChatMessagesLimit: 50,
        videoAnalysisEnabled: false,
        garminEnabled: true,
        stravaEnabled: true,
        workoutLoggingEnabled: true,
        dailyCheckInEnabled: true,
      }),
    })
    expect(mockCreateCheckoutSession).not.toHaveBeenCalled()
    expect(body.subscription.tier).toBe('STANDARD')
    expect(body.redirectUrl).toBe('/athlete/onboarding')
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

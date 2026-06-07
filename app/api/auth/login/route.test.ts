import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

const mockRateLimitJsonResponse = vi.hoisted(() => vi.fn())
const mockGetRequestIp = vi.hoisted(() => vi.fn())
const mockLogAuthEvent = vi.hoisted(() => vi.fn())
const mockSignInWithPassword = vi.hoisted(() => vi.fn())

vi.mock('@/lib/api/rate-limit', () => ({
  rateLimitJsonResponse: mockRateLimitJsonResponse,
  getRequestIp: mockGetRequestIp,
}))

vi.mock('@/lib/auth/auth-events', () => ({
  logAuthEvent: mockLogAuthEvent,
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      signInWithPassword: mockSignInWithPassword,
    },
  }),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}))

import { POST } from '@/app/api/auth/login/route'

function loginRequest(body: unknown) {
  return new NextRequest('http://localhost/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'user-agent': 'vitest',
    },
    body: JSON.stringify(body),
  })
}

describe('auth login route', () => {
  beforeEach(() => {
    mockRateLimitJsonResponse.mockReset()
    mockGetRequestIp.mockReset()
    mockLogAuthEvent.mockReset()
    mockSignInWithPassword.mockReset()
    mockGetRequestIp.mockReturnValue('127.0.0.1')
    mockRateLimitJsonResponse.mockResolvedValue(null)
    mockLogAuthEvent.mockResolvedValue(undefined)
    mockSignInWithPassword.mockResolvedValue({
      data: { user: { id: 'auth-user-1' } },
      error: null,
    })
  })

  it('rate limits by IP before calling Supabase Auth', async () => {
    mockRateLimitJsonResponse.mockResolvedValueOnce(
      NextResponse.json({ error: 'RATE_LIMIT_EXCEEDED' }, { status: 429 })
    )

    const response = await POST(loginRequest({
      email: 'athlete@example.com',
      password: 'password123',
    }))

    expect(response.status).toBe(429)
    expect(mockSignInWithPassword).not.toHaveBeenCalled()
    expect(mockLogAuthEvent).not.toHaveBeenCalled()
  })

  it('rate limits by normalized email before calling Supabase Auth', async () => {
    mockRateLimitJsonResponse
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(
        NextResponse.json({ error: 'RATE_LIMIT_EXCEEDED' }, { status: 429 })
      )

    const response = await POST(loginRequest({
      email: ' Athlete@Example.COM ',
      password: 'password123',
    }))

    expect(response.status).toBe(429)
    expect(mockRateLimitJsonResponse).toHaveBeenNthCalledWith(
      2,
      'auth:login:email',
      'athlete@example.com',
      { limit: 6, windowSeconds: 900 }
    )
    expect(mockSignInWithPassword).not.toHaveBeenCalled()
    expect(mockLogAuthEvent).not.toHaveBeenCalled()
  })

  it('logs failed credentials and returns a generic 401', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid login credentials' },
    })

    const response = await POST(loginRequest({
      email: 'athlete@example.com',
      password: 'wrong-password',
    }))
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body).toEqual({ error: 'INVALID_CREDENTIALS' })
    expect(mockLogAuthEvent).toHaveBeenCalledWith(expect.objectContaining({
      eventType: 'LOGIN_FAILURE',
      email: 'athlete@example.com',
      failureReason: 'Invalid login credentials',
    }))
  })

  it('logs successful login after Supabase Auth accepts credentials', async () => {
    const response = await POST(loginRequest({
      email: 'athlete@example.com',
      password: 'password123',
    }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({ success: true })
    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: 'athlete@example.com',
      password: 'password123',
    })
    expect(mockLogAuthEvent).toHaveBeenCalledWith(expect.objectContaining({
      eventType: 'LOGIN_SUCCESS',
      userId: 'auth-user-1',
      email: 'athlete@example.com',
    }))
  })
})

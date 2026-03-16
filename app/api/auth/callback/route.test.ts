import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockExchangeCodeForSession = vi.hoisted(() => vi.fn())
const mockVerifyOtp = vi.hoisted(() => vi.fn())
const mockCookieStore = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(),
}))

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      exchangeCodeForSession: mockExchangeCodeForSession,
      verifyOtp: mockVerifyOtp,
    },
  })),
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => mockCookieStore),
}))

import { GET } from '@/app/api/auth/callback/route'

describe('auth callback route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockExchangeCodeForSession.mockResolvedValue({ error: null })
    mockVerifyOtp.mockResolvedValue({ error: null })
  })

  it('exchanges a PKCE code and redirects to the next path', async () => {
    const request = new NextRequest(
      'http://localhost/api/auth/callback?code=pkce-code&next=/reset-password'
    )

    const response = await GET(request)

    expect(mockExchangeCodeForSession).toHaveBeenCalledWith('pkce-code')
    expect(mockVerifyOtp).not.toHaveBeenCalled()
    expect(response.headers.get('location')).toBe('http://localhost/reset-password')
  })

  it('verifies recovery token callbacks and redirects to the reset page', async () => {
    const request = new NextRequest(
      'http://localhost/api/auth/callback?token_hash=recovery-hash&type=recovery&next=/reset-password'
    )

    const response = await GET(request)

    expect(mockVerifyOtp).toHaveBeenCalledWith({
      token_hash: 'recovery-hash',
      type: 'recovery',
    })
    expect(mockExchangeCodeForSession).not.toHaveBeenCalled()
    expect(response.headers.get('location')).toBe('http://localhost/reset-password')
  })

  it('rejects unsafe next redirects', async () => {
    const request = new NextRequest(
      'http://localhost/api/auth/callback?code=pkce-code&next=https://evil.example'
    )

    const response = await GET(request)

    expect(response.headers.get('location')).toBe('http://localhost/login')
  })

  it('redirects to login with an error when verification fails', async () => {
    mockVerifyOtp.mockResolvedValue({
      error: { message: 'invalid token' },
    })

    const request = new NextRequest(
      'http://localhost/api/auth/callback?token_hash=bad-hash&type=recovery&next=/reset-password'
    )

    const response = await GET(request)

    expect(response.headers.get('location')).toBe(
      'http://localhost/login?error=auth_callback_failed'
    )
  })
})

import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import {
  getVerifiedLoadTestBypassEmail,
  isVerifiedLoadTestBypassRequest,
} from '@/lib/load-test-bypass'

const ORIGINAL_ENV = { ...process.env }

function request(url: string, headers: Record<string, string> = {}) {
  return new NextRequest(url, { headers })
}

describe('load-test bypass', () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV }
    vi.stubEnv('NODE_ENV', 'test')
    delete process.env.ENABLE_LOAD_TEST_BYPASS
    delete process.env.LOAD_TEST_BYPASS_SECRET
    delete process.env.LOAD_TEST_BYPASS_USER_EMAIL
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    process.env = { ...ORIGINAL_ENV }
  })

  it('rejects forged forwarded email when bypass is not explicitly enabled', () => {
    const req = request('http://localhost:3000/api/calendar/unified', {
      'x-auth-user-email': 'attacker@example.com',
    })

    expect(getVerifiedLoadTestBypassEmail(req)).toBeNull()
  })

  it('rejects the old default bypass secret', () => {
    process.env.ENABLE_LOAD_TEST_BYPASS = 'true'
    process.env.LOAD_TEST_BYPASS_SECRET = 'local-k6-bypass-secret'

    const req = request('http://localhost:3000/api/calendar/unified', {
      'x-load-test-secret': 'local-k6-bypass-secret',
      'x-auth-user-email': 'load@example.com',
    })

    expect(isVerifiedLoadTestBypassRequest(req)).toBe(false)
    expect(getVerifiedLoadTestBypassEmail(req)).toBeNull()
  })

  it('accepts a non-default secret on a local URL when explicitly enabled', () => {
    process.env.ENABLE_LOAD_TEST_BYPASS = 'true'
    process.env.LOAD_TEST_BYPASS_SECRET = 'test-secret-123'

    const req = request('http://127.0.0.1:3000/api/calendar/unified', {
      'x-load-test-secret': 'test-secret-123',
      'x-auth-user-email': 'load@example.com',
    })

    expect(isVerifiedLoadTestBypassRequest(req)).toBe(true)
    expect(getVerifiedLoadTestBypassEmail(req)).toBe('load@example.com')
  })

  it('accepts local production-build requests when explicitly enabled', () => {
    vi.stubEnv('NODE_ENV', 'production')
    process.env.ENABLE_LOAD_TEST_BYPASS = 'true'
    process.env.LOAD_TEST_BYPASS_SECRET = 'test-secret-123'

    const req = request('http://localhost:3000/api/calendar/unified', {
      'x-load-test-secret': 'test-secret-123',
      'x-auth-user-email': 'load@example.com',
    })

    expect(isVerifiedLoadTestBypassRequest(req)).toBe(true)
    expect(getVerifiedLoadTestBypassEmail(req)).toBe('load@example.com')
  })

  it('does not trust x-forwarded-host to fake localhost', () => {
    process.env.ENABLE_LOAD_TEST_BYPASS = 'true'
    process.env.LOAD_TEST_BYPASS_SECRET = 'test-secret-123'

    const req = request('https://trainomics.app/api/calendar/unified', {
      'x-forwarded-host': 'localhost:3000',
      'x-load-test-secret': 'test-secret-123',
      'x-auth-user-email': 'load@example.com',
    })

    expect(isVerifiedLoadTestBypassRequest(req)).toBe(false)
    expect(getVerifiedLoadTestBypassEmail(req)).toBeNull()
  })
})

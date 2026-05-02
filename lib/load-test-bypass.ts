import type { NextRequest } from 'next/server'

const DEFAULT_LOAD_TEST_SECRET = 'local-k6-bypass-secret'

function isLocalHostname(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1'
}

export function isLoadTestBypassEnabled(request: NextRequest): boolean {
  if (process.env.NODE_ENV === 'production') return false
  if (process.env.ENABLE_LOAD_TEST_BYPASS !== 'true') return false
  if (!isLocalHostname(request.nextUrl.hostname)) return false

  const secret = process.env.LOAD_TEST_BYPASS_SECRET
  return !!secret && secret !== DEFAULT_LOAD_TEST_SECRET
}

export function getVerifiedLoadTestBypassEmail(request: NextRequest): string | null {
  if (!isLoadTestBypassEnabled(request)) return null

  const secret = process.env.LOAD_TEST_BYPASS_SECRET
  const incomingSecret = request.headers.get('x-load-test-secret')
  if (!secret || incomingSecret !== secret) return null

  const email = request.headers.get('x-auth-user-email') || process.env.LOAD_TEST_BYPASS_USER_EMAIL
  return email?.trim() || null
}

export function isVerifiedLoadTestBypassRequest(request: NextRequest): boolean {
  if (!isLoadTestBypassEnabled(request)) return false
  return request.headers.get('x-load-test-secret') === process.env.LOAD_TEST_BYPASS_SECRET
}

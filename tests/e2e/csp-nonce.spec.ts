import { test, expect } from '@playwright/test'

/**
 * Phase 5 smoke: the production CSP must carry a fresh nonce per request
 * and must NOT contain 'unsafe-inline' in script-src. When the server is
 * running in dev mode, this test auto-skips (dev keeps unsafe-inline on
 * purpose so the Next runtime + React refresh keep working).
 */
test.describe('Content Security Policy', () => {
  test('script-src carries a nonce and no unsafe-inline in production', async ({ request }) => {
    const res = await request.get('/login')
    expect(res.ok()).toBe(true)

    const csp = res.headers()['content-security-policy']
    expect(csp, 'CSP header must be present').toBeTruthy()

    const scriptSrcMatch = csp.split(';').find((d) => d.trim().startsWith('script-src'))
    expect(scriptSrcMatch, 'script-src directive must be present').toBeDefined()

    if (process.env.NODE_ENV !== 'production') {
      test.info().annotations.push({
        type: 'skip-reason',
        description: 'Dev mode keeps unsafe-inline; this test only gates production.',
      })
      test.skip()
      return
    }

    expect(scriptSrcMatch).not.toContain("'unsafe-inline'")
    expect(scriptSrcMatch).toMatch(/'nonce-[a-f0-9]{16,}'/)
  })

  test('x-nonce response header exists and rotates per request', async ({ request }) => {
    const a = await request.get('/login')
    const b = await request.get('/login')
    const nonceA = a.headers()['x-nonce']
    const nonceB = b.headers()['x-nonce']
    expect(nonceA, 'x-nonce must be set').toBeTruthy()
    expect(nonceB, 'x-nonce must be set').toBeTruthy()
    expect(nonceA).not.toBe(nonceB)
  })
})

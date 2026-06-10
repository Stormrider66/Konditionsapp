/**
 * Tests for the Strava app-level quota guard.
 *
 * Strava quotas are shared across ALL users — once exhausted, every
 * outbound call fails for everyone, and 429'd requests still burn daily
 * quota. The guard must trip exactly when a window is exhausted and
 * clear when the window resets.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

// No UPSTASH_* env in tests → module uses its in-memory fallback. Reset
// modules per test so the module-level cooldown state doesn't leak.
async function loadModule() {
  vi.resetModules()
  return import('./rate-limit')
}

describe('strava rate-limit guard', () => {
  beforeEach(() => {
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
  })

  it('window math: quarter-hour and UTC-midnight resets', async () => {
    const { msUntilNextQuarterHour, msUntilUtcMidnight } = await loadModule()
    const quarterMs = 15 * 60 * 1000

    expect(msUntilNextQuarterHour(0)).toBe(quarterMs)
    expect(msUntilNextQuarterHour(10 * 60 * 1000)).toBe(5 * 60 * 1000)
    expect(msUntilUtcMidnight(0)).toBe(24 * 60 * 60 * 1000)
    expect(msUntilUtcMidnight(23.5 * 60 * 60 * 1000)).toBe(30 * 60 * 1000)
  })

  it('no cooldown when usage is under both limits', async () => {
    const { recordStravaRateLimitHeaders, getStravaCooldownMs } = await loadModule()

    await recordStravaRateLimitHeaders(
      new Headers({ 'x-ratelimit-limit': '100,1000', 'x-ratelimit-usage': '87,455' })
    )

    expect(await getStravaCooldownMs()).toBe(0)
  })

  it('starts a cooldown (≤15 min) when the 15-minute window is exhausted', async () => {
    const { recordStravaRateLimitHeaders, getStravaCooldownMs } = await loadModule()

    await recordStravaRateLimitHeaders(
      new Headers({ 'x-ratelimit-limit': '100,1000', 'x-ratelimit-usage': '100,455' })
    )

    const cooldown = await getStravaCooldownMs()
    expect(cooldown).toBeGreaterThan(0)
    expect(cooldown).toBeLessThanOrEqual(15 * 60 * 1000)
  })

  it('starts a cooldown until UTC midnight when the daily quota is exhausted', async () => {
    const { recordStravaRateLimitHeaders, getStravaCooldownMs } = await loadModule()

    await recordStravaRateLimitHeaders(
      new Headers({ 'x-ratelimit-limit': '100,1000', 'x-ratelimit-usage': '12,1000' })
    )

    const cooldown = await getStravaCooldownMs()
    expect(cooldown).toBeGreaterThan(0)
    expect(cooldown).toBeLessThanOrEqual(24 * 60 * 60 * 1000)
  })

  it('ignores responses without rate-limit headers', async () => {
    const { recordStravaRateLimitHeaders, getStravaCooldownMs } = await loadModule()

    await recordStravaRateLimitHeaders(new Headers())

    expect(await getStravaCooldownMs()).toBe(0)
  })

  it('startStravaCooldown trips the guard and StravaRateLimitError carries retryAfterMs', async () => {
    const { startStravaCooldown, getStravaCooldownMs, StravaRateLimitError } = await loadModule()

    await startStravaCooldown(60_000, 'test')
    expect(await getStravaCooldownMs()).toBeGreaterThan(0)

    const error = new StravaRateLimitError(60_000)
    expect(error.retryAfterMs).toBe(60_000)
    expect(error.name).toBe('StravaRateLimitError')
  })
})

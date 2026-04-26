import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/logger', () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}))

import {
  isProviderHealthy,
  recordAiFailure,
  recordAiSuccess,
  resetAiBreakers,
} from '@/lib/ai/circuit-breaker'

describe('AI circuit breaker', () => {
  beforeEach(() => {
    resetAiBreakers()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-26T00:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts healthy', () => {
    expect(isProviderHealthy('anthropic')).toBe(true)
    expect(isProviderHealthy('google')).toBe(true)
    expect(isProviderHealthy('openai')).toBe(true)
  })

  it('opens after 5 failures within the window', () => {
    for (let i = 0; i < 4; i++) recordAiFailure('anthropic')
    expect(isProviderHealthy('anthropic')).toBe(true)
    recordAiFailure('anthropic')
    expect(isProviderHealthy('anthropic')).toBe(false)
  })

  it('does not open siblings', () => {
    for (let i = 0; i < 5; i++) recordAiFailure('anthropic')
    expect(isProviderHealthy('anthropic')).toBe(false)
    expect(isProviderHealthy('google')).toBe(true)
    expect(isProviderHealthy('openai')).toBe(true)
  })

  it('does not open if failures are spread beyond the 60s window', () => {
    for (let i = 0; i < 4; i++) {
      recordAiFailure('google')
      vi.advanceTimersByTime(20_000) // 4 × 20s = 80s elapsed, oldest aged out
    }
    recordAiFailure('google')
    // Only the last 3 failures are within the 60s window
    expect(isProviderHealthy('google')).toBe(true)
  })

  it('closes after the open window expires', () => {
    for (let i = 0; i < 5; i++) recordAiFailure('openai')
    expect(isProviderHealthy('openai')).toBe(false)
    vi.advanceTimersByTime(30_000)
    expect(isProviderHealthy('openai')).toBe(true)
  })

  it('a success resets the failure counter and closes the breaker', () => {
    for (let i = 0; i < 5; i++) recordAiFailure('anthropic')
    expect(isProviderHealthy('anthropic')).toBe(false)
    recordAiSuccess('anthropic')
    expect(isProviderHealthy('anthropic')).toBe(true)
    // And we now need a fresh 5 failures to re-open
    for (let i = 0; i < 4; i++) recordAiFailure('anthropic')
    expect(isProviderHealthy('anthropic')).toBe(true)
  })
})

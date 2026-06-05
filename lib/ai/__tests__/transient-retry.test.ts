import { describe, expect, it, vi } from 'vitest'

import { isTransientAiError, retryOnTransientAiError } from '../transient-retry'

describe('isTransientAiError', () => {
  it('flags overload / rate-limit / 5xx errors as transient', () => {
    expect(isTransientAiError(new Error('The model is overloaded. Please try again later.'))).toBe(true)
    expect(isTransientAiError(new Error('429 Too Many Requests'))).toBe(true)
    expect(isTransientAiError(new Error('503 Service Unavailable'))).toBe(true)
    expect(isTransientAiError(new Error('RESOURCE_EXHAUSTED'))).toBe(true)
  })

  it('does not retry schema/validation or abort errors', () => {
    expect(isTransientAiError(new Error('No object generated: response did not match schema'))).toBe(false)
    const abort = Object.assign(new Error('aborted'), { name: 'AbortError' })
    expect(isTransientAiError(abort)).toBe(false)
  })
})

describe('retryOnTransientAiError', () => {
  it('retries a transient failure and then succeeds', async () => {
    let calls = 0
    const fn = vi.fn(async () => {
      calls += 1
      if (calls === 1) throw new Error('503 overloaded')
      return 'ok'
    })
    const result = await retryOnTransientAiError(fn, [0])
    expect(result).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('throws immediately on a non-transient error (no retry)', async () => {
    const fn = vi.fn(async () => {
      throw new Error('No object generated')
    })
    await expect(retryOnTransientAiError(fn, [0, 0])).rejects.toThrow('No object generated')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('gives up after exhausting retries on persistent transient errors', async () => {
    const fn = vi.fn(async () => {
      throw new Error('overloaded')
    })
    await expect(retryOnTransientAiError(fn, [0, 0])).rejects.toThrow('overloaded')
    expect(fn).toHaveBeenCalledTimes(3) // initial + 2 retries
  })
})

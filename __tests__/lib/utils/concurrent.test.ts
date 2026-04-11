/**
 * Tests for the processInBatches async generator used across cron
 * jobs for bounded chunked concurrency.
 */

import { describe, it, expect, vi } from 'vitest'
import { processInBatches } from '@/lib/utils/concurrent'

describe('processInBatches', () => {
  it('yields outcomes one chunk at a time, preserving order', async () => {
    const items = [1, 2, 3, 4, 5]
    const fn = async (n: number) => n * 10

    const chunks: number[][] = []
    for await (const outcomes of processInBatches(items, fn, { concurrency: 2 })) {
      chunks.push(outcomes)
    }

    expect(chunks).toEqual([[10, 20], [30, 40], [50]])
  })

  it('runs items within a chunk concurrently and sequentially between chunks', async () => {
    const order: string[] = []
    const fn = async (label: string) => {
      order.push(`start:${label}`)
      await new Promise((r) => setTimeout(r, 5))
      order.push(`end:${label}`)
      return label
    }

    const items = ['a', 'b', 'c', 'd']
    const chunks: string[][] = []
    for await (const out of processInBatches(items, fn, { concurrency: 2 })) {
      chunks.push(out)
    }

    expect(chunks).toEqual([['a', 'b'], ['c', 'd']])
    // a and b should both start before either ends (chunk is concurrent)
    const aStart = order.indexOf('start:a')
    const bStart = order.indexOf('start:b')
    const aEnd = order.indexOf('end:a')
    expect(bStart).toBeGreaterThan(aStart)
    expect(bStart).toBeLessThan(aEnd)
    // c should only start after b ends (chunks are sequential)
    const bEnd = order.indexOf('end:b')
    const cStart = order.indexOf('start:c')
    expect(cStart).toBeGreaterThan(bEnd)
  })

  it('stops yielding further chunks when shouldStop returns true', async () => {
    const items = [1, 2, 3, 4, 5, 6]
    const fn = vi.fn(async (n: number) => n)

    let seen = 0
    const chunks: number[][] = []
    for await (const out of processInBatches(items, fn, {
      concurrency: 2,
      shouldStop: () => seen >= 2, // after we've processed chunk 1 (2 items), stop
    })) {
      chunks.push(out)
      seen += out.length
    }

    // Only the first chunk should be processed
    expect(chunks).toEqual([[1, 2]])
    expect(fn).toHaveBeenCalledTimes(2)
    // Items 3–6 must never be invoked
    expect(fn.mock.calls.map((c) => c[0])).toEqual([1, 2])
  })

  it('does not yield anything when shouldStop is true from the start', async () => {
    const fn = vi.fn(async (n: number) => n)
    const chunks: number[][] = []

    for await (const out of processInBatches([1, 2, 3], fn, {
      concurrency: 2,
      shouldStop: () => true,
    })) {
      chunks.push(out)
    }

    expect(chunks).toEqual([])
    expect(fn).not.toHaveBeenCalled()
  })

  it('handles an empty input array by yielding nothing', async () => {
    const fn = vi.fn(async (n: number) => n)
    const chunks: number[][] = []
    for await (const out of processInBatches([], fn, { concurrency: 4 })) {
      chunks.push(out)
    }
    expect(chunks).toEqual([])
    expect(fn).not.toHaveBeenCalled()
  })

  it('throws when concurrency is less than 1', async () => {
    const iter = processInBatches([1, 2], async (n) => n, { concurrency: 0 })
    await expect(iter.next()).rejects.toThrow(/concurrency/)
  })

  it('lets caller break out of the for-await loop early without processing the rest', async () => {
    const items = [1, 2, 3, 4, 5, 6]
    const fn = vi.fn(async (n: number) => n)

    for await (const _out of processInBatches(items, fn, { concurrency: 2 })) {
      break
    }

    // Only the first chunk should have been processed before break
    expect(fn).toHaveBeenCalledTimes(2)
  })
})

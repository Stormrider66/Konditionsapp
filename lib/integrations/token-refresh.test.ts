/**
 * Tests for the shared OAuth token refresh helper.
 *
 * Providers rotate single-use refresh tokens, so the failure modes here
 * are silent integration breakage: a clobbered newer pair, a double
 * refresh consuming a rotated token, or a lost race failing a request
 * that the winner's tokens could have served.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    integrationToken: { findUnique: vi.fn(), updateMany: vi.fn() },
  },
}))

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

// Reversible fake crypto so assertions can compare ciphertext <-> plaintext.
vi.mock('@/lib/integrations/crypto', () => ({
  decryptIntegrationSecret: vi.fn((value: string | null | undefined) =>
    value ? value.replace(/^enc:/, '') : null
  ),
  encryptIntegrationSecret: vi.fn((value: string | null | undefined) =>
    value ? `enc:${value}` : null
  ),
}))

import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { refreshIntegrationToken, isIntegrationTokenFresh } from './token-refresh'

const HOUR = 60 * 60 * 1000

function tokenRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'token-1',
    accessToken: 'enc:old-access',
    refreshToken: 'enc:old-refresh',
    expiresAt: new Date(Date.now() - 1000), // expired
    ...overrides,
  }
}

describe('isIntegrationTokenFresh', () => {
  it('treats null expiry as fresh (never refresh)', () => {
    expect(isIntegrationTokenFresh(null)).toBe(true)
  })

  it('treats expiry beyond the 5-minute buffer as fresh', () => {
    expect(isIntegrationTokenFresh(new Date(Date.now() + HOUR))).toBe(true)
  })

  it('treats expiry inside the buffer as stale', () => {
    expect(isIntegrationTokenFresh(new Date(Date.now() + 60 * 1000))).toBe(false)
  })
})

describe('refreshIntegrationToken', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(prisma.integrationToken.updateMany).mockResolvedValue({ count: 1 })
  })

  it('returns the stored token without refreshing when the re-read shows a fresh pair', async () => {
    vi.mocked(prisma.integrationToken.findUnique).mockResolvedValue(
      tokenRow({ id: 'fresh-1', accessToken: 'enc:winner-access', expiresAt: new Date(Date.now() + HOUR) }) as never
    )
    const refresh = vi.fn()

    const result = await refreshIntegrationToken({ tokenId: 'fresh-1', provider: 'test', refresh })

    expect(result).toBe('winner-access')
    expect(refresh).not.toHaveBeenCalled()
  })

  it('refreshes a stale token and persists via CAS on the consumed ciphertext', async () => {
    vi.mocked(prisma.integrationToken.findUnique).mockResolvedValue(tokenRow({ id: 'cas-1' }) as never)
    const refresh = vi.fn().mockResolvedValue({
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
      expiresAt: new Date(Date.now() + HOUR),
    })

    const result = await refreshIntegrationToken({ tokenId: 'cas-1', provider: 'test', refresh })

    expect(result).toBe('new-access')
    expect(refresh).toHaveBeenCalledWith('old-refresh')
    expect(prisma.integrationToken.updateMany).toHaveBeenCalledWith({
      where: { id: 'cas-1', refreshToken: 'enc:old-refresh' },
      data: {
        accessToken: 'enc:new-access',
        refreshToken: 'enc:new-refresh',
        expiresAt: expect.any(Date),
      },
    })
  })

  it('deduplicates concurrent callers into one refresh (single-flight)', async () => {
    vi.mocked(prisma.integrationToken.findUnique).mockResolvedValue(tokenRow({ id: 'flight-1' }) as never)
    let release!: (value: {
      accessToken: string
      refreshToken: string
      expiresAt: Date
    }) => void
    const refresh = vi.fn().mockImplementation(
      () => new Promise((resolve) => { release = resolve })
    )

    const first = refreshIntegrationToken({ tokenId: 'flight-1', provider: 'test', refresh })
    const second = refreshIntegrationToken({ tokenId: 'flight-1', provider: 'test', refresh })

    await vi.waitFor(() => expect(refresh).toHaveBeenCalled())
    release({ accessToken: 'shared-access', refreshToken: 'r2', expiresAt: new Date(Date.now() + HOUR) })

    expect(await first).toBe('shared-access')
    expect(await second).toBe('shared-access')
    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it('keeps its own access token but warns when the CAS write loses', async () => {
    vi.mocked(prisma.integrationToken.findUnique).mockResolvedValue(tokenRow({ id: 'lost-cas-1' }) as never)
    vi.mocked(prisma.integrationToken.updateMany).mockResolvedValue({ count: 0 })
    const refresh = vi.fn().mockResolvedValue({
      accessToken: 'my-access',
      refreshToken: 'my-refresh',
      expiresAt: new Date(Date.now() + HOUR),
    })

    const result = await refreshIntegrationToken({ tokenId: 'lost-cas-1', provider: 'test', refresh })

    expect(result).toBe('my-access')
    expect(logger.warn).toHaveBeenCalled()
  })

  it('recovers with the concurrent winner\'s tokens when the provider rejects the refresh', async () => {
    vi.mocked(prisma.integrationToken.findUnique)
      .mockResolvedValueOnce(tokenRow({ id: 'recover-1' }) as never)
      // Second read after the failure: another instance rotated the pair.
      .mockResolvedValueOnce(
        tokenRow({
          id: 'recover-1',
          accessToken: 'enc:winner-access',
          refreshToken: 'enc:winner-refresh',
          expiresAt: new Date(Date.now() + HOUR),
        }) as never
      )
    const refresh = vi.fn().mockRejectedValue(new Error('invalid_grant'))

    const result = await refreshIntegrationToken({ tokenId: 'recover-1', provider: 'test', refresh })

    expect(result).toBe('winner-access')
    expect(prisma.integrationToken.updateMany).not.toHaveBeenCalled()
  })

  it('returns null and logs when the refresh fails with no concurrent winner', async () => {
    vi.mocked(prisma.integrationToken.findUnique).mockResolvedValue(tokenRow({ id: 'fail-1' }) as never)
    const refresh = vi.fn().mockRejectedValue(new Error('provider down'))

    const result = await refreshIntegrationToken({ tokenId: 'fail-1', provider: 'test', refresh })

    expect(result).toBeNull()
    expect(logger.error).toHaveBeenCalled()
  })
})

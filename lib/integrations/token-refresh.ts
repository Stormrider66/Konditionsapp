/**
 * Shared OAuth token refresh for integration providers.
 *
 * Providers rotate refresh tokens on use (single-use), so the naive
 * read-check-refresh-write in each client raced under concurrency: two
 * lambdas could both refresh, and the loser's write left a provider-side
 * invalidated refresh token in the DB — breaking the integration until the
 * user re-authenticated.
 *
 * Defenses, in order:
 *  1. Single-flight per token id — concurrent callers in the same instance
 *     (the common case under Vercel Fluid Compute) share one refresh.
 *  2. Re-read inside the flight — if another instance already refreshed,
 *     use the stored tokens instead of refreshing again.
 *  3. CAS write — only persist if the stored refresh-token ciphertext is
 *     still the one we consumed, so a concurrent winner's newer pair is
 *     never clobbered.
 *  4. Recover on failure — if the provider rejects the refresh because a
 *     concurrent instance consumed the token first, re-read and return the
 *     winner's access token instead of failing the request.
 */

import 'server-only'

import { prisma } from '@/lib/prisma'
import { decryptIntegrationSecret, encryptIntegrationSecret } from '@/lib/integrations/crypto'
import { logger } from '@/lib/logger'

export const TOKEN_EXPIRY_BUFFER_MS = 5 * 60 * 1000

export interface RefreshedProviderTokens {
  accessToken: string
  refreshToken: string | null | undefined
  expiresAt: Date
}

/** Fresh = not within the expiry buffer. Null expiry never triggers refresh. */
export function isIntegrationTokenFresh(expiresAt: Date | null): boolean {
  if (!expiresAt) return true
  return expiresAt.getTime() - TOKEN_EXPIRY_BUFFER_MS > Date.now()
}

const inflightRefreshes = new Map<string, Promise<string | null>>()

export function refreshIntegrationToken(options: {
  tokenId: string
  provider: string
  refresh: (refreshToken: string) => Promise<RefreshedProviderTokens>
}): Promise<string | null> {
  const flightKey = `${options.provider}:${options.tokenId}`
  const existing = inflightRefreshes.get(flightKey)
  if (existing) return existing

  const flight = doRefresh(options).finally(() => inflightRefreshes.delete(flightKey))
  inflightRefreshes.set(flightKey, flight)
  return flight
}

async function doRefresh({
  tokenId,
  provider,
  refresh,
}: {
  tokenId: string
  provider: string
  refresh: (refreshToken: string) => Promise<RefreshedProviderTokens>
}): Promise<string | null> {
  // Re-read: a concurrent flight or another instance may have refreshed
  // since the caller read the row.
  const current = await prisma.integrationToken.findUnique({ where: { id: tokenId } })
  if (!current) return null

  if (isIntegrationTokenFresh(current.expiresAt)) {
    return decryptIntegrationSecret(current.accessToken)
  }

  const consumedCiphertext = current.refreshToken
  const refreshToken = decryptIntegrationSecret(consumedCiphertext)
  if (!refreshToken) return null

  try {
    const newTokens = await refresh(refreshToken)

    const updated = await prisma.integrationToken.updateMany({
      where: { id: tokenId, refreshToken: consumedCiphertext },
      data: {
        accessToken: encryptIntegrationSecret(newTokens.accessToken)!,
        refreshToken: encryptIntegrationSecret(newTokens.refreshToken ?? null),
        expiresAt: newTokens.expiresAt,
      },
    })

    if (updated.count === 0) {
      // Another instance rotated concurrently. Our access token is still
      // valid at the provider (only refresh tokens are single-use), so use
      // it for this request and leave the newer stored pair untouched.
      logger.warn('Integration token rotated concurrently; kept stored pair', {
        provider,
        tokenId,
      })
    }

    return newTokens.accessToken
  } catch (error) {
    // The provider may have rejected the refresh because a concurrent
    // instance consumed this refresh token first. If the row changed and
    // now holds a fresh pair, ride on the winner's tokens.
    const latest = await prisma.integrationToken.findUnique({ where: { id: tokenId } })
    if (
      latest &&
      latest.refreshToken !== consumedCiphertext &&
      isIntegrationTokenFresh(latest.expiresAt)
    ) {
      logger.info('Recovered from concurrent token refresh', { provider, tokenId })
      return decryptIntegrationSecret(latest.accessToken)
    }

    logger.error(`Failed to refresh ${provider} token`, { tokenId }, error)
    return null
  }
}

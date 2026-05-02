/**
 * Oura Ring OAuth v2
 *
 * Handles OAuth flow and token management for the Oura API.
 * Mirrors the Strava integration pattern (single OAuth, refresh on expiry, encrypted at rest).
 */

import 'server-only'

import { prisma } from '@/lib/prisma'
import { decryptIntegrationSecret, encryptIntegrationSecret } from '@/lib/integrations/crypto'
import { fetchWithTimeoutAndRetry } from '@/lib/http/fetch'
import { logger } from '@/lib/logger'

const OURA_OAUTH_AUTHORIZE = 'https://cloud.ouraring.com/oauth/authorize'
const OURA_OAUTH_TOKEN = 'https://api.ouraring.com/oauth/token'

const OURA_CLIENT_ID = process.env.OURA_CLIENT_ID!
const OURA_CLIENT_SECRET = process.env.OURA_CLIENT_SECRET!

// Scopes we actually use. Skips `email`, `tag`, `ring_configuration`.
const OURA_SCOPES = 'personal daily heartrate workout session spo2'

function getOuraRedirectUri(origin?: string): string {
  if (process.env.OURA_REDIRECT_URI) return process.env.OURA_REDIRECT_URI
  const base = process.env.NEXT_PUBLIC_APP_URL || origin || 'http://localhost:3000'
  return `${base}/api/integrations/oura/callback`
}

export interface OuraTokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
}

/** Build the authorize URL the user is redirected to. */
export function getOuraAuthUrl(state: string, options?: { origin?: string }): string {
  const params = new URLSearchParams({
    client_id: OURA_CLIENT_ID,
    redirect_uri: getOuraRedirectUri(options?.origin),
    response_type: 'code',
    scope: OURA_SCOPES,
    state,
  })
  return `${OURA_OAUTH_AUTHORIZE}?${params.toString()}`
}

export async function exchangeOuraCode(code: string, origin?: string): Promise<OuraTokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: getOuraRedirectUri(origin),
    client_id: OURA_CLIENT_ID,
    client_secret: OURA_CLIENT_SECRET,
  })

  const response = await fetchWithTimeoutAndRetry(
    OURA_OAUTH_TOKEN,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    },
    { timeoutMs: 10_000, maxAttempts: 2 },
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to exchange Oura code: ${error}`)
  }

  return response.json()
}

export async function refreshOuraToken(refreshToken: string): Promise<OuraTokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: OURA_CLIENT_ID,
    client_secret: OURA_CLIENT_SECRET,
  })

  const response = await fetchWithTimeoutAndRetry(
    OURA_OAUTH_TOKEN,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    },
    { timeoutMs: 10_000, maxAttempts: 2 },
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to refresh Oura token: ${error}`)
  }

  return response.json()
}

/** Returns a decrypted access token, refreshing if it expires within 5 min. */
export async function getValidAccessToken(clientId: string): Promise<string | null> {
  const token = await prisma.integrationToken.findUnique({
    where: { clientId_type: { clientId, type: 'OURA' } },
  })
  if (!token) return null

  const accessToken = decryptIntegrationSecret(token.accessToken)
  const refreshToken = decryptIntegrationSecret(token.refreshToken)
  if (!accessToken) return null

  const now = Date.now()
  const expiresAt = token.expiresAt ? token.expiresAt.getTime() : null

  if (expiresAt && expiresAt - 5 * 60 * 1000 < now) {
    if (!refreshToken) return null
    try {
      const fresh = await refreshOuraToken(refreshToken)
      await prisma.integrationToken.update({
        where: { id: token.id },
        data: {
          accessToken: encryptIntegrationSecret(fresh.access_token)!,
          refreshToken: encryptIntegrationSecret(fresh.refresh_token),
          expiresAt: new Date(Date.now() + fresh.expires_in * 1000),
        },
      })
      return fresh.access_token
    } catch (error) {
      logger.error('Failed to refresh Oura token', { clientId }, error)
      return null
    }
  }

  return accessToken
}

export async function disconnectOura(clientId: string): Promise<void> {
  await prisma.integrationToken.deleteMany({ where: { clientId, type: 'OURA' } })
}

export async function hasOuraConnection(clientId: string): Promise<boolean> {
  const token = await prisma.integrationToken.findUnique({
    where: { clientId_type: { clientId, type: 'OURA' } },
  })
  return token !== null
}

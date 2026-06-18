/**
 * WHOOP API client.
 *
 * Handles OAuth, token refresh, and read requests for recovery, sleep, cycles,
 * and workout summaries. WHOOP webhooks are notifications, so sync code still
 * fetches the latest record from the API before writing local state.
 */

import 'server-only'

import crypto from 'crypto'

import { prisma } from '@/lib/prisma'
import { decryptIntegrationSecret, encryptIntegrationSecret } from '@/lib/integrations/crypto'
import { fetchWithTimeoutAndRetry } from '@/lib/http/fetch'
import { logger } from '@/lib/logger'
import { refreshIntegrationToken } from '@/lib/integrations/token-refresh'

const WHOOP_API_BASE = 'https://api.prod.whoop.com/developer/v2'
const WHOOP_AUTH_URL = 'https://api.prod.whoop.com/oauth/oauth2/auth'
const WHOOP_TOKEN_URL = 'https://api.prod.whoop.com/oauth/oauth2/token'

const WHOOP_SCOPES = [
  'offline',
  'read:profile',
  'read:body_measurement',
  'read:recovery',
  'read:sleep',
  'read:cycles',
  'read:workout',
].join(' ')

const WHOOP_CLIENT_ID = process.env.WHOOP_CLIENT_ID || ''
const WHOOP_CLIENT_SECRET = process.env.WHOOP_CLIENT_SECRET || ''

function getWhoopRedirectUri(origin?: string): string {
  if (process.env.WHOOP_REDIRECT_URI) return process.env.WHOOP_REDIRECT_URI
  const base = process.env.NEXT_PUBLIC_APP_URL || origin || 'http://localhost:3000'
  return `${base}/api/integrations/whoop/callback`
}

function generateState(): string {
  return crypto.randomBytes(16).toString('hex')
}

function encodeOAuthMetadata(input: { businessSlug?: string }): string {
  return encryptIntegrationSecret(JSON.stringify({ businessSlug: input.businessSlug ?? null }))!
}

function decodeOAuthMetadata(value: string | null | undefined): { businessSlug?: string } {
  const decrypted = decryptIntegrationSecret(value)
  if (!decrypted) return {}

  try {
    const parsed = JSON.parse(decrypted) as { businessSlug?: string | null }
    return { businessSlug: parsed.businessSlug ?? undefined }
  } catch {
    return {}
  }
}

export interface WhoopTokenResponse {
  access_token: string
  refresh_token?: string
  token_type: string
  expires_in: number
  scope?: string
}

export interface WhoopProfile {
  user_id: number
  email?: string
  first_name?: string
  last_name?: string
}

export interface WhoopBodyMeasurements {
  height_meter?: number
  weight_kilogram?: number
  max_heart_rate?: number
}

export interface WhoopZoneDurations {
  zone_zero_milli?: number
  zone_one_milli?: number
  zone_two_milli?: number
  zone_three_milli?: number
  zone_four_milli?: number
  zone_five_milli?: number
}

export interface WhoopCycle {
  id: number
  user_id: number
  created_at?: string
  updated_at?: string
  start: string
  end?: string | null
  timezone_offset?: string
  score_state?: string
  score?: {
    strain?: number
    kilojoule?: number
    average_heart_rate?: number
    max_heart_rate?: number
  } | null
}

export interface WhoopRecovery {
  cycle_id: number
  sleep_id?: string
  user_id?: number
  created_at?: string
  updated_at?: string
  score_state?: string
  score?: {
    user_calibrating?: boolean
    recovery_score?: number
    resting_heart_rate?: number
    hrv_rmssd_milli?: number
    spo2_percentage?: number
    skin_temp_celsius?: number
  } | null
}

export interface WhoopSleep {
  id: string
  v1_id?: number
  user_id: number
  created_at?: string
  updated_at?: string
  start: string
  end: string
  timezone_offset?: string
  nap?: boolean
  score_state?: string
  cycle_id?: number
  score?: {
    stage_summary?: {
      total_in_bed_time_milli?: number
      total_awake_time_milli?: number
      total_no_data_time_milli?: number
      total_light_sleep_time_milli?: number
      total_slow_wave_sleep_time_milli?: number
      total_rem_sleep_time_milli?: number
      sleep_cycle_count?: number
      disturbance_count?: number
    }
    sleep_needed?: {
      baseline_milli?: number
      need_from_sleep_debt_milli?: number
      need_from_recent_strain_milli?: number
      need_from_recent_nap_milli?: number
    }
    respiratory_rate?: number
    sleep_performance_percentage?: number
    sleep_consistency_percentage?: number
    sleep_efficiency_percentage?: number
  } | null
}

export interface WhoopWorkout {
  id: string
  v1_id?: number
  user_id: number
  created_at?: string
  updated_at?: string
  start: string
  end?: string | null
  timezone_offset?: string
  sport_name?: string
  sport_id?: number
  score_state?: string
  score?: {
    strain?: number
    average_heart_rate?: number
    max_heart_rate?: number
    kilojoule?: number
    percent_recorded?: number
    distance_meter?: number
    altitude_gain_meter?: number
    altitude_change_meter?: number
    zone_durations?: WhoopZoneDurations
  } | null
}

interface WhoopCollectionResponse<T> {
  records: T[]
  next_token?: string | null
}

export function isWhoopConfigured(): boolean {
  return Boolean(WHOOP_CLIENT_ID && WHOOP_CLIENT_SECRET)
}

export async function getWhoopAuthUrl(
  clientId: string,
  options?: { origin?: string; businessSlug?: string },
): Promise<{ authUrl: string }> {
  if (!isWhoopConfigured()) {
    throw new Error('WHOOP API is not configured')
  }

  const state = generateState()
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

  await prisma.oAuthRequestToken.upsert({
    where: { clientId_provider: { clientId, provider: 'WHOOP' } },
    update: {
      state,
      codeVerifier: encodeOAuthMetadata({ businessSlug: options?.businessSlug }),
      expiresAt,
    },
    create: {
      clientId,
      provider: 'WHOOP',
      state,
      codeVerifier: encodeOAuthMetadata({ businessSlug: options?.businessSlug }),
      expiresAt,
    },
  })

  const params = new URLSearchParams({
    client_id: WHOOP_CLIENT_ID,
    redirect_uri: getWhoopRedirectUri(options?.origin),
    response_type: 'code',
    scope: WHOOP_SCOPES,
    state,
  })

  return { authUrl: `${WHOOP_AUTH_URL}?${params.toString()}` }
}

export async function consumeWhoopOAuthState(
  state: string,
): Promise<{ clientId: string; businessSlug?: string } | null> {
  const stored = await prisma.oAuthRequestToken.findFirst({
    where: {
      provider: 'WHOOP',
      state,
      expiresAt: { gt: new Date() },
    },
  })

  if (!stored) return null

  await prisma.oAuthRequestToken.delete({ where: { id: stored.id } })
  return {
    clientId: stored.clientId,
    ...decodeOAuthMetadata(stored.codeVerifier),
  }
}

export async function exchangeWhoopCode(code: string, origin?: string): Promise<WhoopTokenResponse> {
  if (!isWhoopConfigured()) {
    throw new Error('WHOOP API is not configured')
  }

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: getWhoopRedirectUri(origin),
    client_id: WHOOP_CLIENT_ID,
    client_secret: WHOOP_CLIENT_SECRET,
  })

  const response = await fetchWithTimeoutAndRetry(
    WHOOP_TOKEN_URL,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    },
    { timeoutMs: 10_000, maxAttempts: 2 },
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to exchange WHOOP code: ${error}`)
  }

  return response.json()
}

export async function refreshWhoopToken(refreshToken: string): Promise<WhoopTokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: WHOOP_CLIENT_ID,
    client_secret: WHOOP_CLIENT_SECRET,
    scope: 'offline',
  })

  const response = await fetchWithTimeoutAndRetry(
    WHOOP_TOKEN_URL,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    },
    { timeoutMs: 10_000, maxAttempts: 2 },
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to refresh WHOOP token: ${error}`)
  }

  return response.json()
}

export async function getValidWhoopAccessToken(clientId: string): Promise<string | null> {
  const token = await prisma.integrationToken.findUnique({
    where: { clientId_type: { clientId, type: 'WHOOP' } },
  })
  if (!token) return null

  const accessToken = decryptIntegrationSecret(token.accessToken)
  const refreshToken = decryptIntegrationSecret(token.refreshToken)
  if (!accessToken) return null

  const expiresAt = token.expiresAt ? token.expiresAt.getTime() : null
  if (expiresAt && expiresAt - 5 * 60 * 1000 < Date.now()) {
    if (!refreshToken) return null

    return refreshIntegrationToken({
      tokenId: token.id,
      provider: 'whoop',
      refresh: async (currentRefreshToken) => {
        const fresh = await refreshWhoopToken(currentRefreshToken)
        return {
          accessToken: fresh.access_token,
          refreshToken: fresh.refresh_token,
          expiresAt: new Date(Date.now() + fresh.expires_in * 1000),
        }
      },
    })
  }

  return accessToken
}

async function whoopApiRequestWithToken<T>(
  accessToken: string,
  endpoint: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetchWithTimeoutAndRetry(
    `${WHOOP_API_BASE}${endpoint}`,
    {
      ...init,
      headers: {
        ...(init?.headers ?? {}),
        Authorization: `Bearer ${accessToken}`,
      },
    },
    { timeoutMs: 12_000, maxAttempts: 3 },
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`WHOOP API error ${response.status}: ${error}`)
  }

  if (response.status === 204) return undefined as T
  return response.json()
}

export async function whoopApiRequest<T>(
  clientId: string,
  endpoint: string,
  init?: RequestInit,
): Promise<T> {
  const accessToken = await getValidWhoopAccessToken(clientId)
  if (!accessToken) throw new Error('No valid WHOOP access token')
  return whoopApiRequestWithToken<T>(accessToken, endpoint, init)
}

export async function getWhoopProfile(accessToken: string): Promise<WhoopProfile> {
  return whoopApiRequestWithToken<WhoopProfile>(accessToken, '/user/profile/basic')
}

export async function getWhoopBodyMeasurements(clientId: string): Promise<WhoopBodyMeasurements> {
  return whoopApiRequest<WhoopBodyMeasurements>(clientId, '/user/measurement/body')
}

async function getWhoopCollection<T>(
  clientId: string,
  endpoint: string,
  startDate: Date,
  endDate: Date,
): Promise<T[]> {
  const records: T[] = []
  let nextToken: string | undefined

  do {
    const params = new URLSearchParams({
      limit: '25',
      start: startDate.toISOString(),
      end: endDate.toISOString(),
    })
    if (nextToken) params.set('nextToken', nextToken)

    const page = await whoopApiRequest<WhoopCollectionResponse<T>>(
      clientId,
      `${endpoint}?${params.toString()}`,
    )

    records.push(...(page.records ?? []))
    nextToken = page.next_token ?? undefined
  } while (nextToken)

  return records
}

export async function getWhoopCycles(clientId: string, startDate: Date, endDate: Date): Promise<WhoopCycle[]> {
  return getWhoopCollection<WhoopCycle>(clientId, '/cycle', startDate, endDate)
}

export async function getWhoopRecoveries(clientId: string, startDate: Date, endDate: Date): Promise<WhoopRecovery[]> {
  return getWhoopCollection<WhoopRecovery>(clientId, '/recovery', startDate, endDate)
}

export async function getWhoopSleeps(clientId: string, startDate: Date, endDate: Date): Promise<WhoopSleep[]> {
  return getWhoopCollection<WhoopSleep>(clientId, '/activity/sleep', startDate, endDate)
}

export async function getWhoopWorkouts(clientId: string, startDate: Date, endDate: Date): Promise<WhoopWorkout[]> {
  return getWhoopCollection<WhoopWorkout>(clientId, '/activity/workout', startDate, endDate)
}

export async function getWhoopSleep(clientId: string, sleepId: string): Promise<WhoopSleep> {
  return whoopApiRequest<WhoopSleep>(clientId, `/activity/sleep/${encodeURIComponent(sleepId)}`)
}

export async function getWhoopWorkout(clientId: string, workoutId: string): Promise<WhoopWorkout> {
  return whoopApiRequest<WhoopWorkout>(clientId, `/activity/workout/${encodeURIComponent(workoutId)}`)
}

export async function getWhoopRecoveryForCycle(clientId: string, cycleId: number | string): Promise<WhoopRecovery> {
  return whoopApiRequest<WhoopRecovery>(clientId, `/cycle/${encodeURIComponent(String(cycleId))}/recovery`)
}

export async function revokeWhoopAccess(clientId: string): Promise<void> {
  const accessToken = await getValidWhoopAccessToken(clientId)
  if (!accessToken) return

  try {
    await whoopApiRequestWithToken<void>(accessToken, '/user/access', { method: 'DELETE' })
  } catch (error) {
    logger.warn('WHOOP access revoke failed; removing local token anyway', { clientId }, error)
  }
}

export async function disconnectWhoop(clientId: string): Promise<void> {
  await revokeWhoopAccess(clientId)
  await prisma.integrationToken.deleteMany({ where: { clientId, type: 'WHOOP' } })
}

export async function hasWhoopConnection(clientId: string): Promise<boolean> {
  const token = await prisma.integrationToken.findUnique({
    where: { clientId_type: { clientId, type: 'WHOOP' } },
  })
  return token !== null
}

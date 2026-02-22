/**
 * Garmin Health API Client
 *
 * Handles OAuth 2.0 PKCE flow, API requests, and data retrieval for Garmin integration.
 *
 * For initial MVP, we focus on:
 * - Activity summaries (daily activities)
 * - Sleep data
 * - Heart rate data (RHR, HRV)
 * - Body composition
 */

import 'server-only'

import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { decryptIntegrationSecret, encryptIntegrationSecret } from '@/lib/integrations/crypto'
import { fetchWithTimeoutAndRetry } from '@/lib/http/fetch'
import { logger } from '@/lib/logger'

// Garmin API configuration
const GARMIN_API_BASE = 'https://apis.garmin.com/wellness-api/rest';
const GARMIN_AUTH_URL = 'https://apis.garmin.com/tools/oauth2/authorizeUser';
const GARMIN_TOKEN_URL = 'https://diauth.garmin.com/di-oauth2-service/oauth/token';

// Environment variables (OAuth 2.0 naming)
const GARMIN_CLIENT_ID = process.env.GARMIN_CLIENT_ID || process.env.GARMIN_CONSUMER_KEY || '';
const GARMIN_CLIENT_SECRET = process.env.GARMIN_CLIENT_SECRET || process.env.GARMIN_CONSUMER_SECRET || '';
const GARMIN_REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/garmin/callback`
  : 'http://localhost:3000/api/integrations/garmin/callback';

// Types for Garmin data
export interface GarminActivity {
  activityId: number;
  activityType: string;
  startTimeInSeconds: number;
  startTimeOffsetInSeconds: number;
  activityDurationInSeconds: number;
  distanceInMeters: number;
  averageHeartRateInBeatsPerMinute?: number;
  maxHeartRateInBeatsPerMinute?: number;
  averageSpeedInMetersPerSecond?: number;
  maxSpeedInMetersPerSecond?: number;
  activeKilocalories?: number;
  steps?: number;
  averagePowerInWatts?: number;
  normalizedPowerInWatts?: number;
  averageCadenceInRoundsPerMinute?: number;
  maxCadenceInRoundsPerMinute?: number;
}

export interface GarminDailySummary {
  summaryId: string;
  calendarDate: string;
  startTimeInSeconds: number;
  startTimeOffsetInSeconds: number;
  activityType: string;
  durationInSeconds: number;
  steps: number;
  distanceInMeters: number;
  activeTimeInSeconds: number;
  activeKilocalories: number;
  bmrKilocalories: number;
  moderateIntensityDurationInSeconds: number;
  vigorousIntensityDurationInSeconds: number;
  floorsClimbed: number;
  minHeartRateInBeatsPerMinute?: number;
  averageHeartRateInBeatsPerMinute?: number;
  maxHeartRateInBeatsPerMinute?: number;
  restingHeartRateInBeatsPerMinute?: number;
  averageStressLevel?: number;
  maxStressLevel?: number;
}

export interface GarminSleepData {
  summaryId: string;
  calendarDate: string;
  startTimeInSeconds: number;
  startTimeOffsetInSeconds: number;
  durationInSeconds: number;
  deepSleepDurationInSeconds: number;
  lightSleepDurationInSeconds: number;
  remSleepInSeconds: number;
  awakeDurationInSeconds: number;
  sleepScores?: {
    overall?: number;
    qualityScore?: number;
    recoveryScore?: number;
    restfulnessScore?: number;
  };
}

export interface GarminHRVData {
  summaryId: string;
  calendarDate: string;
  weeklyAvg?: number;
  lastNightAvg?: number;
  lastNight5MinHigh?: number;
  baselineLowUpper?: number;
  baselineBalancedLower?: number;
  baselineBalancedUpper?: number;
  status?: 'LOW' | 'UNBALANCED' | 'BALANCED' | 'HIGH';
}

/**
 * Garmin Activity Details - More detailed activity data
 * including samples and HR zone information
 */
export interface GarminActivityDetails {
  activityId: number;
  summary: {
    activityId: number;
    activityType: string;
    startTimeInSeconds: number;
    durationInSeconds: number;
    distanceInMeters: number;
    averageHeartRateInBeatsPerMinute?: number;
    maxHeartRateInBeatsPerMinute?: number;
    averageSpeedInMetersPerSecond?: number;
    activeKilocalories?: number;
    averagePowerInWatts?: number;
    normalizedPowerInWatts?: number;
  };
  // HR zone time breakdown (if available)
  heartRateZones?: {
    zone1TimeInSeconds?: number;
    zone2TimeInSeconds?: number;
    zone3TimeInSeconds?: number;
    zone4TimeInSeconds?: number;
    zone5TimeInSeconds?: number;
    totalTimeInZonesInSeconds?: number;
  };
  // Sample data (if available)
  samples?: Array<{
    recordingTime: number;
    heartRate?: number;
    speed?: number;
    power?: number;
    cadence?: number;
    altitude?: number;
  }>;
}

/**
 * HR zone seconds from Garmin (standardized format)
 */
export interface GarminHRZoneSeconds {
  zone1: number;
  zone2: number;
  zone3: number;
  zone4: number;
  zone5: number;
  [key: string]: number; // Index signature for JSON compatibility
}

/**
 * Garmin OAuth 2.0 token response
 */
interface GarminTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number; // seconds (typically ~3 months)
  scope?: string;
}

// ─── PKCE Helpers ───────────────────────────────────────────────────────────

/**
 * Generate PKCE code_verifier and code_challenge
 *
 * code_verifier: 43-128 character random string (base64url)
 * code_challenge: SHA-256 hash of code_verifier, base64url-encoded
 */
function generatePKCE(): { codeVerifier: string; codeChallenge: string } {
  // 32 bytes → 43 base64url characters
  const codeVerifier = crypto.randomBytes(32)
    .toString('base64url');

  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');

  return { codeVerifier, codeChallenge };
}

/**
 * Generate a random state parameter for CSRF protection
 */
function generateState(): string {
  return crypto.randomBytes(16).toString('hex');
}

// ─── OAuth 2.0 Flow ─────────────────────────────────────────────────────────

/**
 * Check if Garmin API is configured
 */
export function isGarminConfigured(): boolean {
  return Boolean(GARMIN_CLIENT_ID && GARMIN_CLIENT_SECRET);
}

/**
 * Step 1: Build Garmin authorization URL and store PKCE state
 *
 * Generates a PKCE code_verifier + code_challenge, stores the verifier
 * in OAuthRequestToken for retrieval in the callback, and returns
 * the authorization URL to redirect the user to.
 */
export async function getGarminAuthUrl(clientId: string): Promise<{ authUrl: string }> {
  if (!isGarminConfigured()) {
    throw new Error('Garmin API is not configured');
  }

  const { codeVerifier, codeChallenge } = generatePKCE();
  const state = generateState();

  // Store PKCE state for callback retrieval (10-min expiry)
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await prisma.oAuthRequestToken.upsert({
    where: {
      clientId_provider: {
        clientId,
        provider: 'GARMIN',
      },
    },
    update: {
      codeVerifier: encryptIntegrationSecret(codeVerifier)!,
      state,
      expiresAt,
    },
    create: {
      clientId,
      provider: 'GARMIN',
      codeVerifier: encryptIntegrationSecret(codeVerifier)!,
      state,
      expiresAt,
    },
  });

  const params = new URLSearchParams({
    client_id: GARMIN_CLIENT_ID,
    redirect_uri: GARMIN_REDIRECT_URI,
    response_type: 'code',
    scope: 'CONNECT_READ CONNECT_WRITE',
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state,
  });

  const authUrl = `${GARMIN_AUTH_URL}?${params.toString()}`;
  return { authUrl };
}

/**
 * Retrieve and validate stored PKCE state, then delete it (one-time use)
 */
async function retrieveAndDeletePKCEState(
  clientId: string,
  expectedState: string
): Promise<string | null> {
  const stored = await prisma.oAuthRequestToken.findUnique({
    where: {
      clientId_provider: {
        clientId,
        provider: 'GARMIN',
      },
    },
  });

  if (!stored) {
    return null;
  }

  // Verify state matches (CSRF protection)
  if (stored.state !== expectedState) {
    return null;
  }

  // Check expiry
  if (stored.expiresAt < new Date()) {
    await prisma.oAuthRequestToken.delete({ where: { id: stored.id } });
    return null;
  }

  const codeVerifier = decryptIntegrationSecret(stored.codeVerifier);
  if (!codeVerifier) {
    return null;
  }

  // Delete (one-time use)
  await prisma.oAuthRequestToken.delete({ where: { id: stored.id } });

  return codeVerifier;
}

/**
 * Look up clientId by the state parameter returned in the OAuth callback.
 *
 * In OAuth 2.0, we use the `state` parameter to recover the clientId.
 * State values are short-lived (10 min) and unique per client+provider.
 */
export async function findClientIdByState(state: string): Promise<string | null> {
  const record = await prisma.oAuthRequestToken.findFirst({
    where: {
      provider: 'GARMIN',
      state,
      expiresAt: { gt: new Date() },
    },
  });

  return record?.clientId ?? null;
}

/**
 * Step 2: Exchange authorization code for tokens
 */
export async function exchangeGarminCode(
  code: string,
  codeVerifier: string
): Promise<GarminTokenResponse> {
  if (!isGarminConfigured()) {
    throw new Error('Garmin API is not configured');
  }

  const body = new URLSearchParams({
    client_id: GARMIN_CLIENT_ID,
    client_secret: GARMIN_CLIENT_SECRET,
    code,
    code_verifier: codeVerifier,
    grant_type: 'authorization_code',
    redirect_uri: GARMIN_REDIRECT_URI,
  });

  const response = await fetchWithTimeoutAndRetry(
    GARMIN_TOKEN_URL,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    },
    { timeoutMs: 10_000, maxAttempts: 2 }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to exchange Garmin code: ${error}`);
  }

  return response.json();
}

/**
 * Refresh an expired Garmin access token
 */
export async function refreshGarminToken(refreshToken: string): Promise<GarminTokenResponse> {
  const body = new URLSearchParams({
    client_id: GARMIN_CLIENT_ID,
    client_secret: GARMIN_CLIENT_SECRET,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });

  const response = await fetchWithTimeoutAndRetry(
    GARMIN_TOKEN_URL,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    },
    { timeoutMs: 10_000, maxAttempts: 2 }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to refresh Garmin token: ${error}`);
  }

  return response.json();
}

/**
 * Get valid access token for a client, refreshing if necessary (5-min buffer)
 */
export async function getValidGarminAccessToken(clientId: string): Promise<string | null> {
  const token = await prisma.integrationToken.findUnique({
    where: {
      clientId_type: {
        clientId,
        type: 'GARMIN',
      },
    },
  });

  if (!token) {
    return null;
  }

  const accessToken = decryptIntegrationSecret(token.accessToken);
  const refreshTokenValue = decryptIntegrationSecret(token.refreshToken);
  if (!accessToken) return null;

  // Check if token is expired (with 5-minute buffer)
  const now = new Date();
  const expiresAt = token.expiresAt ? new Date(token.expiresAt) : null;

  if (expiresAt && expiresAt.getTime() - 5 * 60 * 1000 < now.getTime()) {
    // Token expired or about to expire — refresh it
    if (!refreshTokenValue) {
      return null;
    }

    try {
      const newTokens = await refreshGarminToken(refreshTokenValue);

      await prisma.integrationToken.update({
        where: { id: token.id },
        data: {
          accessToken: encryptIntegrationSecret(newTokens.access_token)!,
          refreshToken: encryptIntegrationSecret(newTokens.refresh_token),
          expiresAt: new Date(Date.now() + newTokens.expires_in * 1000),
        },
      });

      return newTokens.access_token;
    } catch (error) {
      logger.error('Failed to refresh Garmin token', { clientId }, error);
      return null;
    }
  }

  return accessToken;
}

/**
 * Clean up expired OAuth PKCE state rows (call periodically or on startup)
 */
export async function cleanupExpiredRequestTokens(): Promise<number> {
  const result = await prisma.oAuthRequestToken.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
    },
  });
  return result.count;
}

// ─── API Requests (Bearer Auth) ─────────────────────────────────────────────

/**
 * Make authenticated request to Garmin API using Bearer token
 */
export async function garminApiRequest<T>(
  clientId: string,
  endpoint: string,
  method: string = 'GET'
): Promise<T> {
  const accessToken = await getValidGarminAccessToken(clientId);

  if (!accessToken) {
    throw new Error('No valid Garmin access token');
  }

  const url = `${GARMIN_API_BASE}${endpoint}`;

  const response = await fetchWithTimeoutAndRetry(
    url,
    {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    { timeoutMs: 12_000, maxAttempts: 3 }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Garmin API error: ${response.status} ${error}`);
  }

  return response.json();
}

// ─── Data Fetching (unchanged — uses garminApiRequest with Bearer auth) ─────

/**
 * Get daily summaries for a date range
 */
export async function getGarminDailySummaries(
  clientId: string,
  startDate: Date,
  endDate: Date
): Promise<GarminDailySummary[]> {
  const uploadStartTimeInSeconds = Math.floor(startDate.getTime() / 1000);
  const uploadEndTimeInSeconds = Math.floor(endDate.getTime() / 1000);

  return garminApiRequest<GarminDailySummary[]>(
    clientId,
    `/dailies?uploadStartTimeInSeconds=${uploadStartTimeInSeconds}&uploadEndTimeInSeconds=${uploadEndTimeInSeconds}`
  );
}

/**
 * Get activities for a date range
 */
export async function getGarminActivities(
  clientId: string,
  startDate: Date,
  endDate: Date
): Promise<GarminActivity[]> {
  const uploadStartTimeInSeconds = Math.floor(startDate.getTime() / 1000);
  const uploadEndTimeInSeconds = Math.floor(endDate.getTime() / 1000);

  return garminApiRequest<GarminActivity[]>(
    clientId,
    `/activities?uploadStartTimeInSeconds=${uploadStartTimeInSeconds}&uploadEndTimeInSeconds=${uploadEndTimeInSeconds}`
  );
}

/**
 * Get sleep data for a date range
 */
export async function getGarminSleepData(
  clientId: string,
  startDate: Date,
  endDate: Date
): Promise<GarminSleepData[]> {
  const uploadStartTimeInSeconds = Math.floor(startDate.getTime() / 1000);
  const uploadEndTimeInSeconds = Math.floor(endDate.getTime() / 1000);

  return garminApiRequest<GarminSleepData[]>(
    clientId,
    `/sleeps?uploadStartTimeInSeconds=${uploadStartTimeInSeconds}&uploadEndTimeInSeconds=${uploadEndTimeInSeconds}`
  );
}

/**
 * Get HRV data for a date range
 */
export async function getGarminHRVData(
  clientId: string,
  startDate: Date,
  endDate: Date
): Promise<GarminHRVData[]> {
  const uploadStartTimeInSeconds = Math.floor(startDate.getTime() / 1000);
  const uploadEndTimeInSeconds = Math.floor(endDate.getTime() / 1000);

  return garminApiRequest<GarminHRVData[]>(
    clientId,
    `/hrv?uploadStartTimeInSeconds=${uploadStartTimeInSeconds}&uploadEndTimeInSeconds=${uploadEndTimeInSeconds}`
  );
}

/**
 * Get detailed activity information including HR zones and samples
 */
export async function getGarminActivityDetails(
  clientId: string,
  activityId: number | string
): Promise<GarminActivityDetails | null> {
  try {
    return await garminApiRequest<GarminActivityDetails>(
      clientId,
      `/activityDetails?activityId=${activityId}`
    );
  } catch (error) {
    // Activity details endpoint might not be available for all activities
    console.warn(`Failed to get Garmin activity details for ${activityId}:`, error);
    return null;
  }
}

/**
 * Extract HR zone seconds from Garmin activity details
 */
export function extractGarminHRZoneSeconds(
  details: GarminActivityDetails | null
): GarminHRZoneSeconds | null {
  if (!details?.heartRateZones) {
    return null;
  }

  const zones = details.heartRateZones;

  const hasZoneData =
    zones.zone1TimeInSeconds !== undefined ||
    zones.zone2TimeInSeconds !== undefined ||
    zones.zone3TimeInSeconds !== undefined ||
    zones.zone4TimeInSeconds !== undefined ||
    zones.zone5TimeInSeconds !== undefined;

  if (!hasZoneData) {
    return null;
  }

  return {
    zone1: zones.zone1TimeInSeconds ?? 0,
    zone2: zones.zone2TimeInSeconds ?? 0,
    zone3: zones.zone3TimeInSeconds ?? 0,
    zone4: zones.zone4TimeInSeconds ?? 0,
    zone5: zones.zone5TimeInSeconds ?? 0,
  };
}

/**
 * Extract HR samples from Garmin activity details
 */
export function extractGarminHRSamples(
  details: GarminActivityDetails | null
): number[] | null {
  if (!details?.samples || details.samples.length === 0) {
    return null;
  }

  const hrSamples = details.samples
    .filter(s => s.heartRate !== undefined && s.heartRate > 0)
    .map(s => s.heartRate as number);

  if (hrSamples.length === 0) {
    return null;
  }

  return hrSamples;
}

// ─── Connection Management ──────────────────────────────────────────────────

/**
 * Check if client has active Garmin connection
 */
export async function hasGarminConnection(clientId: string): Promise<boolean> {
  const token = await prisma.integrationToken.findUnique({
    where: {
      clientId_type: {
        clientId,
        type: 'GARMIN',
      },
    },
  });

  return token !== null && token.syncEnabled;
}

/**
 * Disconnect Garmin integration
 */
export async function disconnectGarmin(clientId: string): Promise<void> {
  const token = await prisma.integrationToken.findUnique({
    where: {
      clientId_type: {
        clientId,
        type: 'GARMIN',
      },
    },
  });

  if (token) {
    // Note: Garmin doesn't have a token revocation endpoint
    // We just delete from our database
    await prisma.integrationToken.delete({
      where: { id: token.id },
    });
  }
}

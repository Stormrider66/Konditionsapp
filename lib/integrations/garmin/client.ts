/**
 * Garmin Health API Client
 *
 * Handles OAuth flow, API requests, and data retrieval for Garmin integration.
 * Note: Garmin uses OAuth 1.0a which requires more complex token handling.
 *
 * For initial MVP, we focus on:
 * - Activity summaries (daily activities)
 * - Sleep data
 * - Heart rate data (RHR, HRV)
 * - Body composition
 */

import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

// Garmin API configuration
const GARMIN_API_BASE = 'https://apis.garmin.com/wellness-api/rest';
const GARMIN_OAUTH_BASE = 'https://connect.garmin.com/oauthConfirm';
const GARMIN_REQUEST_TOKEN_URL = 'https://connectapi.garmin.com/oauth-service/oauth/request_token';
const GARMIN_ACCESS_TOKEN_URL = 'https://connectapi.garmin.com/oauth-service/oauth/access_token';

// Environment variables
const GARMIN_CONSUMER_KEY = process.env.GARMIN_CONSUMER_KEY || '';
const GARMIN_CONSUMER_SECRET = process.env.GARMIN_CONSUMER_SECRET || '';
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

// Store for OAuth 1.0a request tokens (temporary)
const requestTokenStore = new Map<string, { token: string; secret: string }>();

/**
 * Generate OAuth 1.0a signature
 */
function generateOAuthSignature(
  method: string,
  url: string,
  params: Record<string, string>,
  consumerSecret: string,
  tokenSecret: string = ''
): string {
  // Sort and encode parameters
  const sortedParams = Object.keys(params)
    .sort()
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');

  // Create signature base string
  const signatureBase = [
    method.toUpperCase(),
    encodeURIComponent(url),
    encodeURIComponent(sortedParams),
  ].join('&');

  // Create signing key
  const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`;

  // Generate HMAC-SHA1 signature
  const signature = crypto
    .createHmac('sha1', signingKey)
    .update(signatureBase)
    .digest('base64');

  return signature;
}

/**
 * Generate OAuth 1.0a nonce
 */
function generateNonce(): string {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Generate OAuth 1.0a timestamp
 */
function getTimestamp(): string {
  return Math.floor(Date.now() / 1000).toString();
}

/**
 * Check if Garmin API is configured
 */
export function isGarminConfigured(): boolean {
  return Boolean(GARMIN_CONSUMER_KEY && GARMIN_CONSUMER_SECRET);
}

/**
 * Step 1: Get request token (initiates OAuth flow)
 */
export async function getGarminRequestToken(clientId: string): Promise<{ authUrl: string }> {
  if (!isGarminConfigured()) {
    throw new Error('Garmin API is not configured');
  }

  const timestamp = getTimestamp();
  const nonce = generateNonce();

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: GARMIN_CONSUMER_KEY,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: timestamp,
    oauth_nonce: nonce,
    oauth_version: '1.0',
    oauth_callback: GARMIN_REDIRECT_URI,
  };

  const signature = generateOAuthSignature(
    'POST',
    GARMIN_REQUEST_TOKEN_URL,
    oauthParams,
    GARMIN_CONSUMER_SECRET
  );

  oauthParams.oauth_signature = signature;

  // Build authorization header
  const authHeader = 'OAuth ' + Object.keys(oauthParams)
    .map((key) => `${encodeURIComponent(key)}="${encodeURIComponent(oauthParams[key])}"`)
    .join(', ');

  const response = await fetch(GARMIN_REQUEST_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get Garmin request token: ${error}`);
  }

  const responseText = await response.text();
  const params = new URLSearchParams(responseText);
  const requestToken = params.get('oauth_token');
  const requestTokenSecret = params.get('oauth_token_secret');

  if (!requestToken || !requestTokenSecret) {
    throw new Error('Invalid request token response');
  }

  // Store the request token secret (needed for access token exchange)
  requestTokenStore.set(clientId, { token: requestToken, secret: requestTokenSecret });

  // Return the authorization URL
  const authUrl = `${GARMIN_OAUTH_BASE}?oauth_token=${requestToken}`;

  return { authUrl };
}

/**
 * Step 2: Exchange verifier for access token (called from callback)
 */
export async function exchangeGarminVerifier(
  clientId: string,
  oauthToken: string,
  oauthVerifier: string
): Promise<{ accessToken: string; tokenSecret: string }> {
  if (!isGarminConfigured()) {
    throw new Error('Garmin API is not configured');
  }

  // Retrieve the stored request token secret
  const storedToken = requestTokenStore.get(clientId);
  if (!storedToken || storedToken.token !== oauthToken) {
    throw new Error('Invalid or expired request token');
  }

  const timestamp = getTimestamp();
  const nonce = generateNonce();

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: GARMIN_CONSUMER_KEY,
    oauth_token: oauthToken,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: timestamp,
    oauth_nonce: nonce,
    oauth_version: '1.0',
    oauth_verifier: oauthVerifier,
  };

  const signature = generateOAuthSignature(
    'POST',
    GARMIN_ACCESS_TOKEN_URL,
    oauthParams,
    GARMIN_CONSUMER_SECRET,
    storedToken.secret
  );

  oauthParams.oauth_signature = signature;

  // Build authorization header
  const authHeader = 'OAuth ' + Object.keys(oauthParams)
    .map((key) => `${encodeURIComponent(key)}="${encodeURIComponent(oauthParams[key])}"`)
    .join(', ');

  const response = await fetch(GARMIN_ACCESS_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get Garmin access token: ${error}`);
  }

  const responseText = await response.text();
  const params = new URLSearchParams(responseText);
  const accessToken = params.get('oauth_token');
  const tokenSecret = params.get('oauth_token_secret');

  if (!accessToken || !tokenSecret) {
    throw new Error('Invalid access token response');
  }

  // Clean up stored request token
  requestTokenStore.delete(clientId);

  return { accessToken, tokenSecret };
}

/**
 * Make authenticated request to Garmin API
 */
export async function garminApiRequest<T>(
  clientId: string,
  endpoint: string,
  method: string = 'GET'
): Promise<T> {
  const token = await prisma.integrationToken.findUnique({
    where: {
      clientId_type: {
        clientId,
        type: 'GARMIN',
      },
    },
  });

  if (!token || !token.accessToken || !token.refreshToken) {
    throw new Error('No valid Garmin access token');
  }

  // In Garmin OAuth 1.0a, refreshToken stores the token secret
  const tokenSecret = token.refreshToken;
  const url = `${GARMIN_API_BASE}${endpoint}`;

  const timestamp = getTimestamp();
  const nonce = generateNonce();

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: GARMIN_CONSUMER_KEY,
    oauth_token: token.accessToken,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: timestamp,
    oauth_nonce: nonce,
    oauth_version: '1.0',
  };

  const signature = generateOAuthSignature(
    method,
    url,
    oauthParams,
    GARMIN_CONSUMER_SECRET,
    tokenSecret
  );

  oauthParams.oauth_signature = signature;

  // Build authorization header
  const authHeader = 'OAuth ' + Object.keys(oauthParams)
    .map((key) => `${encodeURIComponent(key)}="${encodeURIComponent(oauthParams[key])}"`)
    .join(', ');

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: authHeader,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Garmin API error: ${response.status} ${error}`);
  }

  return response.json();
}

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

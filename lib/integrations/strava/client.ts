/**
 * Strava API Client
 *
 * Handles OAuth flow, API requests, and token management for Strava integration.
 */

import { prisma } from '@/lib/prisma';

// Strava API configuration
const STRAVA_API_BASE = 'https://www.strava.com/api/v3';
const STRAVA_OAUTH_BASE = 'https://www.strava.com/oauth';

// Environment variables
const STRAVA_CLIENT_ID = process.env.STRAVA_CLIENT_ID!;
const STRAVA_CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET!;
const STRAVA_REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/strava/callback`
  : 'http://localhost:3000/api/integrations/strava/callback';

// Strava API types
export interface StravaAthlete {
  id: number;
  username: string;
  firstname: string;
  lastname: string;
  city: string;
  state: string;
  country: string;
  sex: string;
  weight: number;
  profile: string;
  profile_medium: string;
}

export interface StravaActivity {
  id: number;
  name: string;
  type: string;
  sport_type: string;
  start_date: string;
  start_date_local: string;
  timezone: string;
  distance: number; // meters
  moving_time: number; // seconds
  elapsed_time: number; // seconds
  total_elevation_gain: number; // meters
  average_speed: number; // m/s
  max_speed: number; // m/s
  average_heartrate?: number;
  max_heartrate?: number;
  average_cadence?: number;
  average_watts?: number;
  weighted_average_watts?: number;
  kilojoules?: number;
  suffer_score?: number;
  calories?: number;
  description?: string;
  workout_type?: number;
  map?: {
    id: string;
    summary_polyline: string;
    polyline?: string;
  };
  trainer: boolean;
  commute: boolean;
  manual: boolean;
  private: boolean;
  gear_id?: string;
  splits_metric?: Array<{
    distance: number;
    elapsed_time: number;
    moving_time: number;
    average_speed: number;
    average_heartrate?: number;
    pace_zone: number;
  }>;
  laps?: Array<{
    id: number;
    name: string;
    distance: number;
    elapsed_time: number;
    moving_time: number;
    start_index: number;
    end_index: number;
    average_speed: number;
    max_speed: number;
    average_heartrate?: number;
    max_heartrate?: number;
    pace_zone: number;
  }>;
}

export interface StravaTokenResponse {
  token_type: string;
  access_token: string;
  refresh_token: string;
  expires_at: number;
  expires_in: number;
  athlete: StravaAthlete;
}

/**
 * Generate Strava OAuth authorization URL
 */
export function getStravaAuthUrl(clientId: string, state?: string): string {
  const params = new URLSearchParams({
    client_id: STRAVA_CLIENT_ID,
    redirect_uri: STRAVA_REDIRECT_URI,
    response_type: 'code',
    scope: 'read,activity:read_all,profile:read_all',
    state: state || clientId,
  });

  return `${STRAVA_OAUTH_BASE}/authorize?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeStravaCode(code: string): Promise<StravaTokenResponse> {
  const response = await fetch(`${STRAVA_OAUTH_BASE}/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: STRAVA_CLIENT_ID,
      client_secret: STRAVA_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to exchange Strava code: ${error}`);
  }

  return response.json();
}

/**
 * Refresh Strava access token
 */
export async function refreshStravaToken(refreshToken: string): Promise<StravaTokenResponse> {
  const response = await fetch(`${STRAVA_OAUTH_BASE}/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: STRAVA_CLIENT_ID,
      client_secret: STRAVA_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to refresh Strava token: ${error}`);
  }

  return response.json();
}

/**
 * Get valid access token for a client, refreshing if necessary
 */
export async function getValidAccessToken(clientId: string): Promise<string | null> {
  const token = await prisma.integrationToken.findUnique({
    where: {
      clientId_type: {
        clientId,
        type: 'STRAVA',
      },
    },
  });

  if (!token) {
    return null;
  }

  // Check if token is expired (with 5 minute buffer)
  const now = new Date();
  const expiresAt = token.expiresAt ? new Date(token.expiresAt) : null;

  if (expiresAt && expiresAt.getTime() - 5 * 60 * 1000 < now.getTime()) {
    // Token is expired or about to expire, refresh it
    if (!token.refreshToken) {
      return null;
    }

    try {
      const newTokens = await refreshStravaToken(token.refreshToken);

      await prisma.integrationToken.update({
        where: { id: token.id },
        data: {
          accessToken: newTokens.access_token,
          refreshToken: newTokens.refresh_token,
          expiresAt: new Date(newTokens.expires_at * 1000),
        },
      });

      return newTokens.access_token;
    } catch (error) {
      console.error('Failed to refresh Strava token:', error);
      return null;
    }
  }

  return token.accessToken;
}

/**
 * Make authenticated request to Strava API
 */
export async function stravaApiRequest<T>(
  clientId: string,
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const accessToken = await getValidAccessToken(clientId);

  if (!accessToken) {
    throw new Error('No valid Strava access token');
  }

  const response = await fetch(`${STRAVA_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Strava API error: ${response.status} ${error}`);
  }

  return response.json();
}

/**
 * Get athlete profile
 */
export async function getStravaAthlete(clientId: string): Promise<StravaAthlete> {
  return stravaApiRequest<StravaAthlete>(clientId, '/athlete');
}

/**
 * Get recent activities
 */
export async function getStravaActivities(
  clientId: string,
  options: {
    before?: number; // Unix timestamp
    after?: number; // Unix timestamp
    page?: number;
    perPage?: number;
  } = {}
): Promise<StravaActivity[]> {
  const params = new URLSearchParams();

  if (options.before) params.set('before', options.before.toString());
  if (options.after) params.set('after', options.after.toString());
  if (options.page) params.set('page', options.page.toString());
  if (options.perPage) params.set('per_page', options.perPage.toString());

  const queryString = params.toString();
  const endpoint = `/athlete/activities${queryString ? `?${queryString}` : ''}`;

  return stravaApiRequest<StravaActivity[]>(clientId, endpoint);
}

/**
 * Get detailed activity
 */
export async function getStravaActivity(
  clientId: string,
  activityId: number | string
): Promise<StravaActivity> {
  return stravaApiRequest<StravaActivity>(
    clientId,
    `/activities/${activityId}?include_all_efforts=true`
  );
}

/**
 * Disconnect Strava integration
 */
export async function disconnectStrava(clientId: string): Promise<void> {
  const token = await prisma.integrationToken.findUnique({
    where: {
      clientId_type: {
        clientId,
        type: 'STRAVA',
      },
    },
  });

  if (token) {
    // Revoke token with Strava
    try {
      await fetch(`${STRAVA_OAUTH_BASE}/deauthorize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          access_token: token.accessToken,
        }),
      });
    } catch (error) {
      console.error('Failed to revoke Strava token:', error);
    }

    // Delete from database
    await prisma.integrationToken.delete({
      where: { id: token.id },
    });
  }
}

/**
 * Check if client has active Strava connection
 */
export async function hasStravaConnection(clientId: string): Promise<boolean> {
  const token = await prisma.integrationToken.findUnique({
    where: {
      clientId_type: {
        clientId,
        type: 'STRAVA',
      },
    },
  });

  return token !== null;
}

/**
 * Concept2 Logbook API Client
 *
 * Handles OAuth flow, API requests, and token management for Concept2 integration.
 * Supports RowErg, SkiErg, BikeErg, and other Concept2 equipment.
 */

import 'server-only'

import { prisma } from '@/lib/prisma';
import { decryptIntegrationSecret, encryptIntegrationSecret } from '@/lib/integrations/crypto'
import { fetchWithTimeoutAndRetry } from '@/lib/http/fetch'
import { logger } from '@/lib/logger'
import type {
  Concept2TokenResponse,
  Concept2User,
  Concept2Result,
  Concept2ResultsResponse,
  Concept2SingleResultResponse,
  Concept2EquipmentType,
} from './types';

// Concept2 API configuration
const CONCEPT2_API_BASE = process.env.CONCEPT2_USE_DEV_SERVER === 'true'
  ? 'https://log-dev.concept2.com/api'
  : 'https://log.concept2.com/api';

const CONCEPT2_OAUTH_BASE = process.env.CONCEPT2_USE_DEV_SERVER === 'true'
  ? 'https://log-dev.concept2.com/oauth'
  : 'https://log.concept2.com/oauth';

// Environment variables
const CONCEPT2_CLIENT_ID = process.env.CONCEPT2_CLIENT_ID!;
const CONCEPT2_CLIENT_SECRET = process.env.CONCEPT2_CLIENT_SECRET!;
const CONCEPT2_REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/concept2/callback`
  : 'http://localhost:3000/api/integrations/concept2/callback';

// Default scopes - request read access for user profile and results
const CONCEPT2_SCOPES = 'user:read,results:read';

/**
 * Generate Concept2 OAuth authorization URL
 */
export function getConcept2AuthUrl(clientId: string, state?: string): string {
  const params = new URLSearchParams({
    client_id: CONCEPT2_CLIENT_ID,
    redirect_uri: CONCEPT2_REDIRECT_URI,
    response_type: 'code',
    scope: CONCEPT2_SCOPES,
    state: state || clientId,
  });

  return `${CONCEPT2_OAUTH_BASE}/authorize?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeConcept2Code(code: string): Promise<Concept2TokenResponse> {
  const response = await fetchWithTimeoutAndRetry(
    `${CONCEPT2_OAUTH_BASE}/access_token`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: CONCEPT2_CLIENT_ID,
        client_secret: CONCEPT2_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: CONCEPT2_REDIRECT_URI,
        scope: CONCEPT2_SCOPES,
      }).toString(),
    },
    { timeoutMs: 10_000, maxAttempts: 2 }
  )

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to exchange Concept2 code: ${error}`);
  }

  return response.json();
}

/**
 * Refresh Concept2 access token
 */
export async function refreshConcept2Token(refreshToken: string): Promise<Concept2TokenResponse> {
  const response = await fetchWithTimeoutAndRetry(
    `${CONCEPT2_OAUTH_BASE}/access_token`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: CONCEPT2_CLIENT_ID,
        client_secret: CONCEPT2_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
        scope: CONCEPT2_SCOPES,
      }).toString(),
    },
    { timeoutMs: 10_000, maxAttempts: 2 }
  )

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to refresh Concept2 token: ${error}`);
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
        type: 'CONCEPT2',
      },
    },
  });

  if (!token) {
    return null;
  }

  const accessToken = decryptIntegrationSecret(token.accessToken)
  const refreshToken = decryptIntegrationSecret(token.refreshToken)
  if (!accessToken) return null

  // Check if token is expired (with 5 minute buffer)
  const now = new Date();
  const expiresAt = token.expiresAt ? new Date(token.expiresAt) : null;

  if (expiresAt && expiresAt.getTime() - 5 * 60 * 1000 < now.getTime()) {
    // Token is expired or about to expire, refresh it
    if (!refreshToken) {
      return null;
    }

    try {
      const newTokens = await refreshConcept2Token(refreshToken);

      // Calculate new expiration time
      const newExpiresAt = new Date(Date.now() + newTokens.expires_in * 1000);

      await prisma.integrationToken.update({
        where: { id: token.id },
        data: {
          accessToken: encryptIntegrationSecret(newTokens.access_token)!,
          refreshToken: encryptIntegrationSecret(newTokens.refresh_token),
          expiresAt: newExpiresAt,
        },
      });

      return newTokens.access_token;
    } catch (error) {
      logger.error('Failed to refresh Concept2 token', { clientId }, error)
      return null;
    }
  }

  return accessToken;
}

/**
 * Make authenticated request to Concept2 API
 */
export async function concept2ApiRequest<T>(
  clientId: string,
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const accessToken = await getValidAccessToken(clientId);

  if (!accessToken) {
    throw new Error('No valid Concept2 access token');
  }

  const response = await fetchWithTimeoutAndRetry(
    `${CONCEPT2_API_BASE}${endpoint}`,
    {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    },
    { timeoutMs: 10_000, maxAttempts: 3 }
  )

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Concept2 API error: ${response.status} ${error}`);
  }

  return response.json();
}

/**
 * Get user profile
 */
export async function getConcept2User(clientId: string): Promise<Concept2User> {
  // First get the external user ID from our token
  const token = await prisma.integrationToken.findUnique({
    where: {
      clientId_type: {
        clientId,
        type: 'CONCEPT2',
      },
    },
  });

  if (!token || !token.externalUserId) {
    throw new Error('No Concept2 user ID found');
  }

  const response = await concept2ApiRequest<{ data: Concept2User }>(
    clientId,
    `/users/${token.externalUserId}`
  );

  return response.data;
}

/**
 * Get user's workout results with filtering
 */
export async function getConcept2Results(
  clientId: string,
  options: {
    from?: string; // YYYY-MM-DD
    to?: string; // YYYY-MM-DD
    type?: Concept2EquipmentType;
    updatedAfter?: string; // For incremental sync
    limit?: number;
    offset?: number;
  } = {}
): Promise<Concept2Result[]> {
  // Get external user ID
  const token = await prisma.integrationToken.findUnique({
    where: {
      clientId_type: {
        clientId,
        type: 'CONCEPT2',
      },
    },
  });

  if (!token || !token.externalUserId) {
    throw new Error('No Concept2 user ID found');
  }

  const params = new URLSearchParams();

  if (options.from) params.set('from', options.from);
  if (options.to) params.set('to', options.to);
  if (options.type) params.set('type', options.type);
  if (options.updatedAfter) params.set('updated_after', options.updatedAfter);
  if (options.limit) params.set('limit', options.limit.toString());
  if (options.offset) params.set('offset', options.offset.toString());

  const queryString = params.toString();
  const endpoint = `/users/${token.externalUserId}/results${queryString ? `?${queryString}` : ''}`;

  const response = await concept2ApiRequest<Concept2ResultsResponse>(clientId, endpoint);

  return response.data;
}

/**
 * Get a single result with full details
 */
export async function getConcept2Result(
  clientId: string,
  resultId: number
): Promise<Concept2Result> {
  // Get external user ID
  const token = await prisma.integrationToken.findUnique({
    where: {
      clientId_type: {
        clientId,
        type: 'CONCEPT2',
      },
    },
  });

  if (!token || !token.externalUserId) {
    throw new Error('No Concept2 user ID found');
  }

  const response = await concept2ApiRequest<Concept2SingleResultResponse>(
    clientId,
    `/users/${token.externalUserId}/results/${resultId}`
  );

  return response.data;
}

/**
 * Disconnect Concept2 integration
 * Note: Unlike Strava, we keep historical results as per user request
 */
export async function disconnectConcept2(clientId: string): Promise<void> {
  const token = await prisma.integrationToken.findUnique({
    where: {
      clientId_type: {
        clientId,
        type: 'CONCEPT2',
      },
    },
  });

  if (token) {
    // Concept2 doesn't have a deauthorize endpoint - just remove the token
    // Note: User would need to revoke access from their Concept2 account settings
    await prisma.integrationToken.delete({
      where: { id: token.id },
    });

    // We intentionally DO NOT delete concept2Results here
    // Historical data is preserved as per user requirement
    logger.info('Concept2 integration disconnected (results preserved)', { clientId })
  }
}

/**
 * Check if client has active Concept2 connection
 */
export async function hasConcept2Connection(clientId: string): Promise<boolean> {
  const token = await prisma.integrationToken.findUnique({
    where: {
      clientId_type: {
        clientId,
        type: 'CONCEPT2',
      },
    },
  });

  return token !== null && token.syncEnabled;
}

/**
 * Get connection status with details
 */
export async function getConcept2ConnectionStatus(clientId: string): Promise<{
  connected: boolean;
  userId?: string;
  username?: string;
  lastSyncAt?: Date;
  lastSyncError?: string;
  syncEnabled?: boolean;
}> {
  const token = await prisma.integrationToken.findUnique({
    where: {
      clientId_type: {
        clientId,
        type: 'CONCEPT2',
      },
    },
  });

  if (!token) {
    return { connected: false };
  }

  return {
    connected: true,
    userId: token.externalUserId || undefined,
    lastSyncAt: token.lastSyncAt || undefined,
    lastSyncError: token.lastSyncError || undefined,
    syncEnabled: token.syncEnabled,
  };
}

/**
 * Concept2 OAuth Callback
 *
 * GET /api/integrations/concept2/callback - Handle OAuth callback from Concept2
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { exchangeConcept2Code, concept2ApiRequest } from '@/lib/integrations/concept2';
import type { Concept2User } from '@/lib/integrations/concept2';
import { canAccessClient, getCurrentUser } from '@/lib/auth-utils';
import { encryptIntegrationSecret } from '@/lib/integrations/crypto';
import { logger } from '@/lib/logger'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

/**
 * GET - Handle OAuth callback from Concept2
 *
 * Query params:
 * - code: Authorization code from Concept2
 * - state: Client ID (passed during auth initiation)
 * - error: Error message (if auth was denied)
 * - error_description: Detailed error message
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const code = searchParams.get('code');
  const state = searchParams.get('state'); // This is the clientId
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  // Handle authorization denial
  if (error) {
    logger.info('Concept2 auth denied by user', {
      error,
      hasErrorDescription: Boolean(errorDescription),
    })
    return NextResponse.redirect(
      `${APP_URL}/athlete/settings?error=concept2_denied&message=${encodeURIComponent(errorDescription || error)}`
    );
  }

  // Validate required params
  if (!code || !state) {
    logger.warn('Missing code or state in Concept2 callback')
    return NextResponse.redirect(
      `${APP_URL}/athlete/settings?error=concept2_invalid_callback`
    );
  }

  const clientId = state;

  try {
    // Verify user is authenticated and allowed to connect integrations for this client
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.redirect(
        `${APP_URL}/login?redirect=${encodeURIComponent('/athlete/settings')}`
      );
    }

    const hasAccess = await canAccessClient(user.id, clientId)
    if (!hasAccess) {
      return NextResponse.redirect(
        `${APP_URL}/athlete/settings?error=concept2_forbidden`
      );
    }

    // Verify client exists
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true, name: true },
    });

    if (!client) {
      logger.warn('Client not found in Concept2 callback', { clientId })
      return NextResponse.redirect(
        `${APP_URL}/athlete/settings?error=concept2_client_not_found`
      );
    }

    // Exchange code for tokens
    const tokenResponse = await exchangeConcept2Code(code);

    // Calculate expiration time
    const expiresAt = new Date(Date.now() + tokenResponse.expires_in * 1000);

    // Store tokens temporarily to fetch user info
    await prisma.integrationToken.upsert({
      where: {
        clientId_type: {
          clientId,
          type: 'CONCEPT2',
        },
      },
      update: {
        accessToken: encryptIntegrationSecret(tokenResponse.access_token)!,
        refreshToken: encryptIntegrationSecret(tokenResponse.refresh_token),
        expiresAt,
        scope: 'user:read,results:read',
        lastSyncError: null,
        syncEnabled: true,
      },
      create: {
        clientId,
        type: 'CONCEPT2',
        accessToken: encryptIntegrationSecret(tokenResponse.access_token)!,
        refreshToken: encryptIntegrationSecret(tokenResponse.refresh_token),
        expiresAt,
        scope: 'user:read,results:read',
        syncEnabled: true,
      },
    });

    // Fetch user info to get the external user ID
    let userId: string | undefined;
    let username: string | undefined;

    try {
      // Use the token to fetch the current user's info
      // Concept2 API: GET /api/users/me returns the authenticated user
      const userResponse = await fetch(
        `${process.env.CONCEPT2_USE_DEV_SERVER === 'true' ? 'https://log-dev.concept2.com' : 'https://log.concept2.com'}/api/users/me`,
        {
          headers: {
            Authorization: `Bearer ${tokenResponse.access_token}`,
            Accept: 'application/json',
          },
        }
      );

      if (userResponse.ok) {
        const userData = (await userResponse.json()) as { data: Concept2User };
        userId = userData.data.id.toString();
        username = userData.data.username;

        // Update token with user ID
        await prisma.integrationToken.updateMany({
          where: {
            clientId,
            type: 'CONCEPT2',
          },
          data: {
            externalUserId: userId,
          },
        });
      }
    } catch (userError) {
      logger.warn('Could not fetch Concept2 user info', {}, userError)
      // Continue anyway - sync will work, we just won't have the user ID cached
    }

    logger.info('Concept2 connected', { clientId, userId: userId || undefined })

    // Redirect to success page
    const successUrl = new URL(`${APP_URL}/athlete/settings`);
    successUrl.searchParams.set('success', 'concept2_connected');
    if (userId) successUrl.searchParams.set('userId', userId);
    if (username) successUrl.searchParams.set('username', username);

    return NextResponse.redirect(successUrl.toString());
  } catch (error) {
    logger.error('Concept2 callback error', { clientId }, error)

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.redirect(
      `${APP_URL}/athlete/settings?error=concept2_callback_failed&message=${encodeURIComponent(errorMessage)}`
    );
  }
}

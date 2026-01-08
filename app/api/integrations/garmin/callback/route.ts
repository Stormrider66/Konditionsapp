/**
 * Garmin OAuth Callback
 *
 * GET /api/integrations/garmin/callback - Handle OAuth callback from Garmin
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { exchangeGarminVerifier } from '@/lib/integrations/garmin/client';
import { canAccessClient, getCurrentUser } from '@/lib/auth-utils';
import { encryptIntegrationSecret } from '@/lib/integrations/crypto';
import { logger } from '@/lib/logger'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

/**
 * GET - Handle OAuth 1.0a callback from Garmin
 *
 * Query params:
 * - oauth_token: The request token
 * - oauth_verifier: Verification code from Garmin
 *
 * Note: Client ID is stored in memory during request token phase
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const oauthToken = searchParams.get('oauth_token');
  const oauthVerifier = searchParams.get('oauth_verifier');

  // Handle authorization denial
  if (!oauthToken || !oauthVerifier) {
    logger.warn('Missing oauth_token or oauth_verifier in Garmin callback')
    return NextResponse.redirect(
      `${APP_URL}/athlete/settings?error=garmin_invalid_callback`
    );
  }

  try {
    // We need to look up which client this token belongs to
    // This is done by checking our temporary storage in the client module
    // For a production system, you'd want to use a proper session store

    // Try to find the client by iterating through recent integration tokens
    // that have the oauth_token stored (we'll use a query param or cookie for this)
    const clientId = searchParams.get('state');

    if (!clientId) {
      logger.warn('No client ID found for Garmin callback')
      return NextResponse.redirect(
        `${APP_URL}/athlete/settings?error=garmin_no_client`
      );
    }

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
        `${APP_URL}/athlete/settings?error=garmin_forbidden`
      );
    }

    // Exchange verifier for access token
    const { accessToken, tokenSecret } = await exchangeGarminVerifier(
      clientId,
      oauthToken,
      oauthVerifier
    );

    // Store tokens in database
    // Note: For Garmin OAuth 1.0a, we store the token secret in refreshToken field
    await prisma.integrationToken.upsert({
      where: {
        clientId_type: {
          clientId,
          type: 'GARMIN',
        },
      },
      update: {
        accessToken: encryptIntegrationSecret(accessToken)!,
        refreshToken: encryptIntegrationSecret(tokenSecret), // Store token secret here
        expiresAt: null, // Garmin tokens don't expire
        lastSyncError: null,
        syncEnabled: true,
      },
      create: {
        clientId,
        type: 'GARMIN',
        accessToken: encryptIntegrationSecret(accessToken)!,
        refreshToken: encryptIntegrationSecret(tokenSecret),
        expiresAt: null,
        syncEnabled: true,
      },
    });

    logger.info('Garmin connected', { clientId })

    // Redirect to success page
    return NextResponse.redirect(
      `${APP_URL}/athlete/settings?success=garmin_connected`
    );
  } catch (error) {
    logger.error('Garmin callback error', {}, error)

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.redirect(
      `${APP_URL}/athlete/settings?error=garmin_callback_failed&message=${encodeURIComponent(errorMessage)}`
    );
  }
}

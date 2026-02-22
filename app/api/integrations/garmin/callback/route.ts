/**
 * Garmin OAuth 2.0 Callback
 *
 * GET /api/integrations/garmin/callback - Handle OAuth 2.0 PKCE callback from Garmin
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { exchangeGarminCode, findClientIdByState } from '@/lib/integrations/garmin/client';
import { canAccessClient, getCurrentUser } from '@/lib/auth-utils';
import { decryptIntegrationSecret, encryptIntegrationSecret } from '@/lib/integrations/crypto';
import { logger } from '@/lib/logger'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

/**
 * GET - Handle OAuth 2.0 PKCE callback from Garmin
 *
 * Query params:
 * - code: Authorization code
 * - state: State parameter (used to recover clientId and validate CSRF)
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  // Handle authorization denial
  if (error) {
    logger.warn('Garmin OAuth denied', { error })
    return NextResponse.redirect(
      `${APP_URL}/athlete/settings?error=garmin_denied`
    );
  }

  if (!code || !state) {
    logger.warn('Missing code or state in Garmin callback')
    return NextResponse.redirect(
      `${APP_URL}/athlete/settings?error=garmin_invalid_callback`
    );
  }

  try {
    // Recover clientId from state parameter
    const clientId = await findClientIdByState(state);

    if (!clientId) {
      logger.warn('No client ID found for Garmin callback (state not in OAuthRequestToken table)')
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

    // Retrieve and delete stored PKCE code_verifier (validates state + expiry)
    const storedPKCE = await prisma.oAuthRequestToken.findUnique({
      where: {
        clientId_provider: {
          clientId,
          provider: 'GARMIN',
        },
      },
    });

    if (!storedPKCE || storedPKCE.state !== state || storedPKCE.expiresAt < new Date()) {
      logger.warn('Invalid or expired PKCE state in Garmin callback')
      return NextResponse.redirect(
        `${APP_URL}/athlete/settings?error=garmin_invalid_state`
      );
    }

    const codeVerifier = decryptIntegrationSecret(storedPKCE.codeVerifier);

    if (!codeVerifier) {
      logger.warn('Failed to decrypt code_verifier')
      return NextResponse.redirect(
        `${APP_URL}/athlete/settings?error=garmin_callback_failed`
      );
    }

    // Delete PKCE state (one-time use)
    await prisma.oAuthRequestToken.delete({ where: { id: storedPKCE.id } });

    // Exchange authorization code for tokens
    const tokens = await exchangeGarminCode(code, codeVerifier);

    // Calculate token expiry
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    // Store tokens in database
    await prisma.integrationToken.upsert({
      where: {
        clientId_type: {
          clientId,
          type: 'GARMIN',
        },
      },
      update: {
        accessToken: encryptIntegrationSecret(tokens.access_token)!,
        refreshToken: encryptIntegrationSecret(tokens.refresh_token),
        expiresAt,
        lastSyncError: null,
        syncEnabled: true,
      },
      create: {
        clientId,
        type: 'GARMIN',
        accessToken: encryptIntegrationSecret(tokens.access_token)!,
        refreshToken: encryptIntegrationSecret(tokens.refresh_token),
        expiresAt,
        syncEnabled: true,
      },
    });

    logger.info('Garmin connected', { clientId })

    // Redirect to success page
    return NextResponse.redirect(
      `${APP_URL}/athlete/settings?success=garmin_connected`
    );
  } catch (err) {
    logger.error('Garmin callback error', {}, err)

    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.redirect(
      `${APP_URL}/athlete/settings?error=garmin_callback_failed&message=${encodeURIComponent(errorMessage)}`
    );
  }
}

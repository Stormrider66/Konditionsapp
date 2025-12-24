/**
 * Garmin OAuth Callback
 *
 * GET /api/integrations/garmin/callback - Handle OAuth callback from Garmin
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { exchangeGarminVerifier } from '@/lib/integrations/garmin/client';

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
    console.error('Missing oauth_token or oauth_verifier in Garmin callback');
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
      console.error('No client ID found for Garmin callback');
      return NextResponse.redirect(
        `${APP_URL}/athlete/settings?error=garmin_no_client`
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
        accessToken,
        refreshToken: tokenSecret, // Store token secret here
        expiresAt: null, // Garmin tokens don't expire
        lastSyncError: null,
        syncEnabled: true,
      },
      create: {
        clientId,
        type: 'GARMIN',
        accessToken,
        refreshToken: tokenSecret,
        expiresAt: null,
        syncEnabled: true,
      },
    });

    console.log(`Garmin connected for client ${clientId}`);

    // Redirect to success page
    return NextResponse.redirect(
      `${APP_URL}/athlete/settings?success=garmin_connected`
    );
  } catch (error) {
    console.error('Garmin callback error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.redirect(
      `${APP_URL}/athlete/settings?error=garmin_callback_failed&message=${encodeURIComponent(errorMessage)}`
    );
  }
}

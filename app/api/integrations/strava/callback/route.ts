/**
 * Strava OAuth Callback
 *
 * GET /api/integrations/strava/callback - Handle OAuth callback from Strava
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { exchangeStravaCode } from '@/lib/integrations/strava/client';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

/**
 * GET - Handle OAuth callback from Strava
 *
 * Query params:
 * - code: Authorization code from Strava
 * - state: Client ID (passed during auth initiation)
 * - scope: Scopes granted by user
 * - error: Error message (if auth was denied)
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const code = searchParams.get('code');
  const state = searchParams.get('state'); // This is the clientId
  const scope = searchParams.get('scope');
  const error = searchParams.get('error');

  // Handle authorization denial
  if (error) {
    console.error('Strava auth denied:', error);
    return NextResponse.redirect(
      `${APP_URL}/athlete/settings?error=strava_denied&message=${encodeURIComponent(error)}`
    );
  }

  // Validate required params
  if (!code || !state) {
    console.error('Missing code or state in Strava callback');
    return NextResponse.redirect(
      `${APP_URL}/athlete/settings?error=strava_invalid_callback`
    );
  }

  const clientId = state;

  try {
    // Verify client exists
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true, name: true },
    });

    if (!client) {
      console.error('Client not found:', clientId);
      return NextResponse.redirect(
        `${APP_URL}/athlete/settings?error=strava_client_not_found`
      );
    }

    // Exchange code for tokens
    const tokenResponse = await exchangeStravaCode(code);

    // Store tokens in database
    await prisma.integrationToken.upsert({
      where: {
        clientId_type: {
          clientId,
          type: 'STRAVA',
        },
      },
      update: {
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
        expiresAt: new Date(tokenResponse.expires_at * 1000),
        externalUserId: tokenResponse.athlete.id.toString(),
        scope: scope || 'read,activity:read_all,profile:read_all',
        lastSyncError: null,
        syncEnabled: true,
      },
      create: {
        clientId,
        type: 'STRAVA',
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
        expiresAt: new Date(tokenResponse.expires_at * 1000),
        externalUserId: tokenResponse.athlete.id.toString(),
        scope: scope || 'read,activity:read_all,profile:read_all',
        syncEnabled: true,
      },
    });

    console.log(`Strava connected for client ${clientId}, athlete ${tokenResponse.athlete.id}`);

    // Redirect to success page
    return NextResponse.redirect(
      `${APP_URL}/athlete/settings?success=strava_connected&athleteId=${tokenResponse.athlete.id}`
    );
  } catch (error) {
    console.error('Strava callback error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.redirect(
      `${APP_URL}/athlete/settings?error=strava_callback_failed&message=${encodeURIComponent(errorMessage)}`
    );
  }
}

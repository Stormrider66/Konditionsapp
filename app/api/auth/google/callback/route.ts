/**
 * Google OAuth Callback
 *
 * GET /api/auth/google/callback - Handle Google OAuth callback for calendar access
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { encryptIntegrationSecret } from '@/lib/integrations/crypto'
import { logger } from '@/lib/logger'

interface GoogleTokenResponse {
  access_token: string
  refresh_token?: string
  expires_in: number
  token_type: string
  scope: string
}

interface GoogleCalendarListResponse {
  kind: string
  etag: string
  items: Array<{
    id: string
    summary: string
    description?: string
    primary?: boolean
    accessRole: string
    backgroundColor?: string
  }>
}

/**
 * GET /api/auth/google/callback
 * Handle Google OAuth callback
 */
export async function GET(request: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state') // Connection ID
    const error = searchParams.get('error')

    if (error) {
      logger.info('Google OAuth denied by user', { error })
      return NextResponse.redirect(
        `${baseUrl}/athlete/settings/calendars?error=oauth_denied`
      )
    }

    if (!code || !state) {
      return NextResponse.redirect(
        `${baseUrl}/athlete/settings/calendars?error=missing_params`
      )
    }

    // Verify user is authenticated
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.redirect(`${baseUrl}/login?redirect=/athlete/settings/calendars`)
    }

    // Find the connection
    const connection = await prisma.externalCalendarConnection.findUnique({
      where: { id: state },
      include: {
        client: {
          include: { athleteAccount: true },
        },
      },
    })

    if (!connection) {
      return NextResponse.redirect(
        `${baseUrl}/athlete/settings/calendars?error=connection_not_found`
      )
    }

    // Verify the user has access to this connection
    const dbUser = await prisma.user.findUnique({
      where: { email: user.email },
    })

    if (!dbUser) {
      return NextResponse.redirect(
        `${baseUrl}/athlete/settings/calendars?error=user_not_found`
      )
    }

    if (!connection.client) {
      return NextResponse.redirect(
        `${baseUrl}/athlete/settings/calendars?error=client_not_found`
      )
    }

    const isCoach = connection.client.userId === dbUser.id
    const isAthlete = connection.client.athleteAccount?.userId === dbUser.id

    if (!isCoach && !isAthlete) {
      return NextResponse.redirect(
        `${baseUrl}/athlete/settings/calendars?error=forbidden`
      )
    }

    // Exchange code for tokens
    const googleClientId = process.env.GOOGLE_CLIENT_ID
    const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET

    if (!googleClientId || !googleClientSecret) {
      return NextResponse.redirect(
        `${baseUrl}/athlete/settings/calendars?error=google_not_configured`
      )
    }

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: googleClientId,
        client_secret: googleClientSecret,
        redirect_uri: `${baseUrl}/api/auth/google/callback`,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenResponse.ok) {
      logger.error('Google token exchange failed', { status: tokenResponse.status })
      return NextResponse.redirect(
        `${baseUrl}/athlete/settings/calendars?error=token_exchange_failed`
      )
    }

    const tokens: GoogleTokenResponse = await tokenResponse.json()

    // Fetch calendar list to get the primary calendar
    const calendarsResponse = await fetch(
      'https://www.googleapis.com/calendar/v3/users/me/calendarList',
      {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
        },
      }
    )

    if (!calendarsResponse.ok) {
      logger.error('Failed to fetch Google calendars', { status: calendarsResponse.status })
      return NextResponse.redirect(
        `${baseUrl}/athlete/settings/calendars?error=calendar_fetch_failed`
      )
    }

    const calendars: GoogleCalendarListResponse = await calendarsResponse.json()
    const primaryCalendar = calendars.items.find((c) => c.primary) || calendars.items[0]

    if (!primaryCalendar) {
      return NextResponse.redirect(
        `${baseUrl}/athlete/settings/calendars?error=no_calendars_found`
      )
    }

    // Update the connection with tokens and calendar info
    await prisma.externalCalendarConnection.update({
      where: { id: connection.id },
      data: {
        calendarId: primaryCalendar.id,
        calendarName: primaryCalendar.summary || connection.calendarName,
        accessToken: encryptIntegrationSecret(tokens.access_token),
        refreshToken: encryptIntegrationSecret(tokens.refresh_token),
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        syncEnabled: true,
        lastSyncError: null,
        color: primaryCalendar.backgroundColor || connection.color,
      },
    })

    // Trigger initial sync
    try {
      const syncResponse = await fetch(
        `${baseUrl}/api/calendar/external/${connection.id}/sync`,
        {
          method: 'POST',
          headers: {
            Cookie: request.headers.get('cookie') || '',
          },
        }
      )

      if (!syncResponse.ok) {
        logger.warn('Initial calendar sync failed', { status: syncResponse.status })
      }
    } catch (syncError) {
      logger.warn('Initial calendar sync error', {}, syncError)
    }

    // Redirect to success page
    return NextResponse.redirect(
      `${baseUrl}/athlete/settings/calendars?success=google_connected&calendar=${encodeURIComponent(primaryCalendar.summary)}`
    )
  } catch (error) {
    logger.error('Google OAuth callback error', {}, error)
    return NextResponse.redirect(
      `${baseUrl}/athlete/settings/calendars?error=internal_error`
    )
  }
}

/**
 * WHOOP OAuth callback.
 *
 * Exchanges authorization codes for tokens, stores encrypted credentials, and
 * triggers a short initial sync for the newly connected athlete.
 */

import { NextRequest, NextResponse } from 'next/server'

import { canAccessClient, getCurrentUser } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { consumeWhoopOAuthState, exchangeWhoopCode, getWhoopProfile } from '@/lib/integrations/whoop/client'
import { encryptIntegrationSecret } from '@/lib/integrations/crypto'
import { syncWhoopData } from '@/lib/integrations/whoop/sync'
import { logger } from '@/lib/logger'

function settingsPath(businessSlug?: string): string {
  return businessSlug ? `/${businessSlug}/athlete/settings` : '/athlete/settings'
}

export async function GET(request: NextRequest) {
  const appUrl = request.nextUrl.origin
  const params = request.nextUrl.searchParams

  const code = params.get('code')
  const state = params.get('state')
  const error = params.get('error')
  const scope = params.get('scope')

  if (error) {
    logger.info('WHOOP auth denied by user', { error })
    return NextResponse.redirect(`${appUrl}/athlete/settings?error=whoop_denied&message=${encodeURIComponent(error)}`)
  }

  if (!code || !state) {
    logger.warn('Missing code or state in WHOOP callback')
    return NextResponse.redirect(`${appUrl}/athlete/settings?error=whoop_invalid_callback`)
  }

  const stateRecord = await consumeWhoopOAuthState(state)
  if (!stateRecord) {
    logger.warn('Invalid or expired WHOOP OAuth state')
    return NextResponse.redirect(`${appUrl}/athlete/settings?error=whoop_invalid_state`)
  }

  const { clientId, businessSlug } = stateRecord

  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.redirect(`${appUrl}/login?redirect=${encodeURIComponent(settingsPath(businessSlug))}`)
    }

    const hasAccess = await canAccessClient(user.id, clientId)
    if (!hasAccess) {
      return NextResponse.redirect(`${appUrl}${settingsPath(businessSlug)}?error=whoop_forbidden`)
    }

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true },
    })
    if (!client) {
      logger.warn('Client not found in WHOOP callback', { clientId })
      return NextResponse.redirect(`${appUrl}${settingsPath(businessSlug)}?error=whoop_client_not_found`)
    }

    const tokens = await exchangeWhoopCode(code, appUrl)
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000)

    let externalUserId: string | undefined
    try {
      const profile = await getWhoopProfile(tokens.access_token)
      externalUserId = String(profile.user_id)
    } catch (profileError) {
      logger.warn('Could not fetch WHOOP profile during callback', { clientId }, profileError)
    }

    await prisma.integrationToken.upsert({
      where: { clientId_type: { clientId, type: 'WHOOP' } },
      update: {
        accessToken: encryptIntegrationSecret(tokens.access_token)!,
        refreshToken: encryptIntegrationSecret(tokens.refresh_token ?? null),
        expiresAt,
        externalUserId,
        scope: scope || tokens.scope || null,
        lastSyncError: null,
        syncEnabled: true,
      },
      create: {
        clientId,
        type: 'WHOOP',
        accessToken: encryptIntegrationSecret(tokens.access_token)!,
        refreshToken: encryptIntegrationSecret(tokens.refresh_token ?? null),
        expiresAt,
        externalUserId,
        scope: scope || tokens.scope || null,
        syncEnabled: true,
      },
    })

    logger.info('WHOOP connected', { clientId, externalUserId })

    syncWhoopData(clientId, { daysBack: 7 }).catch(error => {
      logger.error('Initial WHOOP sync failed', { clientId }, error)
    })

    return NextResponse.redirect(`${appUrl}${settingsPath(businessSlug)}?success=whoop_connected`)
  } catch (err) {
    logger.error('WHOOP callback error', { clientId }, err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.redirect(
      `${appUrl}${settingsPath(businessSlug)}?error=whoop_callback_failed&message=${encodeURIComponent(message)}`,
    )
  }
}

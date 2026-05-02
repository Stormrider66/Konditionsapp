/**
 * Oura OAuth Callback
 *
 * GET /api/integrations/oura/callback
 *
 * Exchanges the authorization code for access/refresh tokens, encrypts them,
 * and persists into IntegrationToken (type=OURA).
 */

import { NextRequest, NextResponse } from 'next/server'

import { canAccessClient, getCurrentUser } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { exchangeOuraCode } from '@/lib/integrations/oura/auth'
import { getOuraPersonalInfo } from '@/lib/integrations/oura/client'
import { encryptIntegrationSecret } from '@/lib/integrations/crypto'
import { logger } from '@/lib/logger'

function parseState(state: string): { clientId: string; businessSlug?: string } {
  const i = state.indexOf(':')
  if (i > 0) {
    return { clientId: state.substring(0, i), businessSlug: state.substring(i + 1) }
  }
  return { clientId: state }
}

function settingsPath(businessSlug?: string): string {
  return businessSlug ? `/${businessSlug}/athlete/settings` : '/athlete/settings'
}

export async function GET(request: NextRequest) {
  const APP_URL = request.nextUrl.origin
  const params = request.nextUrl.searchParams

  const code = params.get('code')
  const stateParam = params.get('state')
  const error = params.get('error')
  const scope = params.get('scope')

  const { clientId, businessSlug } = stateParam
    ? parseState(stateParam)
    : { clientId: '', businessSlug: undefined }

  if (error) {
    logger.info('Oura auth denied by user', { error })
    return NextResponse.redirect(
      `${APP_URL}${settingsPath(businessSlug)}?error=oura_denied&message=${encodeURIComponent(error)}`,
    )
  }

  if (!code || !stateParam) {
    logger.warn('Missing code or state in Oura callback')
    return NextResponse.redirect(
      `${APP_URL}${settingsPath(businessSlug)}?error=oura_invalid_callback`,
    )
  }

  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.redirect(
        `${APP_URL}/login?redirect=${encodeURIComponent(settingsPath(businessSlug))}`,
      )
    }

    const hasAccess = await canAccessClient(user.id, clientId)
    if (!hasAccess) {
      return NextResponse.redirect(`${APP_URL}${settingsPath(businessSlug)}?error=oura_forbidden`)
    }

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true },
    })
    if (!client) {
      logger.warn('Client not found in Oura callback', { clientId })
      return NextResponse.redirect(
        `${APP_URL}${settingsPath(businessSlug)}?error=oura_client_not_found`,
      )
    }

    const tokenResponse = await exchangeOuraCode(code, APP_URL)
    const expiresAt = new Date(Date.now() + tokenResponse.expires_in * 1000)

    await prisma.integrationToken.upsert({
      where: { clientId_type: { clientId, type: 'OURA' } },
      update: {
        accessToken: encryptIntegrationSecret(tokenResponse.access_token)!,
        refreshToken: encryptIntegrationSecret(tokenResponse.refresh_token),
        expiresAt,
        scope: scope || null,
        lastSyncError: null,
        syncEnabled: true,
      },
      create: {
        clientId,
        type: 'OURA',
        accessToken: encryptIntegrationSecret(tokenResponse.access_token)!,
        refreshToken: encryptIntegrationSecret(tokenResponse.refresh_token),
        expiresAt,
        scope: scope || null,
        syncEnabled: true,
      },
    })

    // Best-effort: capture Oura user id for future webhook support, ignore failure.
    try {
      const info = await getOuraPersonalInfo(clientId)
      if (info?.id) {
        await prisma.integrationToken.update({
          where: { clientId_type: { clientId, type: 'OURA' } },
          data: { externalUserId: info.id },
        })
      }
    } catch (infoError) {
      logger.warn('Could not fetch Oura personal_info', { clientId }, infoError)
    }

    logger.info('Oura connected', { clientId })

    return NextResponse.redirect(
      `${APP_URL}${settingsPath(businessSlug)}?success=oura_connected`,
    )
  } catch (err) {
    logger.error('Oura callback error', { clientId }, err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.redirect(
      `${APP_URL}${settingsPath(businessSlug)}?error=oura_callback_failed&message=${encodeURIComponent(message)}`,
    )
  }
}

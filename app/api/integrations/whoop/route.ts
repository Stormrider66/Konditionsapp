/**
 * WHOOP Integration API
 *
 * GET    /api/integrations/whoop  - Get connection status
 * POST   /api/integrations/whoop  - Initiate OAuth flow
 * DELETE /api/integrations/whoop  - Disconnect WHOOP
 */

import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { z } from 'zod'

import { canAccessClient, getCurrentUser } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import {
  disconnectWhoop,
  getWhoopAuthUrl,
  hasWhoopConnection,
  isWhoopConfigured,
} from '@/lib/integrations/whoop/client'
import { logError } from '@/lib/logger-console'
import { requireFeatureAccess } from '@/lib/subscription/require-feature-access'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

const initiateAuthSchema = z.object({
  clientId: z.string().uuid(),
  businessSlug: z.string().optional(),
})

export async function GET(request: NextRequest) {
  let locale: AppLocale = resolveRequestLocale(request)

  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    locale = resolveRequestLocale(request, user.language)

    if (!isWhoopConfigured()) {
      return NextResponse.json({
        configured: false,
        connected: false,
        message: t(locale, 'WHOOP API is not configured.', 'WHOOP API är inte konfigurerat.'),
      })
    }

    const clientId = request.nextUrl.searchParams.get('clientId')
    if (!clientId) {
      return NextResponse.json({ error: t(locale, 'clientId is required', 'clientId krävs') }, { status: 400 })
    }

    const hasAccess = await canAccessClient(user.id, clientId)
    if (!hasAccess) {
      return NextResponse.json({ error: t(locale, 'Forbidden', 'Förbjudet') }, { status: 403 })
    }

    const token = await prisma.integrationToken.findUnique({
      where: { clientId_type: { clientId, type: 'WHOOP' } },
      select: {
        externalUserId: true,
        scope: true,
        lastSyncAt: true,
        lastSyncError: true,
        syncEnabled: true,
        createdAt: true,
      },
    })

    if (!token) {
      return NextResponse.json({ configured: true, connected: false, clientId })
    }

    const [activityCount, metricsCount] = await Promise.all([
      prisma.whoopActivity.count({ where: { clientId } }),
      prisma.dailyMetrics.count({
        where: {
          clientId,
          factorScores: {
            path: ['whoop'],
            not: Prisma.JsonNull,
          },
        },
      }),
    ])

    return NextResponse.json({
      configured: true,
      connected: token.syncEnabled !== false,
      clientId,
      whoopUserId: token.externalUserId,
      scope: token.scope,
      lastSyncAt: token.lastSyncAt,
      lastSyncError: token.lastSyncError,
      syncEnabled: token.syncEnabled,
      connectedAt: token.createdAt,
      activityCount,
      metricsCount,
    })
  } catch (error) {
    logError('Get WHOOP status error:', error)
    return NextResponse.json({ error: t(locale, 'Failed to get WHOOP status', 'Kunde inte hämta WHOOP-status') }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  let locale: AppLocale = resolveRequestLocale(request)

  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    locale = resolveRequestLocale(request, user.language)

    if (!isWhoopConfigured()) {
      return NextResponse.json({ error: t(locale, 'WHOOP API is not configured', 'WHOOP API är inte konfigurerat') }, { status: 503 })
    }

    const body = await request.json()
    const validation = initiateAuthSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: t(locale, 'Invalid input', 'Ogiltig indata'), details: validation.error.flatten() },
        { status: 400 },
      )
    }

    const { clientId, businessSlug } = validation.data
    const hasAccess = await canAccessClient(user.id, clientId)
    if (!hasAccess) {
      return NextResponse.json({ error: t(locale, 'Forbidden', 'Förbjudet') }, { status: 403 })
    }

    const denied = await requireFeatureAccess(clientId, 'whoop')
    if (denied) return denied

    if (await hasWhoopConnection(clientId)) {
      return NextResponse.json(
        { error: t(locale, 'WHOOP is already connected for this client', 'WHOOP är redan anslutet för den här klienten') },
        { status: 400 },
      )
    }

    const { authUrl } = await getWhoopAuthUrl(clientId, {
      origin: request.nextUrl.origin,
      businessSlug,
    })

    return NextResponse.json({ authUrl })
  } catch (error) {
    logError('Initiate WHOOP auth error:', error)
    return NextResponse.json({ error: t(locale, 'Failed to initiate WHOOP authentication', 'Kunde inte starta WHOOP-autentisering') }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  let locale: AppLocale = resolveRequestLocale(request)

  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    locale = resolveRequestLocale(request, user.language)

    const clientId = request.nextUrl.searchParams.get('clientId')
    if (!clientId) {
      return NextResponse.json({ error: t(locale, 'clientId is required', 'clientId krävs') }, { status: 400 })
    }

    const hasAccess = await canAccessClient(user.id, clientId)
    if (!hasAccess) {
      return NextResponse.json({ error: t(locale, 'Forbidden', 'Förbjudet') }, { status: 403 })
    }

    await disconnectWhoop(clientId)
    return NextResponse.json({ success: true })
  } catch (error) {
    logError('Disconnect WHOOP error:', error)
    return NextResponse.json({ error: t(locale, 'Failed to disconnect WHOOP', 'Kunde inte koppla från WHOOP') }, { status: 500 })
  }
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

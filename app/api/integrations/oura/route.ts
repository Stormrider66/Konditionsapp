/**
 * Oura Integration API
 *
 * GET    /api/integrations/oura  - Get connection status
 * POST   /api/integrations/oura  - Initiate OAuth flow
 * DELETE /api/integrations/oura  - Disconnect
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { canAccessClient, getCurrentUser } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { disconnectOura, getOuraAuthUrl, hasOuraConnection } from '@/lib/integrations/oura/auth'
import { logError } from '@/lib/logger-console'

const initiateAuthSchema = z.object({
  clientId: z.string().uuid(),
  businessSlug: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const clientId = request.nextUrl.searchParams.get('clientId')
    if (!clientId) {
      return NextResponse.json({ error: 'clientId is required' }, { status: 400 })
    }

    const hasAccess = await canAccessClient(user.id, clientId)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const token = await prisma.integrationToken.findUnique({
      where: { clientId_type: { clientId, type: 'OURA' } },
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
      return NextResponse.json({ connected: false, clientId })
    }

    return NextResponse.json({
      connected: true,
      clientId,
      ouraUserId: token.externalUserId,
      scope: token.scope,
      lastSyncAt: token.lastSyncAt,
      lastSyncError: token.lastSyncError,
      syncEnabled: token.syncEnabled,
      connectedAt: token.createdAt,
    })
  } catch (error) {
    logError('Get Oura status error:', error)
    return NextResponse.json({ error: 'Failed to get Oura status' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validation = initiateAuthSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.flatten() },
        { status: 400 },
      )
    }

    const { clientId, businessSlug } = validation.data

    const hasAccess = await canAccessClient(user.id, clientId)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (await hasOuraConnection(clientId)) {
      return NextResponse.json(
        { error: 'Oura is already connected for this client' },
        { status: 400 },
      )
    }

    const origin = request.nextUrl.origin
    const state = businessSlug ? `${clientId}:${businessSlug}` : clientId
    const authUrl = getOuraAuthUrl(state, { origin })

    return NextResponse.json({ authUrl })
  } catch (error) {
    logError('Initiate Oura auth error:', error)
    return NextResponse.json(
      { error: 'Failed to initiate Oura authentication' },
      { status: 500 },
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const clientId = request.nextUrl.searchParams.get('clientId')
    if (!clientId) {
      return NextResponse.json({ error: 'clientId is required' }, { status: 400 })
    }

    const hasAccess = await canAccessClient(user.id, clientId)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await disconnectOura(clientId)
    return NextResponse.json({ success: true })
  } catch (error) {
    logError('Disconnect Oura error:', error)
    return NextResponse.json({ error: 'Failed to disconnect Oura' }, { status: 500 })
  }
}

/**
 * Manual "Sync now" trigger for Oura.
 *
 * POST /api/integrations/oura/sync  body: { clientId, daysBack? }
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { canAccessClient, getCurrentUser } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { syncOuraData } from '@/lib/integrations/oura/sync'
import { logError } from '@/lib/logger-console'

const syncSchema = z.object({
  clientId: z.string().uuid(),
  daysBack: z.number().min(1).max(30).optional().default(3),
})

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validation = syncSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.flatten() },
        { status: 400 },
      )
    }

    const { clientId, daysBack } = validation.data

    const hasAccess = await canAccessClient(user.id, clientId)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const token = await prisma.integrationToken.findUnique({
      where: { clientId_type: { clientId, type: 'OURA' } },
    })
    if (!token) {
      return NextResponse.json(
        { error: 'Oura not connected for this client' },
        { status: 404 },
      )
    }
    if (!token.syncEnabled) {
      return NextResponse.json({ error: 'Sync is disabled for this client' }, { status: 400 })
    }

    const result = await syncOuraData(clientId, { daysBack })

    return NextResponse.json({
      success: true,
      synced: result.daysProcessed,
      hrvRecords: result.hrvRecords,
      sleepRecords: result.sleepRecords,
      readinessRecords: result.readinessRecords,
      workoutsSynced: result.workoutsSynced,
      appliedRecoveryWrites: result.appliedRecoveryWrites,
      errors: result.errors,
    })
  } catch (error) {
    logError('Sync Oura error:', error)
    return NextResponse.json({ error: 'Failed to sync Oura data' }, { status: 500 })
  }
}

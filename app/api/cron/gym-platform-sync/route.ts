import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { syncConnection } from '@/lib/integrations/gym-platforms/sync-engine'
import { subMinutes } from 'date-fns'

/**
 * POST /api/cron/gym-platform-sync
 * Periodic sync of all active gym platform connections.
 * Should run every 15 minutes via Vercel Cron.
 */
export async function POST() {
  try {
    const now = new Date()

    // Find connections that need syncing
    const connections = await prisma.gymPlatformConnection.findMany({
      where: {
        isActive: true,
        OR: [
          { lastSyncAt: null },
          {
            // Only sync if enough time has passed since last sync
            lastSyncAt: { lt: subMinutes(now, 15) },
          },
        ],
      },
      select: {
        id: true,
        provider: true,
        syncInterval: true,
        lastSyncAt: true,
      },
      take: 20, // Process max 20 per cron run
    })

    // Filter by individual sync intervals
    const dueForSync = connections.filter(c => {
      if (!c.lastSyncAt) return true
      const minutesSinceSync = (now.getTime() - c.lastSyncAt.getTime()) / 60000
      return minutesSinceSync >= c.syncInterval
    })

    logger.info('Gym platform sync cron started', {
      totalConnections: connections.length,
      dueForSync: dueForSync.length,
    })

    let synced = 0
    let errors = 0

    for (const connection of dueForSync) {
      try {
        const result = await syncConnection(connection.id)
        synced++
        if (result.errors.length > 0) {
          errors++
        }
      } catch (err) {
        errors++
        logger.error('Cron sync failed for connection', {
          connectionId: connection.id,
          provider: connection.provider,
        }, err as Error)
      }
    }

    return NextResponse.json({
      success: true,
      synced,
      errors,
      total: dueForSync.length,
    })
  } catch (err) {
    logger.error('Gym platform sync cron failed', {}, err as Error)
    return NextResponse.json({ error: 'Cron failed' }, { status: 500 })
  }
}

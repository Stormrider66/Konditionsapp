/**
 * Gym Platform Sync Engine
 *
 * Generic sync engine that works with any GymPlatformAdapter.
 * Fetches classes and bookings from external platforms,
 * upserts into local database, and matches to existing records.
 */

import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { startOfDay, endOfDay, addDays } from 'date-fns'
import type { ConnectionConfig, GymPlatformAdapter, SyncResult } from './types'
import { getAdapter } from './adapters'

/**
 * Run a full sync for a gym platform connection.
 * Syncs classes for today + tomorrow, and bookings for today.
 */
export async function syncConnection(connectionId: string): Promise<SyncResult> {
  const result: SyncResult = {
    classesImported: 0,
    classesUpdated: 0,
    bookingsImported: 0,
    bookingsUpdated: 0,
    errors: [],
  }

  try {
    const connection = await prisma.gymPlatformConnection.findUnique({
      where: { id: connectionId },
    })

    if (!connection || !connection.isActive) {
      result.errors.push('Connection not found or inactive')
      return result
    }

    const adapter = getAdapter(connection.provider)
    if (!adapter) {
      result.errors.push(`No adapter found for provider: ${connection.provider}`)
      return result
    }

    const config: ConnectionConfig = {
      provider: connection.provider as ConnectionConfig['provider'],
      apiKey: connection.apiKey || undefined,
      apiSecret: connection.apiSecret || undefined,
      siteId: connection.siteId || undefined,
      accessToken: connection.accessToken || undefined,
      refreshToken: connection.refreshToken || undefined,
    }

    const now = new Date()
    const todayStart = startOfDay(now)
    const tomorrowEnd = endOfDay(addDays(now, 1))

    // Sync classes (today + tomorrow)
    if (connection.syncClasses) {
      try {
        const classes = await adapter.fetchClasses(config, todayStart, tomorrowEnd)

        for (const cls of classes) {
          try {
            const existing = await prisma.gymSyncedClass.findUnique({
              where: { connectionId_externalId: { connectionId, externalId: cls.externalId } },
            })

            if (existing) {
              await prisma.gymSyncedClass.update({
                where: { id: existing.id },
                data: {
                  name: cls.name,
                  instructor: cls.instructor,
                  startTime: cls.startTime,
                  endTime: cls.endTime,
                  location: cls.location,
                  maxCapacity: cls.maxCapacity,
                  bookedCount: cls.bookedCount,
                  description: cls.description,
                  lastSyncedAt: new Date(),
                },
              })
              result.classesUpdated++
            } else {
              await prisma.gymSyncedClass.create({
                data: {
                  connectionId,
                  externalId: cls.externalId,
                  name: cls.name,
                  instructor: cls.instructor,
                  startTime: cls.startTime,
                  endTime: cls.endTime,
                  location: cls.location,
                  maxCapacity: cls.maxCapacity,
                  bookedCount: cls.bookedCount,
                  description: cls.description,
                },
              })
              result.classesImported++
            }
          } catch (err) {
            result.errors.push(`Failed to sync class ${cls.externalId}: ${err}`)
          }
        }
      } catch (err) {
        result.errors.push(`Failed to fetch classes: ${err}`)
      }
    }

    // Sync bookings (today only)
    if (connection.syncBookings) {
      try {
        const bookings = await adapter.fetchBookings(config, todayStart, endOfDay(now))

        for (const booking of bookings) {
          try {
            // Try to match to an existing Client by email
            let matchedClientId: string | null = null
            if (booking.clientEmail) {
              const client = await prisma.client.findFirst({
                where: {
                  email: booking.clientEmail,
                  business: {
                    gymPlatformConnections: { some: { id: connectionId } },
                  },
                },
                select: { id: true },
              })
              matchedClientId = client?.id || null
            }

            const existing = await prisma.gymSyncedBooking.findUnique({
              where: { connectionId_externalId: { connectionId, externalId: booking.externalId } },
            })

            if (existing) {
              await prisma.gymSyncedBooking.update({
                where: { id: existing.id },
                data: {
                  type: booking.type,
                  clientName: booking.clientName,
                  clientEmail: booking.clientEmail,
                  clientExternalId: booking.clientExternalId,
                  clientId: matchedClientId || existing.clientId,
                  className: booking.className,
                  startTime: booking.startTime,
                  endTime: booking.endTime,
                  status: booking.status,
                  lastSyncedAt: new Date(),
                },
              })
              result.bookingsUpdated++
            } else {
              await prisma.gymSyncedBooking.create({
                data: {
                  connectionId,
                  externalId: booking.externalId,
                  type: booking.type,
                  clientName: booking.clientName,
                  clientEmail: booking.clientEmail,
                  clientExternalId: booking.clientExternalId,
                  clientId: matchedClientId,
                  className: booking.className,
                  startTime: booking.startTime,
                  endTime: booking.endTime,
                  status: booking.status,
                },
              })
              result.bookingsImported++
            }
          } catch (err) {
            result.errors.push(`Failed to sync booking ${booking.externalId}: ${err}`)
          }
        }
      } catch (err) {
        result.errors.push(`Failed to fetch bookings: ${err}`)
      }
    }

    // Update connection status
    await prisma.gymPlatformConnection.update({
      where: { id: connectionId },
      data: {
        lastSyncAt: new Date(),
        lastSyncError: result.errors.length > 0 ? result.errors.join('; ') : null,
        lastSyncStats: {
          classesImported: result.classesImported,
          classesUpdated: result.classesUpdated,
          bookingsImported: result.bookingsImported,
          bookingsUpdated: result.bookingsUpdated,
          errors: result.errors.length,
          syncedAt: new Date().toISOString(),
        },
      },
    })

    logger.info('Gym platform sync completed', {
      connectionId,
      provider: connection.provider,
      ...result,
    })
  } catch (err) {
    result.errors.push(`Sync failed: ${err}`)
    logger.error('Gym platform sync failed', { connectionId }, err as Error)
  }

  return result
}

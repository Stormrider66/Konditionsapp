/**
 * Auth Event Logging
 *
 * Records authentication events (login success/failure, lockouts, etc.)
 * to the AuthEvent table for security monitoring.
 *
 * Used by:
 * - NextAuth signIn callbacks to log attempts
 * - Rate limiters to detect brute force
 * - The Compliance & Security operator agent
 */

import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export type AuthEventType =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILURE'
  | 'PASSWORD_RESET'
  | 'LOCKOUT'
  | 'OAUTH_START'
  | 'OAUTH_SUCCESS'
  | 'OAUTH_FAILURE'

export interface LogAuthEventInput {
  eventType: AuthEventType
  userId?: string | null
  email?: string | null
  failureReason?: string | null
  ipAddress?: string | null
  userAgent?: string | null
  metadata?: Record<string, unknown>
}

/**
 * Log an authentication event. Fire-and-forget — does not throw on failure
 * (auth shouldn't break because logging failed).
 */
export async function logAuthEvent(input: LogAuthEventInput): Promise<void> {
  try {
    await prisma.authEvent.create({
      data: {
        eventType: input.eventType,
        userId: input.userId || null,
        email: input.email || null,
        failureReason: input.failureReason || null,
        ipAddress: input.ipAddress || null,
        userAgent: input.userAgent || null,
        metadata: input.metadata ? (input.metadata as never) : undefined,
      },
    })
  } catch (error) {
    logger.error('[auth-events] Failed to log auth event', { eventType: input.eventType }, error)
  }
}

/**
 * Get count of failed logins in a time window.
 * Used by rate limiters and the Compliance Agent.
 */
export async function getFailedLoginCount(options: {
  hours?: number
  ipAddress?: string
  email?: string
}): Promise<number> {
  const hours = options.hours || 24
  const since = new Date(Date.now() - hours * 60 * 60 * 1000)

  return prisma.authEvent.count({
    where: {
      eventType: 'LOGIN_FAILURE',
      createdAt: { gte: since },
      ...(options.ipAddress ? { ipAddress: options.ipAddress } : {}),
      ...(options.email ? { email: options.email } : {}),
    },
  })
}

/**
 * Find brute-force candidates: IPs or emails with many failed attempts.
 */
export async function findBruteForceAttempts(options: {
  hours?: number
  threshold?: number
}): Promise<{
  byIp: Array<{ ipAddress: string | null; count: number }>
  byEmail: Array<{ email: string | null; count: number }>
}> {
  const hours = options.hours || 1
  const threshold = options.threshold || 10
  const since = new Date(Date.now() - hours * 60 * 60 * 1000)

  const [ipGroups, emailGroups] = await Promise.all([
    prisma.authEvent.groupBy({
      by: ['ipAddress'],
      where: {
        eventType: 'LOGIN_FAILURE',
        createdAt: { gte: since },
        ipAddress: { not: null },
      },
      _count: true,
      having: { ipAddress: { _count: { gte: threshold } } },
      orderBy: { _count: { ipAddress: 'desc' } },
      take: 20,
    }),
    prisma.authEvent.groupBy({
      by: ['email'],
      where: {
        eventType: 'LOGIN_FAILURE',
        createdAt: { gte: since },
        email: { not: null },
      },
      _count: true,
      having: { email: { _count: { gte: threshold } } },
      orderBy: { _count: { email: 'desc' } },
      take: 20,
    }),
  ])

  return {
    byIp: ipGroups.map(g => ({ ipAddress: g.ipAddress, count: g._count })),
    byEmail: emailGroups.map(g => ({ email: g.email, count: g._count })),
  }
}

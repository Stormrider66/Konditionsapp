import { prisma } from '@/lib/prisma'
import type { OperatorToolResult } from '../types'

export async function getConsentWithdrawals(days: number = 1): Promise<OperatorToolResult> {
  try {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    const withdrawals = await prisma.agentConsent.count({
      where: {
        consentWithdrawnAt: { gte: since },
      },
    })

    return { success: true, data: { days, withdrawals } }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function getPendingGDPRRequests(): Promise<OperatorToolResult> {
  try {
    // Check audit log for GDPR-related entries that haven't been resolved
    // This is a placeholder — in practice, GDPR requests would have their own model
    const recentAuditEntries = await prisma.agentAuditLog.count({
      where: {
        action: { in: ['DATA_EXPORTED', 'DATA_DELETED'] },
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
    })

    return {
      success: true,
      data: {
        recentGDPRActivity30d: recentAuditEntries,
        note: 'No dedicated GDPRRequest model — showing audit log activity as proxy',
      },
    }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function getAuditLogAnomalies(hours: number = 24): Promise<OperatorToolResult> {
  try {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000)
    const recent = await prisma.auditLog.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        action: true,
        userId: true,
        createdAt: true,
        ipAddress: true,
      },
    })

    // Flag potential anomalies
    const byAction = recent.reduce((acc, a) => {
      acc[a.action] = (acc[a.action] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const anomalies: string[] = []
    if ((byAction['DATA_DELETE'] || 0) > 10) {
      anomalies.push(`${byAction['DATA_DELETE']} DATA_DELETE actions in ${hours}h`)
    }
    if ((byAction['USER_ROLE_CHANGE'] || 0) > 5) {
      anomalies.push(`${byAction['USER_ROLE_CHANGE']} role changes in ${hours}h`)
    }

    return {
      success: true,
      data: {
        hours,
        totalActions: recent.length,
        byAction,
        anomalies,
      },
    }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

/**
 * Detect failed login attempts (brute force signals).
 *
 * Reads from the AuthEvent table. For auth events to be populated, the
 * NextAuth signIn callback must call logAuthEvent() from lib/auth/auth-events.ts
 * on each login attempt. If AuthEvents are empty, either there are truly
 * no failed logins or the logging hook isn't wired up yet.
 */
export async function getFailedLogins(hours: number = 24): Promise<OperatorToolResult> {
  try {
    const { getFailedLoginCount, findBruteForceAttempts } = await import('@/lib/auth/auth-events')

    const totalFailures = await getFailedLoginCount({ hours })
    const bruteForce = await findBruteForceAttempts({ hours: 1, threshold: 10 })

    return {
      success: true,
      data: {
        hours,
        failedLogins: totalFailures,
        bruteForceIps: bruteForce.byIp,
        bruteForceEmails: bruteForce.byEmail,
      },
    }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

/**
 * Detect suspicious access patterns from AuthEvent logs.
 *
 * Looks for:
 * - Successful logins from IPs that recently had failed attempts
 * - Users with logins from multiple IPs in a short window
 * - Unusual OAuth failure spikes
 */
export async function getSuspiciousPatterns(): Promise<OperatorToolResult> {
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)

    // Users with logins from multiple IPs in last hour
    const recentLogins = await prisma.authEvent.findMany({
      where: {
        eventType: 'LOGIN_SUCCESS',
        createdAt: { gte: oneHourAgo },
        ipAddress: { not: null },
        userId: { not: null },
      },
      select: { userId: true, ipAddress: true },
    })

    const userIpMap = new Map<string, Set<string>>()
    for (const r of recentLogins) {
      if (!r.userId || !r.ipAddress) continue
      if (!userIpMap.has(r.userId)) userIpMap.set(r.userId, new Set())
      userIpMap.get(r.userId)!.add(r.ipAddress)
    }

    const multiIpUsers = Array.from(userIpMap.entries())
      .filter(([_, ips]) => ips.size >= 3)
      .map(([userId, ips]) => ({ userId, ipCount: ips.size }))

    // OAuth failure spike
    const oauthFailures = await prisma.authEvent.count({
      where: {
        eventType: 'OAUTH_FAILURE',
        createdAt: { gte: oneHourAgo },
      },
    })

    const suspiciousCount = multiIpUsers.length + (oauthFailures > 20 ? 1 : 0)

    return {
      success: true,
      data: {
        suspiciousPatterns: suspiciousCount,
        multiIpUsers: multiIpUsers.slice(0, 10),
        oauthFailuresLastHour: oauthFailures,
      },
    }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function getAgentActionAnomalies(): Promise<OperatorToolResult> {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000)

    // Check for agent actions without consent (violations)
    const agentActions = await prisma.agentAction.count({
      where: { createdAt: { gte: since } },
    })

    // Check for burst writes (suspicious pattern)
    const byClient = await prisma.agentAction.groupBy({
      by: ['clientId'],
      where: { createdAt: { gte: since } },
      _count: true,
      orderBy: { _count: { clientId: 'desc' } },
      take: 5,
    })

    const burstyClients = byClient.filter(c => c._count > 50)

    return {
      success: true,
      data: {
        totalAgentActions24h: agentActions,
        burstyClients: burstyClients.length,
        topClients: byClient.map(c => ({ clientId: c.clientId, count: c._count })),
      },
    }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

// ============================================================================
// COMPETITOR INTEL TOOLS
// ============================================================================


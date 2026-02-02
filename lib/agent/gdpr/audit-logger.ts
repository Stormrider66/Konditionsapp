/**
 * GDPR Audit Logger
 *
 * Logs all agent data access and actions for GDPR compliance.
 * All entries are immutable and retained for 7 years.
 */

import { prisma } from '@/lib/prisma'
import type { AgentAuditLog, Prisma } from '@prisma/client'
import type { AuditEntry, AuditAction, AuditActorType } from '../types'

/**
 * Log an audit entry
 */
export async function logAuditEntry(entry: AuditEntry): Promise<AgentAuditLog> {
  return prisma.agentAuditLog.create({
    data: {
      clientId: entry.clientId,
      action: entry.action,
      resource: entry.resource,
      details: entry.details as unknown as Prisma.InputJsonValue,
      actorType: entry.actorType,
      actorId: entry.actorId,
      ipAddress: entry.ipAddress,
    },
  })
}

/**
 * Log data access by the agent
 */
export async function logDataAccess(
  clientId: string,
  resource: string,
  purpose: string,
  dataFields?: string[]
): Promise<void> {
  await logAuditEntry({
    clientId,
    action: 'DATA_ACCESS',
    resource,
    details: {
      purpose,
      fields: dataFields,
      timestamp: new Date().toISOString(),
    },
    actorType: 'AGENT',
  })
}

/**
 * Log a decision made by the agent
 */
export async function logDecisionMade(
  clientId: string,
  actionType: string,
  reasoning: string,
  confidence: number,
  actionId: string
): Promise<void> {
  await logAuditEntry({
    clientId,
    action: 'DECISION_MADE',
    resource: 'AgentAction',
    details: {
      actionType,
      reasoning: reasoning.substring(0, 500), // Truncate for storage
      confidence,
      actionId,
      timestamp: new Date().toISOString(),
    },
    actorType: 'AGENT',
  })
}

/**
 * Log an action taken (executed) by the agent
 */
export async function logActionTaken(
  clientId: string,
  actionId: string,
  actionType: string,
  changes: Record<string, unknown>,
  autoApplied: boolean
): Promise<void> {
  await logAuditEntry({
    clientId,
    action: 'ACTION_TAKEN',
    resource: 'AgentAction',
    details: {
      actionId,
      actionType,
      changes,
      autoApplied,
      timestamp: new Date().toISOString(),
    },
    actorType: autoApplied ? 'AGENT' : 'ATHLETE',
  })
}

/**
 * Log data export request
 */
export async function logDataExport(
  clientId: string,
  requestedBy: string,
  ipAddress?: string
): Promise<void> {
  await logAuditEntry({
    clientId,
    action: 'DATA_EXPORTED',
    resource: 'AllAgentData',
    details: {
      exportedAt: new Date().toISOString(),
      format: 'JSON',
    },
    actorType: 'ATHLETE',
    actorId: requestedBy,
    ipAddress,
  })
}

/**
 * Log data deletion request
 */
export async function logDataDeletion(
  clientId: string,
  requestedBy: string,
  deletedResources: string[],
  ipAddress?: string
): Promise<void> {
  await logAuditEntry({
    clientId,
    action: 'DATA_DELETED',
    resource: 'MultipleResources',
    details: {
      deletedAt: new Date().toISOString(),
      resources: deletedResources,
    },
    actorType: 'ATHLETE',
    actorId: requestedBy,
    ipAddress,
  })
}

/**
 * Get audit log for a client (for GDPR data export)
 */
export async function getAuditLog(
  clientId: string,
  options?: {
    from?: Date
    to?: Date
    actions?: AuditAction[]
    limit?: number
  }
): Promise<AgentAuditLog[]> {
  return prisma.agentAuditLog.findMany({
    where: {
      clientId,
      ...(options?.from || options?.to
        ? {
            createdAt: {
              ...(options.from && { gte: options.from }),
              ...(options.to && { lte: options.to }),
            },
          }
        : {}),
      ...(options?.actions && { action: { in: options.actions } }),
    },
    orderBy: { createdAt: 'desc' },
    take: options?.limit,
  })
}

/**
 * Get audit summary (counts by action type)
 */
export async function getAuditSummary(
  clientId: string
): Promise<Record<string, number>> {
  const logs = await prisma.agentAuditLog.groupBy({
    by: ['action'],
    where: { clientId },
    _count: { action: true },
  })

  return logs.reduce(
    (acc, log) => {
      acc[log.action] = log._count.action
      return acc
    },
    {} as Record<string, number>
  )
}

/**
 * Cleanup old audit logs (run by cron job)
 * Retains logs for 7 years as per GDPR requirements
 */
export async function cleanupOldAuditLogs(): Promise<number> {
  const sevenYearsAgo = new Date()
  sevenYearsAgo.setFullYear(sevenYearsAgo.getFullYear() - 7)

  const result = await prisma.agentAuditLog.deleteMany({
    where: {
      createdAt: { lt: sevenYearsAgo },
    },
  })

  return result.count
}

/**
 * Alias for logAuditEntry - used by agent execution modules
 */
export const logAgentAudit = logAuditEntry

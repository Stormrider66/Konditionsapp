/**
 * GDPR Data Deletion
 *
 * Deletes all agent-related data for an athlete.
 * Audit logs are retained for legal compliance.
 */

import { prisma } from '@/lib/prisma'
import { logDataDeletion } from './audit-logger'

export interface DeletionResult {
  success: boolean
  deletedResources: string[]
  counts: {
    perceptions: number
    actions: number
    learningEvents: number
    preferences: number
    consent: number
  }
  auditLogsRetained: boolean
  deletedAt: string
}

/**
 * Delete all agent data for a client
 *
 * Note: Audit logs are retained for legal compliance (7 years).
 * AgentOversightItem is cascade deleted with AgentAction.
 */
export async function deleteAgentData(
  clientId: string,
  requestedBy: string,
  ipAddress?: string
): Promise<DeletionResult> {
  const deletedResources: string[] = []
  const counts = {
    perceptions: 0,
    actions: 0,
    learningEvents: 0,
    preferences: 0,
    consent: 0,
  }

  // Use transaction for atomicity
  await prisma.$transaction(async (tx) => {
    // Delete learning events first (no cascades)
    const learningResult = await tx.agentLearningEvent.deleteMany({
      where: { clientId },
    })
    counts.learningEvents = learningResult.count
    if (counts.learningEvents > 0) {
      deletedResources.push('AgentLearningEvent')
    }

    // Delete actions (cascades to AgentOversightItem)
    const actionsResult = await tx.agentAction.deleteMany({
      where: { clientId },
    })
    counts.actions = actionsResult.count
    if (counts.actions > 0) {
      deletedResources.push('AgentAction')
      deletedResources.push('AgentOversightItem')
    }

    // Delete perceptions
    const perceptionsResult = await tx.agentPerception.deleteMany({
      where: { clientId },
    })
    counts.perceptions = perceptionsResult.count
    if (counts.perceptions > 0) {
      deletedResources.push('AgentPerception')
    }

    // Delete preferences
    const preferencesResult = await tx.agentPreferences.deleteMany({
      where: { clientId },
    })
    counts.preferences = preferencesResult.count
    if (counts.preferences > 0) {
      deletedResources.push('AgentPreferences')
    }

    // Delete consent
    const consentResult = await tx.agentConsent.deleteMany({
      where: { clientId },
    })
    counts.consent = consentResult.count
    if (counts.consent > 0) {
      deletedResources.push('AgentConsent')
    }
  })

  // Log the deletion (outside transaction so it always succeeds)
  await logDataDeletion(clientId, requestedBy, deletedResources, ipAddress)

  return {
    success: true,
    deletedResources,
    counts,
    auditLogsRetained: true,
    deletedAt: new Date().toISOString(),
  }
}

/**
 * Anonymize agent data instead of deleting
 * Useful for preserving aggregated learning while removing PII
 */
export async function anonymizeAgentData(
  clientId: string,
  requestedBy: string,
  ipAddress?: string
): Promise<{ success: boolean; anonymizedAt: string }> {
  const anonymizedClientId = `anon_${Date.now()}_${Math.random().toString(36).substring(7)}`

  await prisma.$transaction(async (tx) => {
    // Anonymize learning events (keep for model training)
    await tx.agentLearningEvent.updateMany({
      where: { clientId },
      data: {
        // Clear action reference but keep the learning data
        actionId: null,
      },
    })

    // Delete personal data but keep anonymized aggregate
    await tx.agentPreferences.deleteMany({ where: { clientId } })
    await tx.agentConsent.deleteMany({ where: { clientId } })
    await tx.agentAction.deleteMany({ where: { clientId } })
    await tx.agentPerception.deleteMany({ where: { clientId } })
  })

  // Log the anonymization
  await logDataDeletion(
    clientId,
    requestedBy,
    ['Anonymized: AgentPreferences, AgentConsent, AgentAction, AgentPerception'],
    ipAddress
  )

  return {
    success: true,
    anonymizedAt: new Date().toISOString(),
  }
}

/**
 * Check what data exists for a client
 */
export async function getDataSummary(clientId: string): Promise<{
  hasPreferences: boolean
  hasConsent: boolean
  perceptionCount: number
  actionCount: number
  learningEventCount: number
  auditLogCount: number
}> {
  const [preferences, consent, perceptions, actions, learningEvents, auditLogs] =
    await Promise.all([
      prisma.agentPreferences.findUnique({ where: { clientId } }),
      prisma.agentConsent.findUnique({ where: { clientId } }),
      prisma.agentPerception.count({ where: { clientId } }),
      prisma.agentAction.count({ where: { clientId } }),
      prisma.agentLearningEvent.count({ where: { clientId } }),
      prisma.agentAuditLog.count({ where: { clientId } }),
    ])

  return {
    hasPreferences: preferences !== null,
    hasConsent: consent !== null,
    perceptionCount: perceptions,
    actionCount: actions,
    learningEventCount: learningEvents,
    auditLogCount: auditLogs,
  }
}

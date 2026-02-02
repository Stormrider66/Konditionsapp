/**
 * GDPR Consent Manager
 *
 * Manages consent for AI agent operations.
 * All consent changes are logged for audit purposes.
 */

import { prisma } from '@/lib/prisma'
import type { AgentConsent } from '@prisma/client'
import type { ConsentStatus, ConsentUpdate } from '../types'
import { checkConsent } from '../guardrails/consent'
import { logAuditEntry } from './audit-logger'

// Re-export checkConsent for convenience
export { checkConsent } from '../guardrails/consent'

const CURRENT_CONSENT_VERSION = '1.0'

/**
 * Gets consent status for an athlete
 */
export async function getConsentStatus(clientId: string): Promise<ConsentStatus> {
  const consent = await prisma.agentConsent.findUnique({
    where: { clientId },
  })
  return checkConsent(consent)
}

/**
 * Grants consent for AI agent operations
 */
export async function grantConsent(
  clientId: string,
  consents: ConsentUpdate,
  metadata: { ipAddress?: string; userAgent?: string }
): Promise<AgentConsent> {
  const now = new Date()

  const consent = await prisma.agentConsent.upsert({
    where: { clientId },
    create: {
      clientId,
      dataProcessingConsent: consents.dataProcessingConsent ?? false,
      automatedDecisionConsent: consents.automatedDecisionConsent ?? false,
      healthDataProcessingConsent: consents.healthDataProcessingConsent ?? false,
      learningContributionConsent: consents.learningContributionConsent ?? true,
      anonymizedResearchConsent: consents.anonymizedResearchConsent ?? true,
      consentVersion: CURRENT_CONSENT_VERSION,
      consentGivenAt: now,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
    },
    update: {
      dataProcessingConsent: consents.dataProcessingConsent,
      automatedDecisionConsent: consents.automatedDecisionConsent,
      healthDataProcessingConsent: consents.healthDataProcessingConsent,
      learningContributionConsent: consents.learningContributionConsent,
      anonymizedResearchConsent: consents.anonymizedResearchConsent,
      consentVersion: CURRENT_CONSENT_VERSION,
      consentGivenAt: now,
      consentWithdrawnAt: null, // Clear any previous withdrawal
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
    },
  })

  // Log the consent change
  await logAuditEntry({
    clientId,
    action: 'CONSENT_CHANGED',
    resource: 'AgentConsent',
    details: {
      type: 'GRANTED',
      consents,
      version: CURRENT_CONSENT_VERSION,
    },
    actorType: 'ATHLETE',
    actorId: clientId,
    ipAddress: metadata.ipAddress,
  })

  return consent
}

/**
 * Updates specific consent settings
 */
export async function updateConsent(
  clientId: string,
  updates: Partial<ConsentUpdate>,
  metadata: { ipAddress?: string; userAgent?: string }
): Promise<AgentConsent> {
  const existing = await prisma.agentConsent.findUnique({
    where: { clientId },
  })

  if (!existing) {
    throw new Error('No consent record found. Please grant initial consent first.')
  }

  if (existing.consentWithdrawnAt) {
    throw new Error('Consent has been withdrawn. Please grant new consent.')
  }

  const consent = await prisma.agentConsent.update({
    where: { clientId },
    data: {
      ...updates,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
    },
  })

  // Log the consent change
  await logAuditEntry({
    clientId,
    action: 'CONSENT_CHANGED',
    resource: 'AgentConsent',
    details: {
      type: 'UPDATED',
      updates,
      previousValues: {
        dataProcessingConsent: existing.dataProcessingConsent,
        automatedDecisionConsent: existing.automatedDecisionConsent,
        healthDataProcessingConsent: existing.healthDataProcessingConsent,
        learningContributionConsent: existing.learningContributionConsent,
        anonymizedResearchConsent: existing.anonymizedResearchConsent,
      },
    },
    actorType: 'ATHLETE',
    actorId: clientId,
    ipAddress: metadata.ipAddress,
  })

  return consent
}

/**
 * Withdraws all consent - stops all agent operations
 */
export async function withdrawConsent(
  clientId: string,
  metadata: { ipAddress?: string; userAgent?: string }
): Promise<AgentConsent> {
  const consent = await prisma.agentConsent.update({
    where: { clientId },
    data: {
      consentWithdrawnAt: new Date(),
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
    },
  })

  // Log the withdrawal
  await logAuditEntry({
    clientId,
    action: 'CONSENT_CHANGED',
    resource: 'AgentConsent',
    details: {
      type: 'WITHDRAWN',
      withdrawnAt: consent.consentWithdrawnAt,
    },
    actorType: 'ATHLETE',
    actorId: clientId,
    ipAddress: metadata.ipAddress,
  })

  return consent
}

/**
 * Checks if consent version is current
 */
export async function isConsentCurrent(clientId: string): Promise<boolean> {
  const consent = await prisma.agentConsent.findUnique({
    where: { clientId },
  })

  if (!consent) return false
  return consent.consentVersion === CURRENT_CONSENT_VERSION
}

/**
 * Gets consent history for GDPR data export
 */
export async function getConsentHistory(
  clientId: string
): Promise<Array<{
  action: string
  timestamp: Date
  details: Record<string, unknown>
}>> {
  const logs = await prisma.agentAuditLog.findMany({
    where: {
      clientId,
      action: 'CONSENT_CHANGED',
    },
    orderBy: { createdAt: 'desc' },
    select: {
      action: true,
      createdAt: true,
      details: true,
    },
  })

  return logs.map((log) => ({
    action: log.action,
    timestamp: log.createdAt,
    details: log.details as Record<string, unknown>,
  }))
}

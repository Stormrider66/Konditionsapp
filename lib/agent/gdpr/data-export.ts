/**
 * GDPR Data Export
 *
 * Exports all agent-related data for an athlete.
 */

import { prisma } from '@/lib/prisma'
import { logDataExport } from './audit-logger'

export interface AgentDataExport {
  exportedAt: string
  clientId: string
  preferences: AgentPreferencesExport | null
  consent: AgentConsentExport | null
  perceptions: AgentPerceptionExport[]
  actions: AgentActionExport[]
  learningEvents: AgentLearningEventExport[]
  auditLog: AuditLogExport[]
}

interface AgentPreferencesExport {
  autonomyLevel: string
  allowWorkoutModification: boolean
  allowRestDayInjection: boolean
  maxIntensityReduction: number
  dailyBriefingEnabled: boolean
  proactiveNudgesEnabled: boolean
  preferredContactMethod: string
  minRestDaysPerWeek: number
  maxConsecutiveHardDays: number
  createdAt: string
  updatedAt: string
}

interface AgentConsentExport {
  dataProcessingConsent: boolean
  automatedDecisionConsent: boolean
  healthDataProcessingConsent: boolean
  learningContributionConsent: boolean
  anonymizedResearchConsent: boolean
  consentVersion: string
  consentGivenAt: string | null
  consentWithdrawnAt: string | null
  createdAt: string
  updatedAt: string
}

interface AgentPerceptionExport {
  id: string
  perceivedAt: string
  readinessScore: number | null
  fatigueScore: number | null
  sleepScore: number | null
  stressScore: number | null
  acuteLoad: number | null
  chronicLoad: number | null
  acwr: number | null
  acwrZone: string | null
  hasActiveInjury: boolean
  hasRestrictions: boolean
  checkInStreak: number
  missedWorkouts7d: number
}

interface AgentActionExport {
  id: string
  actionType: string
  reasoning: string
  confidence: string
  confidenceScore: number
  priority: string
  status: string
  targetDate: string | null
  proposedAt: string
  decidedAt: string | null
  decidedBy: string | null
  athleteFeedback: string | null
  coachOverride: boolean
  outcomeTracked: boolean
  outcomeSuccess: boolean | null
}

interface AgentLearningEventExport {
  id: string
  eventType: string
  agentDecision: unknown
  actualOutcome: unknown
  createdAt: string
}

interface AuditLogExport {
  id: string
  action: string
  resource: string
  actorType: string
  createdAt: string
}

/**
 * Export all agent data for a client
 */
export async function exportAgentData(
  clientId: string,
  requestedBy: string,
  ipAddress?: string
): Promise<AgentDataExport> {
  // Fetch all data in parallel
  const [preferences, consent, perceptions, actions, learningEvents, auditLog] =
    await Promise.all([
      prisma.agentPreferences.findUnique({ where: { clientId } }),
      prisma.agentConsent.findUnique({ where: { clientId } }),
      prisma.agentPerception.findMany({
        where: { clientId },
        orderBy: { perceivedAt: 'desc' },
      }),
      prisma.agentAction.findMany({
        where: { clientId },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.agentLearningEvent.findMany({
        where: { clientId },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.agentAuditLog.findMany({
        where: { clientId },
        orderBy: { createdAt: 'desc' },
      }),
    ])

  // Log the export
  await logDataExport(clientId, requestedBy, ipAddress)

  return {
    exportedAt: new Date().toISOString(),
    clientId,
    preferences: preferences
      ? {
          autonomyLevel: preferences.autonomyLevel,
          allowWorkoutModification: preferences.allowWorkoutModification,
          allowRestDayInjection: preferences.allowRestDayInjection,
          maxIntensityReduction: preferences.maxIntensityReduction,
          dailyBriefingEnabled: preferences.dailyBriefingEnabled,
          proactiveNudgesEnabled: preferences.proactiveNudgesEnabled,
          preferredContactMethod: preferences.preferredContactMethod,
          minRestDaysPerWeek: preferences.minRestDaysPerWeek,
          maxConsecutiveHardDays: preferences.maxConsecutiveHardDays,
          createdAt: preferences.createdAt.toISOString(),
          updatedAt: preferences.updatedAt.toISOString(),
        }
      : null,
    consent: consent
      ? {
          dataProcessingConsent: consent.dataProcessingConsent,
          automatedDecisionConsent: consent.automatedDecisionConsent,
          healthDataProcessingConsent: consent.healthDataProcessingConsent,
          learningContributionConsent: consent.learningContributionConsent,
          anonymizedResearchConsent: consent.anonymizedResearchConsent,
          consentVersion: consent.consentVersion,
          consentGivenAt: consent.consentGivenAt?.toISOString() ?? null,
          consentWithdrawnAt: consent.consentWithdrawnAt?.toISOString() ?? null,
          createdAt: consent.createdAt.toISOString(),
          updatedAt: consent.updatedAt.toISOString(),
        }
      : null,
    perceptions: perceptions.map((p) => ({
      id: p.id,
      perceivedAt: p.perceivedAt.toISOString(),
      readinessScore: p.readinessScore,
      fatigueScore: p.fatigueScore,
      sleepScore: p.sleepScore,
      stressScore: p.stressScore,
      acuteLoad: p.acuteLoad,
      chronicLoad: p.chronicLoad,
      acwr: p.acwr,
      acwrZone: p.acwrZone,
      hasActiveInjury: p.hasActiveInjury,
      hasRestrictions: p.hasRestrictions,
      checkInStreak: p.checkInStreak,
      missedWorkouts7d: p.missedWorkouts7d,
    })),
    actions: actions.map((a) => ({
      id: a.id,
      actionType: a.actionType,
      reasoning: a.reasoning,
      confidence: a.confidence,
      confidenceScore: a.confidenceScore,
      priority: a.priority,
      status: a.status,
      targetDate: a.targetDate?.toISOString() ?? null,
      proposedAt: a.proposedAt.toISOString(),
      decidedAt: a.decidedAt?.toISOString() ?? null,
      decidedBy: a.decidedBy,
      athleteFeedback: a.athleteFeedback,
      coachOverride: a.coachOverride,
      outcomeTracked: a.outcomeTracked,
      outcomeSuccess: a.outcomeSuccess,
    })),
    learningEvents: learningEvents.map((e) => ({
      id: e.id,
      eventType: e.eventType,
      agentDecision: e.agentDecision,
      actualOutcome: e.actualOutcome,
      createdAt: e.createdAt.toISOString(),
    })),
    auditLog: auditLog.map((l) => ({
      id: l.id,
      action: l.action,
      resource: l.resource,
      actorType: l.actorType,
      createdAt: l.createdAt.toISOString(),
    })),
  }
}

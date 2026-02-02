/**
 * Consent Guardrail - Ensures all agent operations have required consent
 */

import type { AgentConsent } from '@prisma/client'
import type { ConsentStatus } from '../types'

/**
 * Checks if athlete has granted required consents for agent operation
 */
export function checkConsent(consent: AgentConsent | null): ConsentStatus {
  if (!consent) {
    return {
      hasRequiredConsent: false,
      dataProcessingConsent: false,
      automatedDecisionConsent: false,
      healthDataProcessingConsent: false,
      learningContributionConsent: true, // defaults true
      anonymizedResearchConsent: true, // defaults true
      consentVersion: '1.0',
      consentGivenAt: null,
      isWithdrawn: false,
    }
  }

  // Check if consent was withdrawn
  const isWithdrawn = consent.consentWithdrawnAt !== null

  // Required consents for basic operation
  const hasRequiredConsent =
    consent.dataProcessingConsent &&
    consent.healthDataProcessingConsent &&
    !isWithdrawn

  return {
    hasRequiredConsent,
    dataProcessingConsent: consent.dataProcessingConsent,
    automatedDecisionConsent: consent.automatedDecisionConsent,
    healthDataProcessingConsent: consent.healthDataProcessingConsent,
    learningContributionConsent: consent.learningContributionConsent,
    anonymizedResearchConsent: consent.anonymizedResearchConsent,
    consentVersion: consent.consentVersion,
    consentGivenAt: consent.consentGivenAt,
    isWithdrawn,
  }
}

/**
 * Checks if automated decisions are allowed
 */
export function canMakeAutomatedDecisions(consent: AgentConsent | null): boolean {
  if (!consent) return false
  if (consent.consentWithdrawnAt) return false
  return (
    consent.dataProcessingConsent &&
    consent.automatedDecisionConsent &&
    consent.healthDataProcessingConsent
  )
}

/**
 * Checks if perception data can be collected
 */
export function canCollectPerception(consent: AgentConsent | null): boolean {
  if (!consent) return false
  if (consent.consentWithdrawnAt) return false
  return consent.dataProcessingConsent && consent.healthDataProcessingConsent
}

/**
 * Checks if data can be used for learning/model improvement
 */
export function canContributeToLearning(consent: AgentConsent | null): boolean {
  if (!consent) return false
  if (consent.consentWithdrawnAt) return false
  return (
    consent.dataProcessingConsent && consent.learningContributionConsent
  )
}

/**
 * Consent explanations for UI display
 */
export const CONSENT_EXPLANATIONS = {
  dataProcessingConsent: {
    title: 'Data Processing',
    description:
      'Allow the AI agent to process your training data, check-ins, and performance metrics to provide personalized recommendations.',
    required: true,
  },
  automatedDecisionConsent: {
    title: 'Automated Decisions',
    description:
      'Allow the AI agent to automatically adjust your workouts within your specified bounds (e.g., reduce intensity when fatigued).',
    required: false,
  },
  healthDataProcessingConsent: {
    title: 'Health Data Processing',
    description:
      'Allow the AI agent to process health-related data including readiness scores, fatigue levels, injury status, and pain reports.',
    required: true,
  },
  learningContributionConsent: {
    title: 'Model Improvement',
    description:
      'Allow your data to be used (with your identity removed) to improve the AI agent for all athletes.',
    required: false,
    defaultValue: true,
  },
  anonymizedResearchConsent: {
    title: 'Research Contribution',
    description:
      'Allow your anonymized data to be included in aggregate research studies on training patterns and performance.',
    required: false,
    defaultValue: true,
  },
} as const
